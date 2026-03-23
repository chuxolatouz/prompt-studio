'use client';

import {useMemo, useState} from 'react';
import {DndContext, DragEndEvent, PointerSensor, useSensor, useSensors} from '@dnd-kit/core';
import {arrayMove, SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {Copy, Download, GripVertical, Save, Wrench} from 'lucide-react';
import JSZip from 'jszip';
import {useTranslations} from 'next-intl';
import toolsSeed from '@/data/tools.json';
import {BuilderShell} from '@/components/builder/BuilderShell';
import {BuilderStepper} from '@/components/builder/BuilderStepper';
import {EmptyState} from '@/components/builder/EmptyState';
import {PreviewPanel} from '@/components/builder/PreviewPanel';
import {agentBuilderConfig} from '@/components/builder/configs';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {StepHelp} from '@/components/ui/step-help';
import {toast} from '@/components/ui/toast';
import {tPlural} from '@/i18n/helpers';
import {agentSpecSchema} from '@/lib/schemas';
import {readLocal, storageKeys, writeLocal} from '@/lib/storage';
import {downloadBlob, slugify} from '@/lib/utils';

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
  dragLabel,
  stepPlaceholder,
  donePlaceholder,
  removeLabel,
}: {
  step: AgentStep;
  onChange: (id: string, field: keyof AgentStep, value: string) => void;
  onRemove: (id: string) => void;
  dragLabel: string;
  stepPlaceholder: string;
  donePlaceholder: string;
  removeLabel: string;
}) {
  const {attributes, listeners, setNodeRef, transform, transition} = useSortable({id: step.id});
  const style = {transform: CSS.Transform.toString(transform), transition};

  return (
    <div ref={setNodeRef} style={style} className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className="cursor-grab rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          {...attributes}
          {...listeners}
          aria-label={dragLabel}
          title={dragLabel}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Button variant="ghost" size="sm" onClick={() => onRemove(step.id)}>
          {removeLabel}
        </Button>
      </div>
      <Input value={step.step} onChange={(event) => onChange(step.id, 'step', event.target.value)} placeholder={stepPlaceholder} />
      <Input
        value={step.doneCriteria}
        onChange={(event) => onChange(step.id, 'doneCriteria', event.target.value)}
        placeholder={donePlaceholder}
        className="mt-2"
      />
    </div>
  );
}

function buildBundleEntries(attachedSkills: AttachedSkill[], t: ReturnType<typeof useTranslations>) {
  return [
    'AGENTS.md',
    'agent.json',
    ...attachedSkills.map((skill) => `skills/${slugify(skill.name) || 'skill'}/SKILL.md`),
    t('agentBuilder.bundleSummaryFooter', {count: attachedSkills.length}),
  ];
}

export function AgentBuilderPage() {
  const t = useTranslations();
  const sensors = useSensors(useSensor(PointerSensor));

  const [title, setTitle] = useState('');
  const [role, setRole] = useState('');
  const [objective, setObjective] = useState('');
  const [inputs, setInputs] = useState<string[]>(['']);
  const [steps, setSteps] = useState<AgentStep[]>([{id: crypto.randomUUID(), step: '', doneCriteria: ''}]);
  const [tools, setTools] = useState<string[]>([]);
  const [policies, setPolicies] = useState<string[]>(() => t('agentBuilder.defaultPolicies').split('\n').map((item) => item.trim()).filter(Boolean));
  const [outputContract, setOutputContract] = useState(() => t('agentBuilder.outputContractDefault'));

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
  const hasMinimumFields = title.trim().length > 0 && role.trim().length > 0 && objective.trim().length > 0;

  const stepStatus = agentBuilderConfig.steps.map((config) => ({
    id: config.id,
    title: t(config.titleKey),
    complete:
      config.id === 'step-identity'
        ? title.trim().length > 0 && role.trim().length > 0
        : config.id === 'step-objective'
          ? objective.trim().length > 0
          : config.id === 'step-inputs'
            ? inputs.some((item) => item.trim().length > 0)
            : config.id === 'step-steps'
              ? steps.some((item) => item.step.trim().length > 0 && item.doneCriteria.trim().length > 0)
              : config.id === 'step-tools'
                ? tools.length > 0
                : config.id === 'step-policies'
                  ? policies.some((item) => item.trim().length > 0)
                  : config.id === 'step-output'
                    ? outputContract.trim().length > 0
                    : true,
  }));

  const agentPrompt = useMemo(() => {
    const selectedTools = (toolsSeed as Array<any>)
      .filter((tool) => tools.includes(tool.id))
      .map((tool) => `${t(tool.nameKey)}: ${t(tool.descriptionKey)}`)
      .join('\n');

    return [
      `# ${t('agentBuilder.agentRole')}\n${role}`,
      `# ${t('agentBuilder.objective')}\n${objective}`,
      `# ${t('agentBuilder.inputs')}\n${inputs.filter(Boolean).map((input, index) => `${index + 1}. ${input}`).join('\n')}`,
      `# ${t('agentBuilder.steps')}\n${steps.map((step, index) => `${index + 1}. ${step.step}\n   ${t('agentBuilder.done')}: ${step.doneCriteria}`).join('\n')}`,
      `# ${t('agentBuilder.tools')}\n${selectedTools || '-'}`,
      `# ${t('agentBuilder.policies')}\n${policies.filter(Boolean).map((item) => `- ${item}`).join('\n')}`,
      `# ${t('agentBuilder.outputContract')}\n${outputContract}`,
    ].join('\n\n');
  }, [role, objective, inputs, steps, tools, policies, outputContract, t]);

  const agentsMd = useMemo(() => {
    return [
      `# ${title || t('agentBuilder.untitled')}`,
      `## ${t('agentBuilder.whatDoes')}\n${objective}`,
      `## ${t('agentBuilder.expectedInputs')}\n${inputs.filter(Boolean).map((value) => `- ${value}`).join('\n') || '-'}`,
      `## ${t('agentBuilder.steps')}\n${steps.map((step, index) => `${index + 1}. ${step.step} (${t('agentBuilder.done')}: ${step.doneCriteria})`).join('\n') || '-'}`,
      `## ${t('agentBuilder.selectedTools')}\n${(toolsSeed as Array<any>)
        .filter((tool) => tools.includes(tool.id))
        .map((tool) => `- ${t(tool.nameKey)} (${t(tool.descriptionKey)})`)
        .join('\n') || '-'}`,
      `## ${t('agentBuilder.outputContract')}\n${outputContract}`,
      `## ${t('agentBuilder.howToUse')}\n1. ${t('agentBuilder.howToUse1')}\n2. ${t('agentBuilder.howToUse2')}\n3. ${t('agentBuilder.howToUse3')}`,
    ].join('\n\n');
  }, [title, objective, inputs, steps, tools, outputContract, t]);

  const saveLocal = () => {
    const payload = {
      id: crypto.randomUUID(),
      title: title || t('agentBuilder.untitled'),
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
      toast.error(t('agentBuilder.invalid'));
      return;
    }

    writeLocal(storageKeys.agents, parsed.data);
    toast.success(t('agentBuilder.saved'));
  };

  const exportBundle = async () => {
    const spec = {
      id: crypto.randomUUID(),
      title: title || t('agentBuilder.untitled'),
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
      toast.error(t('agentBuilder.invalid'));
      return;
    }

    const zip = new JSZip();
    zip.file('AGENTS.md', agentsMd);
    zip.file('agent.json', JSON.stringify(parsed.data, null, 2));

    const skillsFolder = zip.folder('skills');
    attachedSkills.forEach((skill) => {
      skillsFolder?.file(
        `${slugify(skill.name) || 'skill'}/SKILL.md`,
        `---\nname: "${skill.name}"\ndescription: "${skill.description}"\ntags: [${skill.tags.map((tag) => `"${tag}"`).join(', ')}]\nversion: "0.1"\nlanguage: "${skill.language}"\n---\n\n${skill.markdown}`
      );
    });

    const blob = await zip.generateAsync({type: 'blob'});
    downloadBlob(`${slugify(title || 'agent')}.zip`, blob, 'application/zip');
    toast.success(t('actions.exported'));
  };

  const exportPromptTxt = () => {
    downloadBlob(`${slugify(title || 'agent')}.txt`, agentPrompt, 'text/plain');
    toast.success(t('actions.exported'));
  };

  const exportAgentsMd = () => {
    downloadBlob(`${slugify(title || 'agent')}.md`, agentsMd, 'text/markdown');
    toast.success(t('actions.exported'));
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(agentPrompt);
    toast.success(t('actions.copied'));
  };

  const scrollToStep = (stepId: string) => {
    document.getElementById(stepId)?.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  const sidebar = (
    <>
      <BuilderStepper
        title={t('agentBuilder.stepsTitle')}
        description={t('agentBuilder.stepsDescription')}
        steps={stepStatus}
        onStepSelect={scrollToStep}
      />
      <Card className="builder-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('agentBuilder.summaryTitle')}</CardTitle>
          <CardDescription>{t('agentBuilder.summaryDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">{tPlural(t, 'agentBuilder.stepsCount', steps.length)}</Badge>
          <Badge variant="secondary">{tPlural(t, 'agentBuilder.toolsCount', tools.length)}</Badge>
          <Badge variant="secondary">{title.trim() || t('agentBuilder.agentTitle')}</Badge>
        </CardContent>
      </Card>
    </>
  );

  const editor = (
    <div className="space-y-4 pb-12">
      <section id="step-identity" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('agentBuilder.agentTitle')}</CardTitle>
              <StepHelp tooltip={t('help.agent.identity')} />
            </div>
            <CardDescription>{t('agentBuilder.identityDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('agentBuilder.agentTitle')} />
            <Input value={role} onChange={(event) => setRole(event.target.value)} placeholder={t('agentBuilder.agentRole')} />
          </CardContent>
        </Card>
      </section>

      <section id="step-objective" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('agentBuilder.objective')}</CardTitle>
              <StepHelp tooltip={t('help.agent.objective')} />
            </div>
            <CardDescription>{t('agentBuilder.objectiveDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={objective} onChange={(event) => setObjective(event.target.value)} placeholder={t('agentBuilder.objective')} className="min-h-[140px]" />
          </CardContent>
        </Card>
      </section>

      <section id="step-inputs" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('agentBuilder.inputs')}</CardTitle>
              <StepHelp tooltip={t('help.agent.inputs')} />
            </div>
            <CardDescription>{t('agentBuilder.inputsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {inputs.map((input, index) => (
              <Input
                key={index}
                value={input}
                onChange={(event) => setInputs((prev) => prev.map((item, idx) => (idx === index ? event.target.value : item)))}
                placeholder={`${t('agentBuilder.input')} ${index + 1}`}
              />
            ))}
            <Button variant="outline" onClick={() => setInputs((prev) => [...prev, ''])}>
              {t('actions.add')}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section id="step-steps" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('agentBuilder.steps')}</CardTitle>
              <StepHelp tooltip={t('help.agent.steps')} />
            </div>
            <CardDescription>{t('agentBuilder.stepsEditorDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
              <SortableContext items={steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {steps.map((step) => (
                    <SortableStep
                      key={step.id}
                      step={step}
                      dragLabel={t('common.reorder')}
                      stepPlaceholder={t('agentBuilder.stepPlaceholder')}
                      donePlaceholder={t('agentBuilder.doneCriteriaPlaceholder')}
                      removeLabel={t('actions.remove')}
                      onChange={(id, field, value) => setSteps((prev) => prev.map((item) => (item.id === id ? {...item, [field]: value} : item)))}
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
      </section>

      <section id="step-tools" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('agentBuilder.toolsMetadata')}</CardTitle>
              <StepHelp tooltip={t('help.agent.tools')} />
            </div>
            <CardDescription>{t('agentBuilder.toolsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {(toolsSeed as Array<any>).map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => toggleTool(tool.id)}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  tools.includes(tool.id) ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-300' : 'border-slate-200 bg-white hover:border-blue-200'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{t(tool.nameKey)}</p>
                <p className="mt-1 text-xs text-slate-500">{t(tool.descriptionKey)}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="step-policies" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('agentBuilder.policies')}</CardTitle>
              <StepHelp tooltip={t('help.agent.policies')} />
            </div>
            <CardDescription>{t('agentBuilder.policiesDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {policies.map((policy, index) => (
              <Input key={index} value={policy} onChange={(event) => setPolicies((prev) => prev.map((item, idx) => (idx === index ? event.target.value : item)))} />
            ))}
            <Button variant="outline" onClick={() => setPolicies((prev) => [...prev, ''])}>
              {t('actions.add')}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section id="step-output" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('agentBuilder.outputContract')}</CardTitle>
              <StepHelp tooltip={t('help.agent.outputContract')} />
            </div>
            <CardDescription>{t('agentBuilder.outputDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea value={outputContract} onChange={(event) => setOutputContract(event.target.value)} placeholder={t('agentBuilder.outputContract')} className="min-h-[140px]" />
          </CardContent>
        </Card>
      </section>

      <section id="step-skills" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('agentBuilder.attachSkills')}</CardTitle>
              <StepHelp tooltip={t('help.agent.attachSkills')} />
            </div>
            <CardDescription>{t('agentBuilder.skillsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {availableSkills.length === 0 ? (
              <EmptyState icon={Wrench} title={t('agentBuilder.noSkillsTitle')} description={t('agentBuilder.noSkills')} secondaryCTA={{label: t('nav.skillBuilder'), href: '/skill-builder'}} />
            ) : (
              <div className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2">
                  {availableSkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition-all ${
                        attachedSkillIds.includes(skill.id) ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-300' : 'border-slate-200 bg-white hover:border-blue-200'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">{skill.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{skill.description}</p>
                    </button>
                  ))}
                </div>
                {attachedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {attachedSkills.map((skill) => (
                      <Badge key={skill.id} variant="secondary">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );

  const preview = (
    <PreviewPanel
      title={t('builderShell.previewTitle')}
      description={t('agentBuilder.previewDescription')}
      actions={[
        {
          id: 'copy',
          label: t('agentBuilder.copyPrompt'),
          onClick: () => {
            void copyPrompt();
          },
          disabled: !hasMinimumFields,
          variant: 'outline',
          icon: <Copy className="h-4 w-4" />,
        },
        {
          id: 'export',
          label: t('actions.export'),
          disabled: !hasMinimumFields,
          icon: <Download className="h-4 w-4" />,
          exportItems: [
            {id: 'txt', label: t('actions.exportTxt'), onSelect: exportPromptTxt, disabled: !hasMinimumFields},
            {id: 'md', label: t('actions.exportMd'), onSelect: exportAgentsMd, disabled: !hasMinimumFields},
            {id: 'zip', label: t('agentBuilder.exportBundle'), onSelect: () => void exportBundle(), disabled: !hasMinimumFields},
          ],
        },
      ]}
      tabs={[
        {
          id: 'text',
          label: t('builderShell.tabs.text'),
          content: (
            <pre className="max-h-[520px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
              {agentPrompt}
            </pre>
          ),
        },
        {
          id: 'markdown',
          label: t('builderShell.tabs.markdown'),
          content: (
            <pre className="max-h-[520px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
              {agentsMd}
            </pre>
          ),
        },
        {
          id: 'bundle',
          label: t('builderShell.tabs.bundle'),
          content: (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{t('agentBuilder.bundleInfoTitle')}</p>
              <ul className="space-y-2">
                {buildBundleEntries(attachedSkills, t).map((entry) => (
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
    <BuilderShell
      title={t('agentBuilder.title')}
      subtitle={t('agentBuilder.subtitle')}
      counters={[
        {label: t('agentBuilder.stepsCounterLabel'), value: tPlural(t, 'agentBuilder.stepsCount', steps.length)},
        {label: t('agentBuilder.toolsCounterLabel'), value: tPlural(t, 'agentBuilder.toolsCount', tools.length)},
      ]}
      actions={[
        {
          id: 'save',
          label: t('actions.saveDraft'),
          onClick: saveLocal,
          disabled: !hasMinimumFields,
          variant: 'outline',
          icon: <Save className="h-4 w-4" />,
        },
        {
          id: 'copy',
          label: t('agentBuilder.copyPrompt'),
          onClick: () => {
            void copyPrompt();
          },
          disabled: !hasMinimumFields,
          variant: 'outline',
          icon: <Copy className="h-4 w-4" />,
        },
        {
          id: 'export',
          label: t('actions.export'),
          disabled: !hasMinimumFields,
          icon: <Download className="h-4 w-4" />,
          exportItems: [
            {id: 'txt', label: t('actions.exportTxt'), onSelect: exportPromptTxt, disabled: !hasMinimumFields},
            {id: 'md', label: t('actions.exportMd'), onSelect: exportAgentsMd, disabled: !hasMinimumFields},
            {id: 'zip', label: t('agentBuilder.exportBundle'), onSelect: () => void exportBundle(), disabled: !hasMinimumFields},
          ],
        },
      ]}
      sidebar={sidebar}
      editor={editor}
      preview={preview}
    />
  );
}
