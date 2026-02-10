'use client';

import {useMemo, useState} from 'react';
import {DndContext, DragEndEvent, PointerSensor, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import JSZip from 'jszip';
import {useTranslations} from 'next-intl';
import toolsSeed from '@/data/tools.json';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {agentSpecSchema} from '@/lib/schemas';
import {downloadBlob, slugify} from '@/lib/utils';
import {readLocal, storageKeys, writeLocal} from '@/lib/storage';

type AgentStep = {id: string; step: string; doneCriteria: string};

type AttachedSkill = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  language: 'es' | 'en' | 'both';
  markdown: string;
};

function SortableStep({
  step,
  onChange,
  onRemove,
}: {
  step: AgentStep;
  onChange: (id: string, field: keyof AgentStep, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const {attributes, listeners, setNodeRef, transform, transition} = useSortable({id: step.id});
  const style = {transform: CSS.Transform.toString(transform), transition};

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button className="cursor-grab rounded px-2 text-slate-500 hover:bg-slate-100" {...attributes} {...listeners}>
          ::
        </button>
        <Button variant="ghost" size="sm" onClick={() => onRemove(step.id)}>
          X
        </Button>
      </div>
      <Input value={step.step} onChange={(e) => onChange(step.id, 'step', e.target.value)} placeholder="Step" />
      <Input
        value={step.doneCriteria}
        onChange={(e) => onChange(step.id, 'doneCriteria', e.target.value)}
        placeholder="Done criteria"
        className="mt-2"
      />
    </div>
  );
}

export function AgentBuilderPage() {
  const t = useTranslations();
  const sensors = useSensors(useSensor(PointerSensor));

  const antiHallucinationPolicies = [
    'Si falta informacion, haz preguntas antes de asumir.',
    'No inventes datos; marca incertidumbre.',
    'Diferencia hechos de suposiciones.',
    'Respeta estrictamente el formato de salida solicitado.',
  ];

  const [title, setTitle] = useState('');
  const [role, setRole] = useState('');
  const [objective, setObjective] = useState('');
  const [inputs, setInputs] = useState<string[]>(['']);
  const [steps, setSteps] = useState<AgentStep[]>([{id: crypto.randomUUID(), step: '', doneCriteria: ''}]);
  const [tools, setTools] = useState<string[]>([]);
  const [policies, setPolicies] = useState<string[]>(antiHallucinationPolicies);
  const [outputContract, setOutputContract] = useState('JSON with keys: summary, actions, risks');

  const localSkillPack = readLocal<any>(storageKeys.skillPacks, null);
  const availableSkills: AttachedSkill[] = localSkillPack?.skills ?? [];
  const [attachedSkillIds, setAttachedSkillIds] = useState<string[]>([]);

  const toggleTool = (toolId: string) => {
    setTools((prev) => (prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]));
  };

  const toggleSkill = (skillId: string) => {
    setAttachedSkillIds((prev) => (prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    setSteps((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const attachedSkills = availableSkills.filter((skill) => attachedSkillIds.includes(skill.id));

  const agentPrompt = useMemo(() => {
    const selectedTools = (toolsSeed as Array<any>)
      .filter((tool) => tools.includes(tool.id))
      .map((tool) => `${t(tool.nameKey)}: ${t(tool.descriptionKey)}`)
      .join('\n');

    return [
      `# Agent Role\n${role}`,
      `# Objective\n${objective}`,
      `# Inputs\n${inputs.filter(Boolean).map((input, index) => `${index + 1}. ${input}`).join('\n')}`,
      `# Plan/Steps\n${steps.map((step, index) => `${index + 1}. ${step.step}\n   Done: ${step.doneCriteria}`).join('\n')}`,
      `# Tools (metadata)\n${selectedTools || '-'}`,
      `# Policies/Constraints\n${policies.filter(Boolean).map((item) => `- ${item}`).join('\n')}`,
      `# Output Contract\n${outputContract}`,
    ].join('\n\n');
  }, [role, objective, inputs, steps, tools, policies, outputContract, t]);

  const agentsMd = useMemo(() => {
    return [
      `# ${title || 'Agent'}`,
      `## Que hace\n${objective}`,
      `## Inputs esperados\n${inputs.filter(Boolean).map((value) => `- ${value}`).join('\n')}`,
      `## Steps\n${steps.map((step, index) => `${index + 1}. ${step.step} (Done: ${step.doneCriteria})`).join('\n')}`,
      `## Tools seleccionadas\n${(toolsSeed as Array<any>)
        .filter((tool) => tools.includes(tool.id))
        .map((tool) => `- ${t(tool.nameKey)} (${t(tool.descriptionKey)})`)
        .join('\n')}`,
      `## Output contract\n${outputContract}`,
      `## Como usarlo\n1. Completa los inputs.\n2. Ejecuta los steps en orden.\n3. Valida el resultado con el output contract.`,
    ].join('\n\n');
  }, [title, objective, inputs, steps, tools, outputContract, t]);

  const saveLocal = () => {
    const payload = {
      id: crypto.randomUUID(),
      title: title || 'Untitled Agent',
      role,
      objective,
      inputs: inputs.filter(Boolean),
      steps,
      tools,
      policies,
      outputContract,
      attachedSkills,
    };
    const parsed = agentSpecSchema.safeParse(payload);
    if (!parsed.success) {
      alert(parsed.error.issues[0]?.message);
      return;
    }
    writeLocal(storageKeys.agents, parsed.data);
    alert(t('agentBuilder.saved'));
  };

  const exportBundle = async () => {
    const spec = {
      id: crypto.randomUUID(),
      title: title || 'Untitled Agent',
      role,
      objective,
      inputs: inputs.filter(Boolean),
      steps,
      tools,
      policies,
      outputContract,
      attachedSkills,
    };

    const parsed = agentSpecSchema.safeParse(spec);
    if (!parsed.success) {
      alert(parsed.error.issues[0]?.message);
      return;
    }

    const zip = new JSZip();
    zip.file('AGENTS.md', agentsMd);
    zip.file('agent.json', JSON.stringify(parsed.data, null, 2));

    const skillsFolder = zip.folder('skills');
    attachedSkills.forEach((skill) => {
      skillsFolder?.file(
        `${slugify(skill.name)}/SKILL.md`,
        `---\nname: "${skill.name}"\ndescription: "${skill.description}"\ntags: [${skill.tags.map((tag) => `"${tag}"`).join(', ')}]\nversion: "0.1"\nlanguage: "${skill.language}"\n---\n\n${skill.markdown}`
      );
    });

    const blob = await zip.generateAsync({type: 'blob'});
    downloadBlob(`${slugify(title || 'agent')}.zip`, blob, 'application/zip');
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <Card>
        <CardHeader>
          <CardTitle>{t('agentBuilder.title')}</CardTitle>
          <CardDescription>{t('agentBuilder.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('agentBuilder.agentTitle')} />
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder={t('agentBuilder.agentRole')} />
          </div>
          <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder={t('agentBuilder.objective')} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('agentBuilder.inputs')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {inputs.map((input, index) => (
                <Input
                  key={index}
                  value={input}
                  onChange={(e) => setInputs((prev) => prev.map((item, idx) => (idx === index ? e.target.value : item)))}
                  placeholder={`${t('agentBuilder.input')} ${index + 1}`}
                />
              ))}
              <Button variant="outline" onClick={() => setInputs((prev) => [...prev, ''])}>
                {t('actions.add')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('agentBuilder.steps')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                <SortableContext items={steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {steps.map((step) => (
                      <SortableStep
                        key={step.id}
                        step={step}
                        onChange={(id, field, value) =>
                          setSteps((prev) => prev.map((item) => (item.id === id ? {...item, [field]: value} : item)))
                        }
                        onRemove={(id) => setSteps((prev) => prev.filter((item) => item.id !== id))}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              <Button className="mt-2" variant="outline" onClick={() => setSteps((prev) => [...prev, {id: crypto.randomUUID(), step: '', doneCriteria: ''}])}>
                {t('actions.addStep')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('agentBuilder.tools')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {(toolsSeed as Array<any>).map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`rounded-xl border p-2 text-left ${tools.includes(tool.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}
                >
                  <p className="text-sm font-semibold">{t(tool.nameKey)}</p>
                  <p className="text-xs text-slate-600">{t(tool.descriptionKey)}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('agentBuilder.policies')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {policies.map((policy, index) => (
                <Input
                  key={index}
                  value={policy}
                  onChange={(e) => setPolicies((prev) => prev.map((item, idx) => (idx === index ? e.target.value : item)))}
                />
              ))}
              <Button variant="outline" onClick={() => setPolicies((prev) => [...prev, ''])}>
                {t('actions.add')}
              </Button>
            </CardContent>
          </Card>

          <Textarea value={outputContract} onChange={(e) => setOutputContract(e.target.value)} placeholder={t('agentBuilder.outputContract')} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('agentBuilder.attachSkills')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableSkills.length === 0 ? (
                <p className="text-sm text-slate-600">{t('agentBuilder.noSkills')}</p>
              ) : (
                availableSkills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => toggleSkill(skill.id)}
                    className={`w-full rounded-xl border p-2 text-left ${attachedSkillIds.includes(skill.id) ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}
                  >
                    <p className="text-sm font-semibold">{skill.name}</p>
                    <p className="text-xs text-slate-600">{skill.description}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{t('agentBuilder.outputs')}</CardTitle>
          <CardDescription>{t('agentBuilder.outputsHelp')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-semibold">{t('agentBuilder.agentPrompt')}</p>
          <Textarea value={agentPrompt} readOnly className="min-h-48" />
          <p className="text-sm font-semibold">AGENTS.md</p>
          <Textarea value={agentsMd} readOnly className="min-h-48" />
          <div className="flex flex-wrap gap-2">
            {attachedSkills.map((skill) => (
              <Badge key={skill.id} variant="secondary">
                {skill.name}
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={saveLocal}>{t('actions.saveDraft')}</Button>
            <Button variant="secondary" onClick={exportBundle}>
              {t('agentBuilder.exportBundle')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
