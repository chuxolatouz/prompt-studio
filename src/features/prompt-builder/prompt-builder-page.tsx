'use client';

import Image from 'next/image';
import {useMemo, useState} from 'react';
import {DndContext, DragEndEvent, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import JSZip from 'jszip';
import {useTranslations} from 'next-intl';
import blocksSeed from '@/data/blocks.json';
import structuresSeed from '@/data/structures.json';
import rolesSeed from '@/data/roles.json';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Textarea} from '@/components/ui/textarea';
import {useAuth} from '@/features/common/auth-context';
import {promptBuilderDraftSchema, promptBuilderStateSchema, PromptBuilderState} from '@/lib/schemas';
import {storageKeys, readLocal, writeLocal} from '@/lib/storage';
import {downloadBlob, slugify} from '@/lib/utils';
import {getSupabaseBrowserClient, supabaseEnabled} from '@/lib/supabase';

type SeedBlock = {
  id: string;
  titleKey: string;
  contentKey: string;
  niche: string;
  structure: string;
  level: 'basic' | 'intermediate';
  tags: string[];
  image: string;
  targetColumn: string;
};

type StructureMacro = {
  id: string;
  sections: string[];
  macro: {
    columnOrder: string[];
  };
};

const antiHallucinationDefault = [
  'Si falta informacion, haz preguntas antes de asumir.',
  'No inventes datos; marca incertidumbre.',
  'Diferencia hechos de suposiciones.',
  'Respeta estrictamente el formato de salida solicitado.',
].join('\n');

function createBaseColumns(): PromptBuilderState['columns'] {
  return [
    {id: 'role', title: 'Role', items: []},
    {id: 'goal', title: 'Goal', items: []},
    {id: 'context', title: 'Context', items: []},
    {id: 'inputs', title: 'Inputs', items: []},
    {id: 'constraints', title: 'Constraints', items: [{id: 'anti-hallucination', title: 'Anti-hallucination', content: antiHallucinationDefault, level: 'basic', tags: []}]},
    {id: 'output-format', title: 'Output Format', items: []},
    {id: 'examples', title: 'Examples', items: []},
  ];
}

function createInitialState(): PromptBuilderState {
  const parsed = promptBuilderDraftSchema.safeParse(readLocal(storageKeys.promptDrafts, null));
  if (parsed.success) return parsed.data.state;

  return {
    version: 1,
    title: '',
    role: '',
    structure: 'RTF',
    niche: 'all',
    antiHallucination: true,
    tags: [],
    columns: createBaseColumns(),
  };
}

function PaletteDraggable({id, children}: {id: string; children: React.ReactNode}) {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id,
    data: {kind: 'palette'},
  });

  return (
    <div
      ref={setNodeRef}
      style={{transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1}}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

function SortableItem({
  item,
  onChange,
}: {
  item: PromptBuilderState['columns'][number]['items'][number];
  onChange: (id: string, content: string) => void;
}) {
  const {attributes, listeners, setNodeRef, transform, transition} = useSortable({id: item.id});
  const style = {transform: CSS.Transform.toString(transform), transition};

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-slate-200 bg-white p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">{item.title}</p>
        <button className="cursor-grab rounded px-2 text-xs text-slate-500 hover:bg-slate-100" {...attributes} {...listeners}>
          ::
        </button>
      </div>
      <Textarea value={item.content} onChange={(e) => onChange(item.id, e.target.value)} className="min-h-20" />
    </div>
  );
}

function DropColumn({
  column,
  onChange,
}: {
  column: PromptBuilderState['columns'][number];
  onChange: (itemId: string, content: string) => void;
}) {
  const {setNodeRef, isOver} = useDroppable({id: column.id, data: {kind: 'column'}});
  return (
    <div ref={setNodeRef} className={`min-h-36 rounded-2xl border p-3 ${isOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
      <h4 className="mb-3 font-semibold text-slate-700">{column.title}</h4>
      <SortableContext items={column.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {column.items.map((item) => (
            <SortableItem key={item.id} item={item} onChange={onChange} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function getColumnById(columns: PromptBuilderState['columns'], id: string) {
  return columns.find((column) => column.id === id);
}

function findItem(columns: PromptBuilderState['columns'], itemId: string) {
  for (const column of columns) {
    const index = column.items.findIndex((item) => item.id === itemId);
    if (index !== -1) return {columnId: column.id, index};
  }
  return null;
}

export function PromptBuilderPage() {
  const t = useTranslations();
  const {user} = useAuth();

  const [state, setState] = useState<PromptBuilderState>(() => createInitialState());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [structureFilter, setStructureFilter] = useState('all');

  const sensors = useSensors(useSensor(PointerSensor));
  const structures = structuresSeed as Array<StructureMacro>;
  const selectedStructure = structures.find((item) => item.id === state.structure) ?? structures[0];

  const ensureAntiHallucination = (columns: PromptBuilderState['columns'], enabled: boolean) => {
    const next = [...columns];
    const cIndex = next.findIndex((column) => column.id === 'constraints');
    if (cIndex === -1) return next;

    const hasBlock = next[cIndex].items.some((item) => item.id === 'anti-hallucination');
    if (enabled && !hasBlock) {
      next[cIndex] = {
        ...next[cIndex],
        items: [{id: 'anti-hallucination', title: 'Anti-hallucination', content: antiHallucinationDefault, level: 'basic', tags: []}, ...next[cIndex].items],
      };
    }
    if (!enabled && hasBlock) {
      next[cIndex] = {...next[cIndex], items: next[cIndex].items.filter((item) => item.id !== 'anti-hallucination')};
    }
    return next;
  };

  const applyStructureMacro = (nextStructureId: string, prefill = false) => {
    const structure = structures.find((item) => item.id === nextStructureId);
    if (!structure) return;

    setState((prev) => {
      const ordered: PromptBuilderState['columns'] = [];
      structure.macro.columnOrder.forEach((columnId) => {
        const found = prev.columns.find((column) => column.id === columnId);
        if (found) ordered.push(found);
      });

      const leftovers = prev.columns.filter((column) => !structure.macro.columnOrder.includes(column.id));
      let columns = ensureAntiHallucination([...ordered, ...leftovers], prev.antiHallucination);

      if (prefill) {
        const template = t((structuresSeed as Array<{id: string; templateKey: string}>).find((item) => item.id === nextStructureId)?.templateKey ?? 'structures.rtf.template');
        const prefillLines = template.split('\n').filter(Boolean);

        columns = columns.map((column) => {
          if (column.items.length > 0) return column;
          if (column.id === 'role') {
            const line = prefillLines.find((entry) => entry.toLowerCase().startsWith('role'));
            return line
              ? {...column, items: [{id: `macro-${Date.now()}-role`, title: 'Macro', content: line, level: 'basic', tags: []}]}
              : column;
          }
          if (column.id === 'goal') {
            const line = prefillLines.find((entry) => entry.toLowerCase().startsWith('task') || entry.toLowerCase().startsWith('objective'));
            return line
              ? {...column, items: [{id: `macro-${Date.now()}-goal`, title: 'Macro', content: line, level: 'basic', tags: []}]}
              : column;
          }
          if (column.id === 'output-format') {
            const line = prefillLines.find((entry) => entry.toLowerCase().startsWith('format') || entry.toLowerCase().startsWith('output') || entry.toLowerCase().startsWith('response'));
            return line
              ? {...column, items: [{id: `macro-${Date.now()}-output`, title: 'Macro', content: line, level: 'basic', tags: []}]}
              : column;
          }
          return column;
        });
      }

      return {...prev, structure: nextStructureId, columns};
    });
  };

  const filteredBlocks = useMemo(() => {
    const selectedNiche = state.niche ?? 'all';
    return (blocksSeed as SeedBlock[]).filter((block) => {
      const bySearch =
        search.length === 0 ||
        t(block.titleKey).toLowerCase().includes(search.toLowerCase()) ||
        t(block.contentKey).toLowerCase().includes(search.toLowerCase());
      const byNiche = selectedNiche === 'all' || block.niche.startsWith(selectedNiche);
      const byStructure = structureFilter === 'all' || block.structure === structureFilter;
      return bySearch && byNiche && byStructure;
    });
  }, [search, state.niche, structureFilter, t]);

  const composedPrompt = useMemo(() => {
    const sectionMap: Record<string, string[]> = {
      Role: ['role'],
      Task: ['goal'],
      Goal: ['goal'],
      Format: ['output-format'],
      Action: ['constraints'],
      Output: ['output-format'],
      Before: ['context'],
      After: ['goal'],
      Bridge: ['constraints'],
      Context: ['context'],
      Result: ['goal'],
      Examples: ['examples'],
      Objective: ['goal'],
      Style: ['constraints'],
      Tone: ['constraints'],
      Audience: ['inputs'],
      Response: ['output-format'],
      Capacity: ['role'],
      Insight: ['context'],
      Statement: ['goal'],
      Personality: ['constraints'],
      Experiment: ['examples'],
      Situation: ['context'],
    };

    const sections = selectedStructure?.sections ?? ['Role', 'Goal', 'Context', 'Inputs', 'Constraints', 'Output Format', 'Examples'];
    const lines: string[] = [];

    if (state.role?.trim()) lines.push(`# Role\n${state.role.trim()}`);

    for (const section of sections) {
      const columnIds = sectionMap[section] ?? [section.toLowerCase()];
      const contents = columnIds
        .flatMap((columnId) => getColumnById(state.columns, columnId)?.items ?? [])
        .map((item) => item.content.trim())
        .filter(Boolean);

      if (contents.length > 0) {
        lines.push(`## ${section}\n${contents.join('\n')}`);
      }
    }

    return lines.join('\n\n');
  }, [state.columns, state.role, selectedStructure]);

  const onDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const {active, over} = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (active.data.current?.kind === 'palette') {
      const targetColumn = getColumnById(state.columns, overId) ?? getColumnById(state.columns, findItem(state.columns, overId)?.columnId ?? '');
      if (!targetColumn) return;
      const item = (blocksSeed as SeedBlock[]).find((entry) => `palette-${entry.id}` === activeId);
      if (!item) return;

      const nextItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: t(item.titleKey),
        content: t(item.contentKey),
        sourceId: item.id,
        level: item.level,
        tags: item.tags,
      };

      setState((prev) => ({
        ...prev,
        columns: prev.columns.map((column) => (column.id === targetColumn.id ? {...column, items: [...column.items, nextItem]} : column)),
      }));
      return;
    }

    const from = findItem(state.columns, activeId);
    const to = findItem(state.columns, overId);
    const overColumn = getColumnById(state.columns, overId);

    if (!from) return;

    if (to && from.columnId === to.columnId) {
      setState((prev) => ({
        ...prev,
        columns: prev.columns.map((column) =>
          column.id === from.columnId ? {...column, items: arrayMove(column.items, from.index, to.index)} : column
        ),
      }));
      return;
    }

    if (to && from.columnId !== to.columnId) {
      setState((prev) => {
        const source = prev.columns.find((column) => column.id === from.columnId);
        const target = prev.columns.find((column) => column.id === to.columnId);
        if (!source || !target) return prev;
        const moving = source.items[from.index];

        return {
          ...prev,
          columns: prev.columns.map((column) => {
            if (column.id === source.id) return {...column, items: column.items.filter((item) => item.id !== activeId)};
            if (column.id === target.id) {
              const items = [...column.items];
              items.splice(to.index, 0, moving);
              return {...column, items};
            }
            return column;
          }),
        };
      });
      return;
    }

    if (overColumn && overColumn.id !== from.columnId) {
      setState((prev) => {
        const source = prev.columns.find((column) => column.id === from.columnId);
        const target = prev.columns.find((column) => column.id === overColumn.id);
        if (!source || !target) return prev;
        const moving = source.items[from.index];

        return {
          ...prev,
          columns: prev.columns.map((column) => {
            if (column.id === source.id) return {...column, items: column.items.filter((item) => item.id !== activeId)};
            if (column.id === target.id) return {...column, items: [...column.items, moving]};
            return column;
          }),
        };
      });
    }
  };

  const saveDraft = () => {
    const parsed = promptBuilderStateSchema.safeParse(state);
    if (!parsed.success) {
      alert(parsed.error.issues[0]?.message);
      return;
    }

    writeLocal(storageKeys.promptDrafts, {
      state: parsed.data,
      updatedAt: new Date().toISOString(),
    });
    alert(t('promptBuilder.savedLocal'));
  };

  const handlePublish = async () => {
    if (!supabaseEnabled) {
      alert(t('promptBuilder.supabaseRequired'));
      return;
    }

    if (!user) {
      alert(t('promptBuilder.loginRequired'));
      return;
    }

    const parsed = promptBuilderStateSchema.safeParse(state);
    if (!parsed.success) {
      alert(parsed.error.issues[0]?.message);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const slug = `${slugify(state.title || 'prompt')}-${Math.random().toString(36).slice(2, 7)}`;
    const {error} = await supabase.from('prompts').insert({
      owner_id: user.id,
      title: state.title || 'Untitled Prompt',
      slug,
      language: 'auto',
      visibility: 'public',
      status: 'active',
      hidden_reason: null,
      structure: state.structure,
      tags: state.niche && state.niche !== 'all' ? [state.niche] : [],
      builder_state: parsed.data,
      output_prompt: composedPrompt,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert(t('promptBuilder.published'));
  };

  const resetAntiHallucination = () => {
    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((column) => ({
        ...column,
        items: column.items.map((item) => (item.id === 'anti-hallucination' ? {...item, content: antiHallucinationDefault} : item)),
      })),
    }));
  };

  const exportZip = async () => {
    const parsed = promptBuilderStateSchema.safeParse(state);
    if (!parsed.success) {
      alert(parsed.error.issues[0]?.message);
      return;
    }

    const zip = new JSZip();
    zip.file('prompt.md', composedPrompt);
    zip.file('prompt.json', JSON.stringify({...parsed.data, output: composedPrompt}, null, 2));
    const blob = await zip.generateAsync({type: 'blob'});
    downloadBlob(`${slugify(state.title || 'prompt')}.zip`, blob, 'application/zip');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('promptBuilder.title')}</CardTitle>
            <CardDescription>{t('promptBuilder.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input placeholder={t('promptBuilder.promptTitle')} value={state.title} onChange={(e) => setState((prev) => ({...prev, title: e.target.value}))} />
            <Select value={state.structure} onValueChange={(value) => applyStructureMacro(value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('promptBuilder.structure')} />
              </SelectTrigger>
              <SelectContent>
                {structures.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={state.role || ''} onValueChange={(value) => setState((prev) => ({...prev, role: value}))}>
              <SelectTrigger>
                <SelectValue placeholder={t('promptBuilder.role')} />
              </SelectTrigger>
              <SelectContent>
                {(rolesSeed as Array<{id: string; labelKey: string}>).map((item) => (
                  <SelectItem key={item.id} value={t(item.labelKey)}>
                    {t(item.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => applyStructureMacro(state.structure, true)}>
              {t('promptBuilder.applyMacro')}
            </Button>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm md:col-span-2">
              <span>{t('promptBuilder.antiHallucination')}</span>
              <Switch
                checked={state.antiHallucination}
                onCheckedChange={(value) =>
                  setState((prev) => ({
                    ...prev,
                    antiHallucination: value,
                    columns: ensureAntiHallucination(prev.columns, value),
                  }))
                }
              />
              <Badge variant={state.antiHallucination ? 'default' : 'secondary'}>{state.antiHallucination ? 'ON' : 'OFF'}</Badge>
              <Button size="sm" variant="ghost" onClick={resetAntiHallucination}>
                {t('promptBuilder.reset')}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('promptBuilder.steps')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>{t('promptBuilder.step1')}</p>
            <p>{t('promptBuilder.step2')}</p>
            <p>{t('promptBuilder.step3')}</p>
          </CardContent>
        </Card>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid gap-4 xl:grid-cols-[280px_1fr_380px]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>{t('promptBuilder.palette')}</CardTitle>
              <CardDescription>{t('promptBuilder.paletteHelp')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={state.niche ?? 'all'} onValueChange={(value) => setState((prev) => ({...prev, niche: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allNiches')}</SelectItem>
                  <SelectItem value="dev">Dev</SelectItem>
                  <SelectItem value="images">Images</SelectItem>
                  <SelectItem value="videos">Videos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={structureFilter} onValueChange={setStructureFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allStructures')}</SelectItem>
                  {structures.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                {filteredBlocks.map((block) => (
                  <PaletteDraggable key={block.id} id={`palette-${block.id}`}>
                    <Card className={`cursor-grab overflow-hidden border-slate-200 ${activeDragId === `palette-${block.id}` ? 'opacity-60' : ''}`}>
                      <div className="relative h-24 w-full">
                        <Image src={block.image} alt={t(block.titleKey)} fill className="object-cover" sizes="260px" />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold">{t(block.titleKey)}</p>
                        <p className="text-xs text-slate-600">{t(block.contentKey)}</p>
                        <div className="mt-2 flex gap-2">
                          <Badge variant="secondary">{block.level}</Badge>
                          <Badge variant="outline">{block.structure}</Badge>
                        </div>
                      </div>
                    </Card>
                  </PaletteDraggable>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('promptBuilder.canvas')}</CardTitle>
              <CardDescription>{t('promptBuilder.canvasHelp')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {state.columns.map((column) => (
                <DropColumn
                  key={column.id}
                  column={column}
                  onChange={(itemId, content) =>
                    setState((prev) => ({
                      ...prev,
                      columns: prev.columns.map((entry) => ({
                        ...entry,
                        items: entry.items.map((item) => (item.id === itemId ? {...item, content} : item)),
                      })),
                    }))
                  }
                />
              ))}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>{t('promptBuilder.preview')}</CardTitle>
              <CardDescription>{t('promptBuilder.livePreview')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={composedPrompt} readOnly className="min-h-[420px]" />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={async () => navigator.clipboard.writeText(composedPrompt)}>
                  {t('actions.copy')}
                </Button>
                <Button variant="secondary" onClick={() => downloadBlob(`${slugify(state.title || 'prompt')}.md`, composedPrompt, 'text/markdown')}>
                  {t('actions.exportMd')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => downloadBlob(`${slugify(state.title || 'prompt')}.json`, JSON.stringify({...state, output: composedPrompt}, null, 2), 'application/json')}
                >
                  {t('actions.exportJson')}
                </Button>
                <Button variant="secondary" onClick={exportZip}>
                  {t('actions.exportZip')}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handlePublish}>{t('actions.publish')}</Button>
                <Button variant="outline" onClick={saveDraft}>
                  {t('actions.saveDraft')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DndContext>
    </div>
  );
}
