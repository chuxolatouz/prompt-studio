'use client';

import Image from 'next/image';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {DndContext, DragEndEvent, DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Gamepad2,
  GripVertical,
  Rocket,
  Save,
  Sparkles,
} from 'lucide-react';
import JSZip from 'jszip';
import {useLocale, useTranslations} from 'next-intl';
import {BuilderShell} from '@/components/builder/BuilderShell';
import {BuilderStepper} from '@/components/builder/BuilderStepper';
import {PreviewPanel} from '@/components/builder/PreviewPanel';
import {promptBuilderConfig} from '@/components/builder/configs';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Modal} from '@/components/ui/modal';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Textarea} from '@/components/ui/textarea';
import {StepHelp} from '@/components/ui/step-help';
import {toast} from '@/components/ui/toast';
import {AuthGateModal} from '@/features/common/auth-gate-modal';
import {useAuth} from '@/features/common/auth-context';
import {usePromptCatalog} from '@/features/common/use-prompt-catalog';
import {usePathname, useRouter} from '@/i18n/navigation';
import {PromptBuilderState, PromptStructureRecord, promptBuilderDraftSchema, promptBuilderStateSchema} from '@/lib/schemas';
import {storageKeys, readLocal, writeLocal} from '@/lib/storage';
import {downloadBlob, slugify} from '@/lib/utils';
import {getSupabaseBrowserClient, supabaseEnabled} from '@/lib/supabase';

type BuilderMode = 'pro' | 'quest';

type SegmentId = 'role' | 'goal' | 'context' | 'inputs' | 'constraints' | 'output-format' | 'examples';

const SEGMENT_ORDER_DEFAULT: SegmentId[] = ['role', 'goal', 'context', 'inputs', 'constraints', 'output-format', 'examples'];
const ANTI_HALLUCINATION_ITEM_ID = 'anti-hallucination';
const MANUAL_ITEM_PREFIX = 'manual-';
const STRUCTURE_SEGMENTS: Record<string, SegmentId[]> = {
  RTF: ['role', 'goal', 'output-format'],
  TAO: ['goal', 'constraints', 'output-format'],
  BAB: ['context', 'goal', 'constraints'],
  CARE: ['context', 'goal', 'output-format', 'examples'],
  'CO-STAR': ['context', 'goal', 'constraints', 'inputs', 'output-format', 'role'],
  CRISPE: ['role', 'context', 'goal', 'constraints', 'examples'],
  STAR: ['context', 'goal', 'constraints', 'output-format'],
};

function createBaseColumns(t: ReturnType<typeof useTranslations>): PromptBuilderState['columns'] {
  const antiHallucinationDefault = t('promptBuilder.antiHallucinationDefault');
  return [
    {id: 'role', title: t('promptBuilder.columns.role'), items: []},
    {id: 'goal', title: t('promptBuilder.columns.goal'), items: []},
    {id: 'context', title: t('promptBuilder.columns.context'), items: []},
    {id: 'inputs', title: t('promptBuilder.columns.inputs'), items: []},
    {
      id: 'constraints',
      title: t('promptBuilder.columns.constraints'),
      items: [{id: ANTI_HALLUCINATION_ITEM_ID, title: t('promptBuilder.antiHallucination'), content: antiHallucinationDefault, level: 'basic', tags: []}],
    },
    {id: 'output-format', title: t('promptBuilder.columns.output-format'), items: []},
    {id: 'examples', title: t('promptBuilder.columns.examples'), items: []},
  ];
}

function normalizeColumns(columns: PromptBuilderState['columns'], t: ReturnType<typeof useTranslations>): PromptBuilderState['columns'] {
  const base = createBaseColumns(t);
  const byId = new Map(columns.map((column) => [column.id, column]));
  return base.map((column) => byId.get(column.id) ?? column);
}

function normalizeSegmentOrder(order: string[] | undefined, columns: PromptBuilderState['columns']): SegmentId[] {
  const allowed = new Set(columns.map((column) => column.id as SegmentId));
  const source = (order ?? SEGMENT_ORDER_DEFAULT).filter((id) => allowed.has(id as SegmentId)) as SegmentId[];
  const missing = SEGMENT_ORDER_DEFAULT.filter((id) => allowed.has(id) && !source.includes(id));
  return [...source, ...missing];
}

function getStructureSegments(structureId: string, order: SegmentId[]): SegmentId[] {
  const configured = STRUCTURE_SEGMENTS[structureId] ?? SEGMENT_ORDER_DEFAULT;
  return order.filter((segmentId) => configured.includes(segmentId));
}

function getStructureLabel(structureId: string, structures: PromptStructureRecord[]) {
  return structures.find((item) => item.id === structureId)?.label || structureId;
}

function getManualItemId(segmentId: SegmentId) {
  return `${MANUAL_ITEM_PREFIX}${segmentId}`;
}

function isManualItem(itemId: string) {
  return itemId.startsWith(MANUAL_ITEM_PREFIX);
}

function normalizeSystemItems(columns: PromptBuilderState['columns'], t: ReturnType<typeof useTranslations>): PromptBuilderState['columns'] {
  const antiHallucinationTitle = t('promptBuilder.antiHallucination');
  return columns.map((column) => {
    if (column.id !== 'constraints') return column;
    return {
      ...column,
      items: column.items.map((item) => (item.id === ANTI_HALLUCINATION_ITEM_ID ? {...item, title: antiHallucinationTitle} : item)),
    };
  });
}

function upsertManualSegmentContent(
  columns: PromptBuilderState['columns'],
  segmentId: SegmentId,
  value: string,
  t: ReturnType<typeof useTranslations>
): PromptBuilderState['columns'] {
  const manualId = getManualItemId(segmentId);
  const nextValue = value.trim();

  return columns.map((column) => {
    if (column.id !== segmentId) return column;

    const withoutManual = column.items.filter((item) => item.id !== manualId);
    if (!nextValue) return {...column, items: withoutManual};

    const manualItem = {
      id: manualId,
      title: t('promptBuilder.manualInputLabel'),
      content: value,
      sourceId: 'manual',
      level: 'basic' as const,
      tags: [],
    };

    return {...column, items: [...withoutManual, manualItem]};
  });
}

function normalizeState(state: PromptBuilderState, t: ReturnType<typeof useTranslations>): PromptBuilderState {
  const columns = normalizeSystemItems(normalizeColumns(state.columns, t), t);
  const segmentOrder = normalizeSegmentOrder(state.segmentOrder, columns);
  return {
    ...state,
    version: 2,
    columns,
    segmentOrder,
    preferredMode: state.preferredMode ?? 'pro',
    onboardingCompleted: state.onboardingCompleted ?? false,
  };
}

function createInitialState(t: ReturnType<typeof useTranslations>): PromptBuilderState {
  const parsed = promptBuilderDraftSchema.safeParse(readLocal(storageKeys.promptDrafts, null));
  if (parsed.success) {
    const fromDraft = promptBuilderStateSchema.safeParse(parsed.data.state);
    if (fromDraft.success) return normalizeState(fromDraft.data, t);
  }

  return {
    version: 2,
    title: '',
    role: '',
    structure: 'RTF',
    niche: 'all',
    antiHallucination: true,
    tags: [],
    columns: createBaseColumns(t),
    segmentOrder: SEGMENT_ORDER_DEFAULT,
    macro: 'RTF',
    onboardingCompleted: false,
    preferredMode: 'quest',
  };
}

function getColumnById(columns: PromptBuilderState['columns'], id: string) {
  return columns.find((column) => column.id === id);
}

function findItem(columns: PromptBuilderState['columns'], itemId: string) {
  for (const column of columns) {
    const index = column.items.findIndex((item) => item.id === itemId);
    if (index !== -1) return {columnId: column.id as SegmentId, index};
  }
  return null;
}

function getColumnLabel(t: ReturnType<typeof useTranslations>, columnId: string, fallback: string) {
  const key = `promptBuilder.columns.${columnId}`;
  try {
    return t(key as never);
  } catch {
    return fallback;
  }
}

function formatRelativeTime(t: ReturnType<typeof useTranslations>, dateIso: string | null, nowTick: number) {
  if (!dateIso) return t('promptBuilder.notSavedYet');
  void nowTick;

  const diffMs = Date.now() - new Date(dateIso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return t('common.justNow');
  if (minutes < 60) return t('common.minutesAgo', {count: minutes});

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('common.hoursAgo', {count: hours});

  const days = Math.floor(hours / 24);
  return t('common.daysAgo', {count: days});
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
  dragLabel,
}: {
  item: PromptBuilderState['columns'][number]['items'][number];
  onChange: (id: string, content: string) => void;
  dragLabel: string;
}) {
  const {attributes, listeners, setNodeRef, transform, transition} = useSortable({id: item.id});
  const style = {transform: CSS.Transform.toString(transform), transition};

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-slate-200 bg-white p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">{item.title}</p>
        <button
          className="cursor-grab rounded p-1 text-xs text-slate-500 hover:bg-slate-100"
          {...attributes}
          {...listeners}
          aria-label={dragLabel}
          title={dragLabel}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <Textarea value={item.content} onChange={(e) => onChange(item.id, e.target.value)} className="min-h-20" />
    </div>
  );
}

function DropColumn({
  column,
  onChange,
  dragLabel,
  title,
}: {
  column: PromptBuilderState['columns'][number];
  onChange: (itemId: string, content: string) => void;
  dragLabel: string;
  title: string;
}) {
  const {setNodeRef, isOver} = useDroppable({id: column.id, data: {kind: 'column'}});
  const visibleItems = column.items.filter((item) => !isManualItem(item.id));
  return (
    <div ref={setNodeRef} className={`min-h-36 rounded-2xl border p-3 ${isOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
      <h4 className="mb-3 font-semibold text-slate-700">{title}</h4>
      <SortableContext items={visibleItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <SortableItem key={item.id} item={item} onChange={onChange} dragLabel={dragLabel} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SegmentOrderItem({
  segmentId,
  label,
  onFocus,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  moveUpLabel,
  moveDownLabel,
  reorderLabel,
}: {
  segmentId: SegmentId;
  label: string;
  onFocus: (segmentId: SegmentId) => void;
  onMoveUp: (segmentId: SegmentId) => void;
  onMoveDown: (segmentId: SegmentId) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moveUpLabel: string;
  moveDownLabel: string;
  reorderLabel: string;
}) {
  const sortableId = `segment-order-${segmentId}`;
  const {attributes, listeners, setNodeRef, transform, transition} = useSortable({
    id: sortableId,
    data: {kind: 'segment-order', segmentId},
  });
  const style = {transform: CSS.Transform.toString(transform), transition};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
    >
      <button
        onClick={() => onFocus(segmentId)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left hover:text-blue-700"
        type="button"
      >
        <span
          className="cursor-grab rounded p-1 text-slate-500 hover:bg-slate-100"
          {...attributes}
          {...listeners}
          aria-label={reorderLabel}
          title={reorderLabel}
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <span className="truncate text-sm font-medium text-slate-800">{label}</span>
      </button>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMoveUp(segmentId)}
          disabled={!canMoveUp}
          title={moveUpLabel}
          aria-label={moveUpLabel}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMoveDown(segmentId)}
          disabled={!canMoveDown}
          title={moveDownLabel}
          aria-label={moveDownLabel}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PromptBuilderPage() {
  const t = useTranslations();
  const locale = useLocale() as 'es' | 'en';
  const {user} = useAuth();
  const {structures, roles, paletteBlocks} = usePromptCatalog(locale);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialDraft = promptBuilderDraftSchema.safeParse(readLocal(storageKeys.promptDrafts, null));
  const initialState = createInitialState(t);
  const storedPrefs = readLocal<{onboardingCompleted: boolean; preferredMode: BuilderMode; advancedMode?: boolean} | null>(
    storageKeys.promptBuilderPrefs,
    null
  );
  const initialAdvancedMode = storedPrefs?.advancedMode ?? false;

  const initialOnboardingCompleted = initialState.onboardingCompleted || storedPrefs?.onboardingCompleted || false;
  const initialMode: BuilderMode = initialOnboardingCompleted
    ? (initialState.preferredMode || storedPrefs?.preferredMode || 'pro')
    : initialAdvancedMode
      ? 'quest'
      : 'pro';

  const [state, setState] = useState<PromptBuilderState>(initialState);
  const [mode, setMode] = useState<BuilderMode>(initialMode);
  const [advancedMode, setAdvancedMode] = useState(initialAdvancedMode);
  const [onboardingCompleted, setOnboardingCompleted] = useState(initialOnboardingCompleted);
  const [questBoard, setQuestBoard] = useState<Record<SegmentId, boolean>>(() => ({
    role: false,
    goal: false,
    context: false,
    inputs: false,
    constraints: false,
    'output-format': false,
    examples: false,
  }));

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [spotlightSegmentId, setSpotlightSegmentId] = useState<SegmentId | null>(null);
  const [macroModalOpen, setMacroModalOpen] = useState(false);
  const [selectedMacroId, setSelectedMacroId] = useState(state.structure);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialDraft.success ? initialDraft.data.updatedAt : null);
  const [timeTick, setTimeTick] = useState(0);
  const [structureChecklist, setStructureChecklist] = useState<Record<string, boolean>>({});

  const publishAutoTriggeredRef = useRef(false);
  const questCelebratedRef = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, {activationConstraint: {distance: 8}}));
  const currentStructure = useMemo(
    () => structures.find((entry) => entry.id === state.structure) ?? structures[0],
    [structures, state.structure]
  );

  useEffect(() => {
    const timer = window.setInterval(() => setTimeTick((prev) => prev + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const persistPreferences = async (nextMode: BuilderMode, nextCompleted: boolean, nextAdvancedMode: boolean) => {
    const payload = {onboardingCompleted: nextCompleted, preferredMode: nextMode, advancedMode: nextAdvancedMode};
    writeLocal(storageKeys.promptBuilderPrefs, payload);
    setState((prev) => ({...prev, preferredMode: nextMode, onboardingCompleted: nextCompleted}));

    if (user) {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const {error} = await supabase.auth.updateUser({data: {promptBuilderPrefs: payload}});
      if (error) console.warn(error.message);
    }
  };

  const focusSegment = (segmentId: SegmentId) => {
    setSpotlightSegmentId(segmentId);
    document.getElementById(`step-${segmentId}`)?.scrollIntoView({behavior: 'smooth', block: 'center'});
    window.setTimeout(() => {
      setSpotlightSegmentId((current) => (current === segmentId ? null : current));
    }, 1600);
  };

  const ensureAntiHallucination = (columns: PromptBuilderState['columns'], enabled: boolean) => {
    const antiHallucinationDefault = t('promptBuilder.antiHallucinationDefault');
    const next = [...columns];
    const cIndex = next.findIndex((column) => column.id === 'constraints');
    if (cIndex === -1) return next;

    const hasBlock = next[cIndex].items.some((item) => item.id === ANTI_HALLUCINATION_ITEM_ID);
    if (enabled && !hasBlock) {
      next[cIndex] = {
        ...next[cIndex],
        items: [
          {id: ANTI_HALLUCINATION_ITEM_ID, title: t('promptBuilder.antiHallucination'), content: antiHallucinationDefault, level: 'basic', tags: []},
          ...next[cIndex].items,
        ],
      };
    }
    if (!enabled && hasBlock) {
      next[cIndex] = {...next[cIndex], items: next[cIndex].items.filter((item) => item.id !== ANTI_HALLUCINATION_ITEM_ID)};
    }
    return normalizeSystemItems(next, t);
  };

  const applyMacro = (macroId: string) => {
    const structure = structures.find((item) => item.id === macroId);
    if (!structure) return;

    setState((prev) => {
      const columns = normalizeColumns(ensureAntiHallucination(prev.columns, prev.antiHallucination), t);
      return {
        ...prev,
        structure: macroId,
        macro: macroId,
        segmentOrder: normalizeSegmentOrder(structure.columnOrder, columns),
        columns,
      };
    });

    setMacroModalOpen(false);
    toast.success(t('promptBuilder.macroAppliedToast', {macro: getStructureLabel(macroId, structures)}));
  };

  const handleStructureChange = (nextStructure: string) => {
    const structure = structures.find((item) => item.id === nextStructure);
    setState((prev) => {
      const columns = normalizeColumns(ensureAntiHallucination(prev.columns, prev.antiHallucination), t);
      return {
        ...prev,
        structure: nextStructure,
        macro: nextStructure,
        segmentOrder: structure ? normalizeSegmentOrder(structure.columnOrder, columns) : prev.segmentOrder,
        columns,
      };
    });
  };

  const segmentOrder = useMemo(() => normalizeSegmentOrder(state.segmentOrder, state.columns), [state.segmentOrder, state.columns]);
  const structureSegments = useMemo(() => getStructureSegments(state.structure, segmentOrder), [state.structure, segmentOrder]);

  const visibleColumns = useMemo(() => {
    const ordered = structureSegments
      .map((segmentId) => state.columns.find((column) => column.id === segmentId))
      .filter(Boolean) as PromptBuilderState['columns'];

    return ordered.filter((column) => {
      if (column.id === 'constraints') return state.antiHallucination || column.items.length > 0;
      return true;
    });
  }, [structureSegments, state.columns, state.antiHallucination]);

  const getSegmentContents = useCallback((segmentId: SegmentId) => {
    const column = getColumnById(state.columns, segmentId);
    const contents = column?.items.map((item) => item.content.trim()).filter(Boolean) ?? [];

    if (segmentId === 'role' && state.role?.trim()) {
      const roleValue = state.role.trim();
      if (!contents.some((line) => line.toLowerCase().includes(roleValue.toLowerCase()))) {
        contents.unshift(roleValue);
      }
    }

    return contents;
  }, [state.columns, state.role]);

  const getSegmentPlaceholder = (segmentId: SegmentId) => {
    try {
      return t(`promptBuilder.placeholders.${segmentId}`);
    } catch {
      return '';
    }
  };

  const requiredSegments = useMemo(
    () => visibleColumns.map((column) => column.id as SegmentId),
    [visibleColumns]
  );
  const publishSegments = useMemo(
    () => promptBuilderConfig.requiredForPublish.filter((segmentId) => requiredSegments.includes(segmentId as SegmentId)) as SegmentId[],
    [requiredSegments]
  );
  const hasPreviewContent = requiredSegments.some((segmentId) => getSegmentContents(segmentId).length > 0);
  const missingSegments = publishSegments.filter((segmentId) => getSegmentContents(segmentId).length === 0);
  const canPublishByMinimum = missingSegments.length === 0 && publishSegments.length > 0;
  const missingLabels = missingSegments.map((segmentId) => getColumnLabel(t, segmentId, segmentId));
  const missingList = missingLabels.join(', ');
  const firstMissingSegment = missingSegments[0] ?? null;
  const requiredList = publishSegments.map((segmentId) => getColumnLabel(t, segmentId, segmentId)).join(', ');

  const publishDisabledReason = canPublishByMinimum
    ? ''
    : t('promptBuilder.publishBlockedTextDynamic', {items: missingList || requiredList});
  const checklistEntries = useMemo(
    () =>
      requiredSegments.map((segmentId) => {
        const key = `${state.structure}:${segmentId}`;
        const contentReady = getSegmentContents(segmentId).length > 0;
        return {
          segmentId,
          key,
          label: getColumnLabel(t, segmentId, segmentId),
          contentReady,
          checked: structureChecklist[key] ?? contentReady,
        };
      }),
    [requiredSegments, state.structure, getSegmentContents, structureChecklist, t]
  );

  const toggleChecklist = (entryKey: string, nextValue: boolean) => {
    setStructureChecklist((prev) => ({...prev, [entryKey]: nextValue}));
  };

  const filteredBlocks = useMemo(() => {
    const selectedNiche = state.niche ?? 'all';
    return paletteBlocks.filter((block) => {
      const bySearch =
        search.length === 0 ||
        block.title.toLowerCase().includes(search.toLowerCase()) ||
        block.content.toLowerCase().includes(search.toLowerCase());
      const byNiche = selectedNiche === 'all' || block.niche.startsWith(selectedNiche);
      return bySearch && byNiche;
    });
  }, [paletteBlocks, search, state.niche]);

  const composedPrompt = useMemo(() => {
    const lines: string[] = [];

    requiredSegments.forEach((segmentId) => {
      const contents = getSegmentContents(segmentId);
      if (!contents.length) return;
      const label = getColumnLabel(t, segmentId, segmentId);
      lines.push(`## ${label}\n${contents.join('\n')}`);
    });

    return lines.join('\n\n');
  }, [requiredSegments, getSegmentContents, t]);

  const macroPreviewOrder = useMemo(() => {
    const structure = structures.find((item) => item.id === selectedMacroId);
    if (!structure) return requiredSegments;
    const normalized = normalizeSegmentOrder(structure.columnOrder, state.columns);
    return getStructureSegments(selectedMacroId, normalized);
  }, [selectedMacroId, structures, requiredSegments, state.columns]);

  const lastSavedLabel = formatRelativeTime(t, lastSavedAt, timeTick);

  const onDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const {active, over} = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (active.data.current?.kind === 'segment-order') {
      const activeSegmentId = String(active.data.current.segmentId) as SegmentId;
      const overSegmentId =
        over.data.current?.kind === 'segment-order'
          ? (String(over.data.current.segmentId) as SegmentId)
          : (overId.replace('segment-order-', '') as SegmentId);

      if (!activeSegmentId || !overSegmentId || activeSegmentId === overSegmentId) return;

      setState((prev) => {
        const order = normalizeSegmentOrder(prev.segmentOrder, prev.columns);
        const oldIndex = order.indexOf(activeSegmentId);
        const newIndex = order.indexOf(overSegmentId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return {...prev, segmentOrder: arrayMove(order, oldIndex, newIndex)};
      });
      return;
    }

    if (active.data.current?.kind === 'palette') {
      const targetColumn = getColumnById(state.columns, overId) ?? getColumnById(state.columns, findItem(state.columns, overId)?.columnId ?? '');
      if (!targetColumn) return;
      const item = paletteBlocks.find((entry) => `palette-${entry.id}` === activeId);
      if (!item) return;

      const nextItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: item.title,
        content: item.content,
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
    const draftState = {
      ...state,
      segmentOrder,
      preferredMode: mode,
      onboardingCompleted,
    };

    const parsed = promptBuilderStateSchema.safeParse(draftState);
    if (!parsed.success) {
      toast.error(t('promptBuilder.invalid'));
      return;
    }

    const now = new Date().toISOString();
    writeLocal(storageKeys.promptDrafts, {
      state: parsed.data,
      updatedAt: now,
    });
    setLastSavedAt(now);
    toast.success(t('actions.saved'));
  };

  const exportZip = async () => {
    if (!hasPreviewContent) {
      toast.error(t('promptBuilder.exportEmpty'));
      return;
    }

    const parsed = promptBuilderStateSchema.safeParse({...state, segmentOrder, preferredMode: mode, onboardingCompleted});
    if (!parsed.success) {
      toast.error(t('promptBuilder.invalid'));
      return;
    }

    const zip = new JSZip();
    zip.file('PROMPT.md', composedPrompt);
    zip.file('PROMPT.txt', composedPrompt);
    zip.file('segments.json', JSON.stringify(parsed.data.columns, null, 2));
    zip.file(
      'meta.json',
      JSON.stringify(
        {
          title: parsed.data.title || t('promptBuilder.untitled'),
          macro: parsed.data.macro || parsed.data.structure,
          structure: parsed.data.structure,
          segmentOrder: requiredSegments,
          tags: parsed.data.tags,
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
    const blob = await zip.generateAsync({type: 'blob'});
    downloadBlob(`${slugify(state.title || 'prompt')}.zip`, blob, 'application/zip');
    toast.success(t('actions.exported'));
  };

  const handlePublish = useCallback(async () => {
    if (!supabaseEnabled) {
      toast.error(t('promptBuilder.supabaseRequired'));
      return;
    }

    if (!canPublishByMinimum) {
      toast.error(`${t('promptBuilder.publishBlockedTitle')}. ${t('promptBuilder.publishBlockedTextDynamic', {items: missingList || requiredList})}`);
      if (firstMissingSegment) focusSegment(firstMissingSegment);
      return;
    }

    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const parsed = promptBuilderStateSchema.safeParse({...state, segmentOrder, preferredMode: mode, onboardingCompleted});
    if (!parsed.success) {
      toast.error(t('promptBuilder.invalid'));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const slug = `${slugify(state.title || t('promptBuilder.untitled'))}-${Math.random().toString(36).slice(2, 7)}`;
    const {error} = await supabase.from('prompts').insert({
      owner_id: user.id,
      title: state.title || t('promptBuilder.untitled'),
      slug,
      language: 'auto',
      visibility: 'public',
      status: 'active',
      hidden_reason: null,
      structure: state.structure,
      tags: state.tags.length > 0 ? state.tags : state.niche && state.niche !== 'all' ? [state.niche] : [],
      builder_state: parsed.data,
      output_prompt: composedPrompt,
    });

    if (error) {
      toast.error(t('common.genericError'));
      return;
    }

    toast.success(t('promptBuilder.published'));
  }, [canPublishByMinimum, composedPrompt, firstMissingSegment, missingList, mode, onboardingCompleted, requiredList, segmentOrder, state, t, user]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action !== 'publish') return;
    if (!user || !canPublishByMinimum || publishAutoTriggeredRef.current) return;

    publishAutoTriggeredRef.current = true;
    void handlePublish().finally(() => {
      router.replace(pathname);
    });
  }, [searchParams, user, canPublishByMinimum, pathname, router, handlePublish]);

  const switchMode = async (questEnabled: boolean) => {
    const nextMode: BuilderMode = questEnabled ? 'quest' : 'pro';
    setMode(nextMode);
    await persistPreferences(nextMode, onboardingCompleted, advancedMode);
  };

  const switchAdvancedMode = async (enabled: boolean) => {
    setAdvancedMode(enabled);
    const nextMode: BuilderMode = enabled ? mode : 'pro';
    if (!enabled) setMode('pro');
    await persistPreferences(nextMode, onboardingCompleted, enabled);
  };

  const moveSegmentUp = (segmentId: SegmentId) => {
    setState((prev) => {
      const order = normalizeSegmentOrder(prev.segmentOrder, prev.columns);
      const index = order.indexOf(segmentId);
      if (index <= 0) return prev;
      return {...prev, segmentOrder: arrayMove(order, index, index - 1)};
    });
  };

  const moveSegmentDown = (segmentId: SegmentId) => {
    setState((prev) => {
      const order = normalizeSegmentOrder(prev.segmentOrder, prev.columns);
      const index = order.indexOf(segmentId);
      if (index < 0 || index === order.length - 1) return prev;
      return {...prev, segmentOrder: arrayMove(order, index, index + 1)};
    });
  };

  const onQuestDrop = (slotId: SegmentId, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('application/x-segment') as SegmentId;
    if (!draggedId) return;

    if (draggedId !== slotId) {
      toast.error(t('promptBuilder.questWrongSlot'));
      return;
    }

    setQuestBoard((prev) => ({...prev, [slotId]: true}));
    focusSegment(slotId);
    toast.success(t('promptBuilder.questPlaced', {segment: getColumnLabel(t, slotId, slotId)}));
  };

  const questMinimumReady = publishSegments.every((segmentId) => questBoard[segmentId]);

  useEffect(() => {
    if (!questMinimumReady || onboardingCompleted || questCelebratedRef.current) return;
    questCelebratedRef.current = true;
    toast.success(t('promptBuilder.questReadyToast'));
  }, [questMinimumReady, onboardingCompleted, t]);

  const continueToPro = async () => {
    setOnboardingCompleted(true);
    setMode('pro');
    await persistPreferences('pro', true, advancedMode);
    toast.success(t('promptBuilder.questCompletedToast'));
  };

  const completedSegmentsCount = visibleColumns.filter((column) => getSegmentContents(column.id as SegmentId).length > 0).length;
  const promptSteps = visibleColumns.map((column) => {
    const segmentId = column.id as SegmentId;
    const done = getSegmentContents(segmentId).length > 0;
    return {
      id: column.id,
      title: getColumnLabel(t, column.id, column.title),
      complete: done,
      hint: done ? t('promptBuilder.stepCompleteHint') : t('promptBuilder.stepMissingHint', {segment: getColumnLabel(t, column.id, column.title)}),
    };
  });
  const bundleEntries = ['PROMPT.txt', 'PROMPT.md', 'meta.json', 'segments.json', t('promptBuilder.bundleSummaryFooter', {count: visibleColumns.length})];
  const previewDescription = t('builderShell.previewSaved', {value: lastSavedLabel});
  const copyComposedPrompt = async () => {
    await navigator.clipboard.writeText(composedPrompt);
    toast.success(t('actions.copied'));
  };
  const exportPromptText = () => {
    downloadBlob(`${slugify(state.title || 'prompt')}.txt`, composedPrompt, 'text/plain');
    toast.success(t('actions.exported'));
  };
  const exportPromptMarkdown = () => {
    downloadBlob(`${slugify(state.title || 'prompt')}.md`, composedPrompt, 'text/markdown');
    toast.success(t('actions.exported'));
  };

  const returnTo = pathname;
  const publishActionDisabled = !supabaseEnabled || !canPublishByMinimum;
  const publishActionTitle = !supabaseEnabled ? t('promptBuilder.supabaseRequired') : publishDisabledReason || undefined;

  const sidebar = (
    <>
      <Card className="builder-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('promptBuilder.workspaceTitle')}</CardTitle>
          <CardDescription>{t('promptBuilder.workspaceDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">{t('promptBuilder.structure')}</span>
              <StepHelp tooltip={t('help.prompt.macro')} />
            </div>
            <Select value={state.structure} onValueChange={handleStructureChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('promptBuilder.structure')} />
              </SelectTrigger>
              <SelectContent>
                {structures.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {getStructureLabel(item.id, structures)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">{t('filters.allNiches')}</span>
            <Select value={state.niche ?? 'all'} onValueChange={(value) => setState((prev) => ({...prev, niche: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allNiches')}</SelectItem>
                <SelectItem value="dev">{t('filters.dev')}</SelectItem>
                <SelectItem value="images">{t('filters.images')}</SelectItem>
                <SelectItem value="videos">{t('filters.videos')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">{t('common.search')}</span>
            <Input placeholder={t('common.search')} value={search} onChange={(event) => setSearch(event.target.value)} className="bg-white" />
          </div>

          <Button variant="outline" className="w-full justify-center" onClick={() => setMacroModalOpen(true)} title={t('promptBuilder.applyMacro')}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t('promptBuilder.applyMacro')}
          </Button>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{t('promptBuilder.advancedMode')}</span>
                  <StepHelp tooltip={t('promptBuilder.advancedModeTooltip')} />
                </div>
                <p className="text-xs text-slate-500">{t('promptBuilder.simpleModeDescription')}</p>
              </div>
              <Switch checked={advancedMode} onCheckedChange={switchAdvancedMode} aria-label={t('promptBuilder.advancedMode')} />
            </div>

            {advancedMode ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{mode === 'quest' ? t('promptBuilder.gameMode') : t('promptBuilder.proMode')}</p>
                    <p className="text-xs text-slate-500">{t('promptBuilder.gameModeTooltip')}</p>
                  </div>
                </div>
                <Switch checked={mode === 'quest'} onCheckedChange={switchMode} aria-label={t('promptBuilder.gameMode')} />
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <BuilderStepper
        title={t('promptBuilder.stepsTitle')}
        description={t('promptBuilder.stepsDescription')}
        steps={promptSteps}
        onStepSelect={(stepId) => focusSegment(stepId as SegmentId)}
      />

      {advancedMode ? (
        <Card className="builder-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('promptBuilder.finalOrderTitle')}</CardTitle>
            <CardDescription>{t('promptBuilder.finalOrderDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <SortableContext items={requiredSegments.map((segmentId) => `segment-order-${segmentId}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {requiredSegments.map((segmentId, index) => (
                  <SegmentOrderItem
                    key={segmentId}
                    segmentId={segmentId}
                    label={getColumnLabel(t, segmentId, segmentId)}
                    onFocus={focusSegment}
                    onMoveUp={moveSegmentUp}
                    onMoveDown={moveSegmentDown}
                    canMoveUp={index > 0}
                    canMoveDown={index < requiredSegments.length - 1}
                    moveUpLabel={t('promptBuilder.moveUp')}
                    moveDownLabel={t('promptBuilder.moveDown')}
                    reorderLabel={t('common.reorder')}
                  />
                ))}
              </div>
            </SortableContext>
          </CardContent>
        </Card>
      ) : null}

      <Card className={`builder-panel ${canPublishByMinimum ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/70'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('actions.publish')}</CardTitle>
          <CardDescription>{t('promptBuilder.minimumsToPublishDynamic', {structure: getStructureLabel(state.structure, structures), items: requiredList})}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {canPublishByMinimum ? (
            <p className="text-sm font-medium text-emerald-700">{t('promptBuilder.readyToPublish')}</p>
          ) : (
            <>
              <p className="text-sm text-amber-700">{t('promptBuilder.missingList', {items: missingList})}</p>
              {firstMissingSegment ? (
                <Button variant="outline" size="sm" onClick={() => focusSegment(firstMissingSegment)}>
                  {t('actions.goToMissing')}
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {advancedMode ? (
        <Card className="builder-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('promptBuilder.structureChecklistTitle', {structure: getStructureLabel(state.structure, structures)})}</CardTitle>
            <CardDescription>{t('promptBuilder.structureChecklistDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {checklistEntries.map((entry) => (
              <label key={entry.key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[color:var(--prompteero-blue)]"
                  checked={entry.checked}
                  onChange={(event) => toggleChecklist(entry.key, event.target.checked)}
                />
                <span className="flex-1 text-slate-800">{entry.label}</span>
                <Badge variant={entry.contentReady ? 'default' : 'secondary'}>{entry.contentReady ? t('promptBuilder.complete') : t('promptBuilder.pending')}</Badge>
              </label>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );

  const editor = (
    <div className="space-y-4 pb-12">
      <Card glow className="builder-panel border-blue-100">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{t('promptBuilder.structureTypeTitle')}</CardTitle>
            <StepHelp tooltip={t('help.prompt.macro')} />
          </div>
          <CardDescription>{t('promptBuilder.structureTypeDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentStructure ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{t('promptBuilder.structureGuideTitle', {structure: getStructureLabel(currentStructure.id, structures)})}</p>
              <p className="mt-1 text-sm text-slate-600">{currentStructure.whatIs}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('structuresPage.whenToUse')}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {currentStructure.whenToUse.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {advancedMode && mode === 'quest' ? (
        <Card glow className="builder-panel border-emerald-200 bg-emerald-50/60">
          <CardHeader>
            <CardTitle className="text-base">{t('promptBuilder.questTitle')}</CardTitle>
            <CardDescription>{t('promptBuilder.questSubtitle')}</CardDescription>
            <p className="text-xs font-medium text-emerald-700">
              {t('promptBuilder.questProgress', {
                done: publishSegments.filter((segmentId) => questBoard[segmentId]).length,
                total: publishSegments.length,
              })}
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('promptBuilder.questCards')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {publishSegments.map((segmentId) => (
                  <button
                    key={`quest-card-${segmentId}`}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('application/x-segment', segmentId)}
                    className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 hover:border-emerald-300"
                    onClick={() => focusSegment(segmentId)}
                  >
                    {getColumnLabel(t, segmentId, segmentId)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('promptBuilder.questBoard')}</p>
              <div className="space-y-2">
                {publishSegments.map((segmentId) => {
                  const placed = questBoard[segmentId];
                  return (
                    <div
                      key={`quest-slot-${segmentId}`}
                      className={`rounded-xl border border-dashed p-3 text-sm transition-colors ${
                        placed ? 'border-emerald-400 bg-emerald-100/70 text-emerald-900' : 'border-slate-300 bg-white text-slate-600'
                      }`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => onQuestDrop(segmentId, event)}
                      onClick={() => focusSegment(segmentId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          focusSegment(segmentId);
                        }
                      }}
                    >
                      <span className="font-medium">{getColumnLabel(t, segmentId, segmentId)}:</span>{' '}
                      {placed ? t('promptBuilder.questPlacedLabel') : t('promptBuilder.questDropHere')}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              {questMinimumReady ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-100 p-3">
                  <p className="text-sm font-medium text-emerald-900">{t('promptBuilder.questSuccess')}</p>
                  <Button onClick={continueToPro}>{t('promptBuilder.continuePro')}</Button>
                </div>
              ) : (
                <p className="text-sm text-slate-600">{t('promptBuilder.questHintDynamic', {items: requiredList})}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card glow className="builder-panel border-blue-100 bg-blue-50/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{t('promptBuilder.promptDetails')}</CardTitle>
            <StepHelp tooltip={t('help.prompt.details')} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Input
            placeholder={t('promptBuilder.promptTitle')}
            value={state.title}
            onChange={(event) => setState((prev) => ({...prev, title: event.target.value}))}
            className="bg-white"
          />
          <Select value={state.role || ''} onValueChange={(value) => setState((prev) => ({...prev, role: value}))}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder={t('promptBuilder.role')} />
            </SelectTrigger>
            <SelectContent>
              {roles.map((item) => (
                <SelectItem key={item.id} value={item.label}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{t('promptBuilder.antiHallucination')}</span>
            <StepHelp tooltip={t('promptBuilder.antiHallucinationTooltip')} />
            <Switch
              checked={state.antiHallucination}
              aria-label={t('promptBuilder.antiHallucination')}
              onCheckedChange={(value) =>
                setState((prev) => ({
                  ...prev,
                  antiHallucination: value,
                  columns: ensureAntiHallucination(prev.columns, value),
                }))
              }
            />
            <Badge variant={state.antiHallucination ? 'default' : 'secondary'}>{state.antiHallucination ? t('common.on') : t('common.off')}</Badge>
          </div>
        </CardContent>
      </Card>

      {visibleColumns.map((column, index) => {
        const stepBlocks = filteredBlocks.filter((block) => block.targetColumn === column.id);
        const isSpotlight = spotlightSegmentId === column.id;
        const segmentId = column.id as SegmentId;
        const manualId = getManualItemId(segmentId);
        const manualValue = column.items.find((item) => item.id === manualId)?.content ?? '';
        const hasNonManualItems = column.items.some((item) => !isManualItem(item.id));

        return (
          <section
            key={column.id}
            id={`step-${column.id}`}
            className={`scroll-mt-24 space-y-3 rounded-2xl p-1 transition-all ${isSpotlight ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{index + 1}</div>
              <h3 className="text-lg font-bold text-slate-800">{getColumnLabel(t, column.id, column.title)}</h3>
              <StepHelp tooltip={t(`help.prompt.${column.id}`)} />
            </div>

            <Card glow className="builder-panel overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t('promptBuilder.palette')} ({stepBlocks.length})
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {stepBlocks.length === 0 ? (
                    <p className="py-2 text-xs italic text-slate-400">{t('promptBuilder.noSuggestedBlocks')}</p>
                  ) : (
                    stepBlocks.map((block) => (
                      <PaletteDraggable key={block.id} id={`palette-${block.id}`}>
                        <div
                          className={`relative cursor-grab rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition-all hover:border-blue-300 hover:shadow-md ${
                            activeDragId === `palette-${block.id}` ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="relative mb-2 h-20 w-full overflow-hidden rounded-lg">
                            <Image src={block.image} alt={block.title} fill className="object-cover" sizes="160px" />
                          </div>
                          <p className="line-clamp-1 text-xs font-semibold text-slate-800">{block.title}</p>
                          <p className="line-clamp-1 text-[10px] text-slate-500">{block.content}</p>
                        </div>
                      </PaletteDraggable>
                    ))
                  )}
                </div>
              </div>

              <CardContent className="p-4">
                <DropColumn
                  column={column}
                  title={getColumnLabel(t, column.id, column.title)}
                  dragLabel={t('common.reorder')}
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
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('promptBuilder.manualInputLabel')}</p>
                  <Textarea
                    value={manualValue}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        columns: upsertManualSegmentContent(prev.columns, segmentId, event.target.value, t),
                      }))
                    }
                    placeholder={getSegmentPlaceholder(segmentId)}
                    className="min-h-20 bg-white"
                  />
                </div>
                {!hasNonManualItems ? (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-700">
                      {t('promptBuilder.segmentHintPrefix')}: {getSegmentPlaceholder(segmentId)}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>
        );
      })}
    </div>
  );

  const preview = (
    <PreviewPanel
      title={t('builderShell.previewTitle')}
      description={previewDescription}
      actions={[
        {
          id: 'copy',
          label: t('actions.copy'),
          onClick: () => {
            void copyComposedPrompt();
          },
          disabled: !hasPreviewContent,
          icon: <Copy className="h-4 w-4" />,
        },
        {
          id: 'export',
          label: t('actions.export'),
          disabled: !hasPreviewContent,
          icon: <Download className="h-4 w-4" />,
          exportItems: promptBuilderConfig.exportFormats.map((format) => {
            if (format === 'txt') return {id: 'txt', label: t('actions.exportTxt'), onSelect: exportPromptText, disabled: !hasPreviewContent};
            if (format === 'md') return {id: 'md', label: t('actions.exportMd'), onSelect: exportPromptMarkdown, disabled: !hasPreviewContent};
            return {id: 'zip', label: t('actions.exportBundleZip'), onSelect: () => void exportZip(), disabled: !hasPreviewContent};
          }),
        },
      ]}
      tabs={[
        {
          id: 'text',
          label: t('builderShell.tabs.text'),
          content: (
            <Textarea
              value={hasPreviewContent ? composedPrompt : t('promptBuilder.exportEmpty')}
              readOnly
              className="min-h-[420px] resize-none bg-white font-mono text-sm"
            />
          ),
        },
        {
          id: 'markdown',
          label: t('builderShell.tabs.markdown'),
          content: (
            <pre className="max-h-[520px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
              {hasPreviewContent ? composedPrompt : t('promptBuilder.exportEmpty')}
            </pre>
          ),
        },
        {
          id: 'bundle',
          label: t('builderShell.tabs.bundle'),
          content: (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{t('promptBuilder.bundleInfoTitle')}</p>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {getStructureLabel(state.structure, structures)}
                </Badge>
              </div>
              <ul className="space-y-2">
                {bundleEntries.map((entry) => (
                  <li key={entry} className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                    {entry}
                  </li>
                ))}
              </ul>
            </div>
          ),
        },
      ]}
    />
  );

  return (
    <>
      <AuthGateModal open={authModalOpen} onOpenChange={setAuthModalOpen} returnTo={returnTo} action="publish" intent="publish" />

      <Modal
        open={macroModalOpen}
        onOpenChange={setMacroModalOpen}
        title={t('promptBuilder.macroModalTitle')}
        description={t('promptBuilder.macroModalDescription')}
        footer={
          <>
            <Button variant="outline" onClick={() => setMacroModalOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={() => applyMacro(selectedMacroId)}>
              {t('promptBuilder.applyMacro')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">{t('promptBuilder.structure')}</label>
          <Select value={selectedMacroId} onValueChange={setSelectedMacroId}>
            <SelectTrigger>
              <SelectValue placeholder={t('promptBuilder.structure')} />
            </SelectTrigger>
            <SelectContent>
              {structures.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {getStructureLabel(item.id, structures)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('promptBuilder.beforeOrder')}</p>
                <div className="space-y-1">
                  {requiredSegments.map((segmentId, index) => (
                    <p key={segmentId} className="text-sm text-slate-700">
                      {index + 1}. {getColumnLabel(t, segmentId, segmentId)}
                    </p>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-700">{t('promptBuilder.afterOrder')}</p>
            <div className="space-y-1">
              {macroPreviewOrder.map((segmentId, index) => (
                <p key={segmentId} className="text-sm text-slate-700">
                  {index + 1}. {getColumnLabel(t, segmentId, segmentId)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <BuilderShell
          title={t('promptBuilder.title')}
          subtitle={t('promptBuilder.subtitle')}
          counters={[
            {label: t('promptBuilder.structureCounterLabel'), value: getStructureLabel(state.structure, structures)},
            {label: t('promptBuilder.completedCounterLabel'), value: `${completedSegmentsCount}/${visibleColumns.length}`},
            {label: t('promptBuilder.savedCounterLabel'), value: lastSavedLabel},
          ]}
          actions={[
            {
              id: 'save',
              label: t('actions.saveDraft'),
              onClick: saveDraft,
              disabled: !hasPreviewContent,
              variant: 'outline',
              icon: <Save className="h-4 w-4" />,
            },
            {
              id: 'publish',
              label: t('actions.publish'),
              onClick: () => {
                void handlePublish();
              },
              disabled: publishActionDisabled,
              title: publishActionTitle,
              icon: <Rocket className="h-4 w-4" />,
            },
          ]}
          sidebar={sidebar}
          editor={editor}
          preview={preview}
        />
      </DndContext>
    </>
  );
}
