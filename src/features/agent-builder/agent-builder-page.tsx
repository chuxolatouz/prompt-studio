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
import {toast} from 'sonner';
import {StepHelp} from '@/components/ui/step-help';

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
      toast.error(parsed.error.issues[0]?.message || 'Invalid agent');
      return;
    }
    writeLocal(storageKeys.agents, parsed.data);
    toast.success(t('agentBuilder.saved'));
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
      toast.error(parsed.error.issues[0]?.message || 'Invalid agent');
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
    <div className="space-y-6">
      {/* Sticky Toolbar */}
      <div className="sticky top-[58px] z-30 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-0 md:rounded-2xl md:border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-800">{title || t('agentBuilder.agentTitle')}</span>
            <Badge variant="outline">{steps.length} steps</Badge>
            <Badge variant="outline">{tools.length} tools</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={saveLocal}>
              {t('actions.saveDraft')}
            </Button>
            <Button variant="secondary" onClick={exportBundle}>
              {t('agentBuilder.exportBundle')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Column: Vertical Steps */}
        <div className="space-y-12 pb-20">

          {/* Step 1: Identity */}
          <div id="step-identity" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">1</div>
              <h3 className="text-lg font-bold text-slate-800">{t('agentBuilder.agentTitle')}</h3>
              <StepHelp tooltip={t('help.agent.identity')} />
            </div>
            <Card glow>
              <CardContent className="grid gap-3 pt-6 md:grid-cols-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('agentBuilder.agentTitle')} />
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder={t('agentBuilder.agentRole')} />
              </CardContent>
            </Card>
          </div>

          {/* Step 2: Objective */}
          <div id="step-objective" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">2</div>
              <h3 className="text-lg font-bold text-slate-800">{t('agentBuilder.objective')}</h3>
              <StepHelp tooltip={t('help.agent.objective')} />
            </div>
            <Card glow>
              <CardContent className="pt-6">
                <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder={t('agentBuilder.objective')} className="min-h-[120px]" />
              </CardContent>
            </Card>
          </div>

          {/* Step 3: Inputs */}
          <div id="step-inputs" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">3</div>
              <h3 className="text-lg font-bold text-slate-800">{t('agentBuilder.inputs')}</h3>
              <StepHelp tooltip={t('help.agent.inputs')} />
            </div>
            <Card glow>
              <CardContent className="space-y-2 pt-6">
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
          </div>

          {/* Step 4: Steps */}
          <div id="step-steps" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">4</div>
              <h3 className="text-lg font-bold text-slate-800">{t('agentBuilder.steps')}</h3>
              <StepHelp tooltip={t('help.agent.steps')} />
            </div>
            <Card glow>
              <CardContent className="pt-6">
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
                <Button className="mt-3" variant="outline" onClick={() => setSteps((prev) => [...prev, {id: crypto.randomUUID(), step: '', doneCriteria: ''}])}>
                  {t('actions.addStep')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Step 5: Tools */}
          <div id="step-tools" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">5</div>
              <h3 className="text-lg font-bold text-slate-800">{t('agentBuilder.tools')}</h3>
              <StepHelp tooltip={t('help.agent.tools')} />
            </div>
            <Card glow>
              <CardContent className="grid gap-2 pt-6 md:grid-cols-2">
                {(toolsSeed as Array<any>).map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${tools.includes(tool.id) ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-300' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{t(tool.nameKey)}</p>
                    <p className="text-xs text-slate-500">{t(tool.descriptionKey)}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Step 6: Policies */}
          <div id="step-policies" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">6</div>
              <h3 className="text-lg font-bold text-slate-800">{t('agentBuilder.policies')}</h3>
              <StepHelp tooltip={t('help.agent.policies')} />
            </div>
            <Card glow>
              <CardContent className="space-y-2 pt-6">
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
          </div>

          {/* Step 7: Output Contract */}
          <div id="step-output" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">7</div>
              <h3 className="text-lg font-bold text-slate-800">{t('agentBuilder.outputContract')}</h3>
              <StepHelp tooltip={t('help.agent.outputContract')} />
            </div>
            <Card glow>
              <CardContent className="pt-6">
                <Textarea value={outputContract} onChange={(e) => setOutputContract(e.target.value)} placeholder={t('agentBuilder.outputContract')} className="min-h-[120px]" />
              </CardContent>
            </Card>
          </div>

          {/* Step 8: Attach Skills */}
          <div id="step-skills" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">8</div>
              <h3 className="text-lg font-bold text-slate-800">{t('agentBuilder.attachSkills')}</h3>
              <StepHelp tooltip={t('help.agent.attachSkills')} />
            </div>
            <Card glow>
              <CardContent className="space-y-2 pt-6">
                {availableSkills.length === 0 ? (
                  <div className="flex h-20 items-center justify-center rounded-xl border border-dashed text-sm text-slate-400">
                    {t('agentBuilder.noSkills')}
                  </div>
                ) : (
                  availableSkills.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-all ${attachedSkillIds.includes(skill.id) ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-300' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                    >
                      <p className="text-sm font-semibold text-slate-900">{skill.name}</p>
                      <p className="text-xs text-slate-500">{skill.description}</p>
                    </button>
                  ))
                )}
                {attachedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {attachedSkills.map((skill) => (
                      <Badge key={skill.id} variant="secondary">{skill.name}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Sticky Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-[140px] space-y-4">
            <Card glow className="border-blue-100 bg-white shadow-lg">
              <CardHeader className="bg-slate-50/50 pb-3">
                <CardTitle className="text-sm">{t('agentBuilder.agentPrompt')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap p-4 text-xs text-slate-700">
                  {agentPrompt}
                </pre>
              </CardContent>
            </Card>

            <Card glow className="border-blue-100 bg-white shadow-lg">
              <CardHeader className="bg-slate-50/50 pb-3">
                <CardTitle className="text-sm">AGENTS.md</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="max-h-[250px] overflow-y-auto whitespace-pre-wrap p-4 text-xs text-slate-700">
                  {agentsMd}
                </pre>
              </CardContent>
              <div className="flex gap-2 border-t border-slate-100 p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={async () => {
                    await navigator.clipboard.writeText(agentPrompt);
                    toast.success(t('actions.copied'));
                  }}
                >
                  {t('actions.copy')} Prompt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={async () => {
                    await navigator.clipboard.writeText(agentsMd);
                    toast.success(t('actions.copied'));
                  }}
                >
                  {t('actions.copy')} AGENTS.md
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
