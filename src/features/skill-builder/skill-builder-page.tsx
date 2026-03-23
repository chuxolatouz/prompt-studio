'use client';

import {useMemo, useState} from 'react';
import JSZip from 'jszip';
import {Copy, Download, PackageOpen, Save, Sparkles} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {BuilderShell} from '@/components/builder/BuilderShell';
import {BuilderStepper} from '@/components/builder/BuilderStepper';
import {EmptyState} from '@/components/builder/EmptyState';
import {PreviewPanel} from '@/components/builder/PreviewPanel';
import {skillBuilderConfig} from '@/components/builder/configs';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {StepHelp} from '@/components/ui/step-help';
import {toast} from '@/components/ui/toast';
import {tPlural} from '@/i18n/helpers';
import {skillPackSchema, SkillPack} from '@/lib/schemas';
import {readLocal, storageKeys, writeLocal} from '@/lib/storage';
import {downloadBlob, slugify} from '@/lib/utils';

function buildSkillMarkdown(skill: SkillPack['skills'][number]) {
  return `---\nname: "${skill.name}"\ndescription: "${skill.description}"\ntags: [${skill.tags.map((tag) => `"${tag}"`).join(', ')}]\nversion: "0.1"\nlanguage: "${skill.language}"\n---\n\n${skill.markdown}`;
}

function getBundleSummary(pack: SkillPack, t: ReturnType<typeof useTranslations>) {
  return [
    `pack.json`,
    ...pack.skills.map((skill) => `${slugify(skill.name) || 'skill'}/SKILL.md`),
    t('skillBuilder.bundleSummaryFooter', {count: pack.skills.length}),
  ];
}

export function SkillBuilderPage() {
  const t = useTranslations();
  const [pack, setPack] = useState<SkillPack>(() => {
    const saved = readLocal<SkillPack | null>(storageKeys.skillPacks, null);
    return (
      saved ?? {
        id: crypto.randomUUID(),
        title: t('skillBuilder.defaultPackTitle'),
        description: '',
        visibility: 'private',
        tags: [],
        skills: [],
      }
    );
  });
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(pack.skills[0]?.id ?? null);

  const selectedSkill = useMemo(() => pack.skills.find((skill) => skill.id === selectedSkillId) ?? null, [pack.skills, selectedSkillId]);
  const hasMinimumFields = pack.title.trim().length > 0 && pack.skills.length > 0;
  const packLabel = pack.title.trim() || t('skillBuilder.packTitle');

  const steps = skillBuilderConfig.steps.map((step) => ({
    id: step.id,
    title: t(step.titleKey),
    complete:
      step.id === 'step-pack-info'
        ? pack.title.trim().length > 0
        : step.id === 'step-skills'
          ? pack.skills.length > 0
          : Boolean(selectedSkill),
  }));

  const addSkill = () => {
    const skill = {
      id: crypto.randomUUID(),
      name: t('skillBuilder.newSkill'),
      description: '',
      tags: [],
      language: 'both' as const,
      markdown: t('skillBuilder.defaultMarkdown'),
    };
    setPack((prev) => ({...prev, skills: [...prev.skills, skill]}));
    setSelectedSkillId(skill.id);
  };

  const addTemplateSkill = () => {
    const skill = {
      id: crypto.randomUUID(),
      name: t('skillBuilder.newSkill'),
      description: t('skillBuilder.noDescription'),
      tags: ['plantilla'],
      language: 'both' as const,
      markdown: t('skillBuilder.defaultMarkdown'),
    };
    setPack((prev) => ({...prev, skills: [...prev.skills, skill]}));
    setSelectedSkillId(skill.id);
  };

  const duplicateSkill = (id: string) => {
    const source = pack.skills.find((skill) => skill.id === id);
    if (!source) return;

    const clone = {...source, id: crypto.randomUUID(), name: `${source.name} ${t('actions.copy')}`};
    setPack((prev) => ({...prev, skills: [...prev.skills, clone]}));
    setSelectedSkillId(clone.id);
  };

  const deleteSkill = (id: string) => {
    const remaining = pack.skills.filter((skill) => skill.id !== id);
    setPack((prev) => ({...prev, skills: remaining}));
    setSelectedSkillId(remaining[0]?.id ?? null);
  };

  const updateSkill = (changes: Partial<SkillPack['skills'][number]>) => {
    if (!selectedSkill) return;
    setPack((prev) => ({
      ...prev,
      skills: prev.skills.map((skill) => (skill.id === selectedSkill.id ? {...skill, ...changes} : skill)),
    }));
  };

  const saveLocal = () => {
    const parsed = skillPackSchema.safeParse(pack);
    if (!parsed.success) {
      toast.error(t('skillBuilder.invalid'));
      return;
    }

    writeLocal(storageKeys.skillPacks, parsed.data);
    toast.success(t('skillBuilder.saved'));
  };

  const exportZip = async () => {
    const parsed = skillPackSchema.safeParse(pack);
    if (!parsed.success) {
      toast.error(t('skillBuilder.invalid'));
      return;
    }

    const packSlug = slugify(parsed.data.title || 'pack');
    const zip = new JSZip();
    const root = zip.folder(packSlug);
    if (!root) return;

    root.file(
      'pack.json',
      JSON.stringify(
        {
          id: parsed.data.id,
          title: parsed.data.title,
          description: parsed.data.description,
          visibility: parsed.data.visibility,
          tags: parsed.data.tags,
          skillsCount: parsed.data.skills.length,
        },
        null,
        2
      )
    );

    for (const skill of parsed.data.skills) {
      const folder = root.folder(slugify(skill.name) || 'skill');
      folder?.file('SKILL.md', buildSkillMarkdown(skill));
    }

    const blob = await zip.generateAsync({type: 'blob'});
    downloadBlob(`${packSlug}.zip`, blob, 'application/zip');
    toast.success(t('actions.exported'));
  };

  const exportMarkdown = () => {
    if (!selectedSkill) return;
    downloadBlob(`${slugify(selectedSkill.name || 'skill')}.md`, buildSkillMarkdown(selectedSkill), 'text/markdown');
    toast.success(t('actions.exported'));
  };

  const copySelectedSkill = async () => {
    if (!selectedSkill) return;
    await navigator.clipboard.writeText(buildSkillMarkdown(selectedSkill));
    toast.success(t('actions.copied'));
  };

  const scrollToStep = (stepId: string) => {
    document.getElementById(stepId)?.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  const sidebar = (
    <>
      <BuilderStepper
        title={t('skillBuilder.stepsTitle')}
        description={t('skillBuilder.stepsDescription')}
        steps={steps}
        onStepSelect={scrollToStep}
      />
      <Card className="builder-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('skillBuilder.packSummaryTitle')}</CardTitle>
          <CardDescription>{t('skillBuilder.packSummaryDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('skillBuilder.packTitle')}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{packLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{tPlural(t, 'skillBuilder.skillsCount', pack.skills.length)}</Badge>
            <Badge variant="secondary">{t(`visibility.${pack.visibility}`)}</Badge>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const editor = (
    <div className="space-y-4 pb-12">
      <section id="step-pack-info" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('skillBuilder.packTitle')}</CardTitle>
              <StepHelp tooltip={t('help.skill.packInfo')} />
            </div>
            <CardDescription>{t('skillBuilder.packEditorDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={pack.title} onChange={(event) => setPack((prev) => ({...prev, title: event.target.value}))} placeholder={t('skillBuilder.packTitle')} />
            <Textarea
              value={pack.description}
              onChange={(event) => setPack((prev) => ({...prev, description: event.target.value}))}
              placeholder={t('skillBuilder.packDescription')}
            />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-700">{t('skillBuilder.visibilityLabel')}</span>
              <Select value={pack.visibility} onValueChange={(value: 'public' | 'private') => setPack((prev) => ({...prev, visibility: value}))}>
                <SelectTrigger className="w-full max-w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">{t('visibility.private')}</SelectItem>
                  <SelectItem value="public">{t('visibility.public')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="step-skills" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('nav.skillBuilder')}</CardTitle>
              <StepHelp tooltip={t('help.skill.skillList')} />
            </div>
            <CardDescription>{t('skillBuilder.skillListDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pack.skills.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title={t('skillBuilder.emptyTitle')}
                description={t('skillBuilder.empty')}
                primaryCTA={{label: t('skillBuilder.addSkill'), onClick: addSkill}}
                secondaryCTA={{label: t('skillBuilder.useTemplate'), onClick: addTemplateSkill}}
              />
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  {pack.skills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => setSelectedSkillId(skill.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition-all ${
                        selectedSkillId === skill.id ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-300' : 'border-slate-200 bg-white hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">{skill.name}</p>
                        {selectedSkillId === skill.id ? <Badge variant="secondary">{t('skillBuilder.editing')}</Badge> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{skill.description || t('skillBuilder.noDescription')}</p>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={addSkill}>{t('skillBuilder.addSkill')}</Button>
                  <Button variant="outline" onClick={addTemplateSkill}>
                    {t('skillBuilder.useTemplate')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section id="step-editor" className="scroll-mt-24">
        <Card glow className="builder-panel">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{t('skillBuilder.editor')}</CardTitle>
              <StepHelp tooltip={t('help.skill.editor')} />
            </div>
            <CardDescription>{t('skillBuilder.editorDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedSkill ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t('skillBuilder.editingSkill', {name: selectedSkill.name})}</p>
                    <p className="text-xs text-slate-500">{selectedSkill.description || t('skillBuilder.noDescription')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => duplicateSkill(selectedSkill.id)}>
                      {t('actions.duplicate')}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deleteSkill(selectedSkill.id)}>
                      {t('actions.delete')}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input value={selectedSkill.name} onChange={(event) => updateSkill({name: event.target.value})} placeholder={t('common.name')} />
                  <Input value={selectedSkill.description} onChange={(event) => updateSkill({description: event.target.value})} placeholder={t('common.description')} />
                  <Input
                    value={selectedSkill.tags.join(', ')}
                    onChange={(event) => updateSkill({tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean)})}
                    placeholder={t('common.tags')}
                  />
                  <Select value={selectedSkill.language} onValueChange={(value: 'es' | 'en' | 'both') => updateSkill({language: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">ES</SelectItem>
                      <SelectItem value="en">EN</SelectItem>
                      <SelectItem value="both">{t('skillBuilder.bothLanguages')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{t('skillBuilder.markdownContent')}</span>
                    <StepHelp tooltip={t('help.skill.markdown')} />
                  </div>
                  <Textarea value={selectedSkill.markdown} onChange={(event) => updateSkill({markdown: event.target.value})} className="min-h-[320px] font-mono text-sm" />
                </div>
              </div>
            ) : (
              <EmptyState
                icon={PackageOpen}
                title={t('skillBuilder.selectSkillTitle')}
                description={t('skillBuilder.selectSkill')}
                primaryCTA={pack.skills.length === 0 ? {label: t('skillBuilder.addSkill'), onClick: addSkill} : undefined}
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );

  const preview = (
    <PreviewPanel
      title={t('builderShell.previewTitle')}
      description={t('skillBuilder.previewDescription')}
      actions={[
        {
          id: 'copy',
          label: t('actions.copy'),
          onClick: () => {
            void copySelectedSkill();
          },
          disabled: !selectedSkill,
          icon: <Copy className="h-4 w-4" />,
        },
        {
          id: 'export',
          label: t('actions.export'),
          disabled: !hasMinimumFields,
          icon: <Download className="h-4 w-4" />,
          exportItems: [
            {id: 'md', label: t('actions.exportMd'), onSelect: exportMarkdown, disabled: !selectedSkill},
            {id: 'zip', label: t('skillBuilder.downloadPack'), onSelect: () => void exportZip(), disabled: !hasMinimumFields},
          ],
        },
      ]}
      tabs={[
        {
          id: 'text',
          label: t('builderShell.tabs.text'),
          content: (
            <pre className="max-h-[520px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
              {selectedSkill ? selectedSkill.markdown : t('skillBuilder.selectSkill')}
            </pre>
          ),
        },
        {
          id: 'markdown',
          label: t('builderShell.tabs.markdown'),
          content: (
            <pre className="max-h-[520px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
              {selectedSkill ? buildSkillMarkdown(selectedSkill) : t('skillBuilder.selectSkill')}
            </pre>
          ),
        },
        {
          id: 'bundle',
          label: t('builderShell.tabs.bundle'),
          content: (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{t('skillBuilder.bundleInfoTitle')}</p>
              <ul className="space-y-2">
                {getBundleSummary(pack, t).map((entry) => (
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
      title={t('skillBuilder.title')}
      subtitle={t('skillBuilder.subtitle')}
      counters={[
        {label: t('skillBuilder.packCounterLabel'), value: packLabel},
        {label: t('skillBuilder.skillsCounterLabel'), value: tPlural(t, 'skillBuilder.skillsCount', pack.skills.length)},
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
          label: t('actions.copy'),
          onClick: () => {
            void copySelectedSkill();
          },
          disabled: !selectedSkill,
          variant: 'outline',
          icon: <Copy className="h-4 w-4" />,
        },
        {
          id: 'export',
          label: t('actions.export'),
          disabled: !hasMinimumFields,
          icon: <Download className="h-4 w-4" />,
          exportItems: [
            {id: 'md', label: t('actions.exportMd'), onSelect: exportMarkdown, disabled: !selectedSkill},
            {id: 'zip', label: t('skillBuilder.downloadPack'), onSelect: () => void exportZip(), disabled: !hasMinimumFields},
          ],
        },
      ]}
      sidebar={sidebar}
      editor={editor}
      preview={preview}
    />
  );
}
