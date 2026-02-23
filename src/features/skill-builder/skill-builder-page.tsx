'use client';

import {useMemo, useState} from 'react';
import JSZip from 'jszip';
import {CheckCircle2} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {StepHelp} from '@/components/ui/step-help';
import {tPlural} from '@/i18n/helpers';
import {readLocal, storageKeys, writeLocal} from '@/lib/storage';
import {downloadBlob, slugify} from '@/lib/utils';
import {skillPackSchema, SkillPack} from '@/lib/schemas';
import {toast} from 'sonner';

function buildSkillMarkdown(skill: SkillPack['skills'][number]) {
  return `---\nname: "${skill.name}"\ndescription: "${skill.description}"\ntags: [${skill.tags.map((tag) => `"${tag}"`).join(', ')}]\nversion: "0.1"\nlanguage: "${skill.language}"\n---\n\n${skill.markdown}`;
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
  const stepsMeta = [
    {id: 'step-pack-info', title: t('skillBuilder.packTitle'), complete: pack.title.trim().length > 0},
    {id: 'step-skills', title: t('nav.skillBuilder'), complete: pack.skills.length > 0},
    {id: 'step-editor', title: t('skillBuilder.editor'), complete: !!selectedSkill},
  ];

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
    setPack((prev) => ({...prev, skills: prev.skills.filter((skill) => skill.id !== id)}));
    setSelectedSkillId(null);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('skillBuilder.title')}</CardTitle>
          <CardDescription>{t('skillBuilder.subtitle')}</CardDescription>
        </CardHeader>
      </Card>

      {/* Sticky Toolbar */}
      <div className="sticky top-[58px] z-30 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:-mx-0 md:rounded-2xl md:border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-slate-800">{pack.title || t('skillBuilder.packTitle')}</span>
            <Badge variant="outline">{tPlural(t, 'skillBuilder.skillsCount', pack.skills.length)}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={saveLocal} disabled={!hasMinimumFields}>
              {t('actions.saveDraft')}
            </Button>
            <Button onClick={exportZip} disabled={!hasMinimumFields}>
              {t('skillBuilder.downloadPack')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Left Column: Vertical Steps */}
        <div className="space-y-6 pb-20">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('skillBuilder.stepsTitle')}</CardTitle>
              <CardDescription>{t('skillBuilder.stepsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {stepsMeta.map((step, index) => (
                  <a
                    key={step.id}
                    href={`#${step.id}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--prompteero-blue)]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {index + 1}
                      </span>
                      <span className="font-medium text-slate-800">{step.title}</span>
                    </span>
                    {step.complete ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <span className="text-xs text-slate-400">{t('promptBuilder.pending')}</span>}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Step 1: Pack Info */}
          <div id="step-pack-info" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">1</div>
              <h3 className="text-lg font-bold text-slate-800">{t('skillBuilder.packTitle')}</h3>
              <StepHelp tooltip={t('help.skill.packInfo')} />
            </div>
            <Card glow>
              <CardContent className="space-y-3 pt-6">
                <Input value={pack.title} onChange={(e) => setPack((prev) => ({...prev, title: e.target.value}))} placeholder={t('skillBuilder.packTitle')} />
                <Textarea value={pack.description} onChange={(e) => setPack((prev) => ({...prev, description: e.target.value}))} placeholder={t('skillBuilder.packDescription')} />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">{t('skillBuilder.visibilityLabel')}</span>
                  <Select value={pack.visibility} onValueChange={(value: 'public' | 'private') => setPack((prev) => ({...prev, visibility: value}))}>
                    <SelectTrigger className="w-[180px]">
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
          </div>

          {/* Step 2: Skills List */}
          <div id="step-skills" className="scroll-mt-24 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">2</div>
              <h3 className="text-lg font-bold text-slate-800">{t('nav.skillBuilder')}</h3>
              <StepHelp tooltip={t('help.skill.skillList')} />
            </div>
            <Card glow>
              <CardContent className="space-y-3 pt-6">
                <div className="space-y-2">
                  {pack.skills.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center text-slate-500">
                      <p className="text-sm font-semibold text-slate-900">{t('skillBuilder.emptyTitle')}</p>
                      <p className="mb-3 mt-1 text-sm text-slate-600">{t('skillBuilder.empty')}</p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button onClick={addSkill}>{t('skillBuilder.addSkill')}</Button>
                        <Button variant="outline" onClick={addTemplateSkill}>
                          {t('skillBuilder.useTemplate')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    pack.skills.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => setSelectedSkillId(skill.id)}
                        className={`w-full rounded-xl border p-3 text-left transition-all ${
                          selectedSkillId === skill.id ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-300' : 'border-slate-200 bg-white hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900">{skill.name}</p>
                          {selectedSkillId === skill.id && <Badge variant="secondary">{t('skillBuilder.editing')}</Badge>}
                        </div>
                        <p className="line-clamp-1 text-xs text-slate-500">{skill.description || t('skillBuilder.noDescription')}</p>
                      </button>
                    ))
                  )}
                </div>
                {pack.skills.length > 0 && (
                  <Button variant="outline" onClick={addSkill} className="w-full">
                    {t('skillBuilder.addSkill')}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Step 3: Editor */}
          {selectedSkill && (
            <div id="step-editor" className="scroll-mt-24 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">3</div>
                <h3 className="text-lg font-bold text-slate-800">{t('skillBuilder.editor')}</h3>
                <StepHelp tooltip={t('help.skill.editor')} />
              </div>
              <Card glow className="border-blue-200 bg-white">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {t('skillBuilder.editingSkill', {name: selectedSkill.name})}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => duplicateSkill(selectedSkill.id)}>
                        {t('actions.duplicate')}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deleteSkill(selectedSkill.id)}>
                        {t('actions.delete')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input value={selectedSkill.name} onChange={(e) => updateSkill({name: e.target.value})} placeholder={t('common.name')} />
                    <Input
                      value={selectedSkill.description}
                      onChange={(e) => updateSkill({description: e.target.value})}
                      placeholder={t('common.description')}
                    />
                    <Input
                      value={selectedSkill.tags.join(', ')}
                      onChange={(e) => updateSkill({tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean)})}
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{t('skillBuilder.markdownContent')}</span>
                      <StepHelp tooltip={t('help.skill.markdown')} />
                    </div>
                    <Textarea value={selectedSkill.markdown} onChange={(e) => updateSkill({markdown: e.target.value})} className="min-h-[300px] font-mono text-sm" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column: Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-[140px] space-y-4">
            <Card glow className="border-blue-100 bg-white shadow-lg">
              <CardHeader className="bg-slate-50/50 pb-3">
                <CardTitle className="text-sm">{t('skillBuilder.previewSkillMd')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {selectedSkill ? (
                  <pre className="max-h-[600px] overflow-y-auto whitespace-pre-wrap p-4 text-xs text-slate-700">
                    {buildSkillMarkdown(selectedSkill)}
                  </pre>
                ) : (
                  <div className="flex h-40 items-center justify-center p-4 text-sm text-slate-400">
                    {t('skillBuilder.selectSkill')}
                  </div>
                )}
              </CardContent>
              {selectedSkill && (
                <div className="border-t border-slate-100 p-3">
                   <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={async () => {
                        await navigator.clipboard.writeText(buildSkillMarkdown(selectedSkill));
                        toast.success(t('actions.copied'));
                      }}
                    >
                      {t('actions.copy')}
                    </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
