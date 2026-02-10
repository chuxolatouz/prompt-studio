'use client';

import {useMemo, useState} from 'react';
import JSZip from 'jszip';
import {useTranslations} from 'next-intl';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {readLocal, storageKeys, writeLocal} from '@/lib/storage';
import {downloadBlob, slugify} from '@/lib/utils';
import {skillPackSchema, SkillPack} from '@/lib/schemas';

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
        title: 'My Skill Pack',
        description: '',
        visibility: 'private',
        tags: [],
        skills: [],
      }
    );
  });
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(pack.skills[0]?.id ?? null);

  const selectedSkill = useMemo(() => pack.skills.find((skill) => skill.id === selectedSkillId) ?? null, [pack.skills, selectedSkillId]);

  const addSkill = () => {
    const skill = {
      id: crypto.randomUUID(),
      name: t('skillBuilder.newSkill'),
      description: '',
      tags: [],
      language: 'both' as const,
      markdown: '## Purpose\n\n## When to use\n\n## Steps\n\n## Examples\n\n## Output contract',
    };
    setPack((prev) => ({...prev, skills: [...prev.skills, skill]}));
    setSelectedSkillId(skill.id);
  };

  const duplicateSkill = (id: string) => {
    const source = pack.skills.find((skill) => skill.id === id);
    if (!source) return;
    const clone = {...source, id: crypto.randomUUID(), name: `${source.name} Copy`};
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
      alert(parsed.error.issues[0]?.message);
      return;
    }
    writeLocal(storageKeys.skillPacks, parsed.data);
    alert(t('skillBuilder.saved'));
  };

  const exportZip = async () => {
    const parsed = skillPackSchema.safeParse(pack);
    if (!parsed.success) {
      alert(parsed.error.issues[0]?.message);
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
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t('skillBuilder.title')}</CardTitle>
          <CardDescription>{t('skillBuilder.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={pack.title} onChange={(e) => setPack((prev) => ({...prev, title: e.target.value}))} placeholder={t('skillBuilder.packTitle')} />
          <Textarea value={pack.description} onChange={(e) => setPack((prev) => ({...prev, description: e.target.value}))} placeholder={t('skillBuilder.packDescription')} />
          <Select value={pack.visibility} onValueChange={(value: 'public' | 'private') => setPack((prev) => ({...prev, visibility: value}))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">{t('visibility.private')}</SelectItem>
              <SelectItem value="public">{t('visibility.public')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-2">
            <Button onClick={addSkill} className="w-full">
              {t('skillBuilder.addSkill')}
            </Button>
            <Button variant="outline" onClick={saveLocal} className="w-full">
              {t('actions.saveDraft')}
            </Button>
            <Button variant="secondary" onClick={exportZip} className="w-full">
              {t('skillBuilder.downloadPack')}
            </Button>
          </div>

          <div className="space-y-2">
            {pack.skills.length === 0 ? (
              <p className="text-sm text-slate-600">{t('skillBuilder.empty')}</p>
            ) : (
              pack.skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => setSelectedSkillId(skill.id)}
                  className={`w-full rounded-xl border p-2 text-left ${selectedSkillId === skill.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}
                >
                  <p className="text-sm font-semibold">{skill.name}</p>
                  <p className="text-xs text-slate-500">{skill.description || t('skillBuilder.noDescription')}</p>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('skillBuilder.editor')}</CardTitle>
          <CardDescription>{t('skillBuilder.editorHelp')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selectedSkill ? (
            <p className="text-sm text-slate-600">{t('skillBuilder.selectSkill')}</p>
          ) : (
            <>
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
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Textarea value={selectedSkill.markdown} onChange={(e) => updateSkill({markdown: e.target.value})} className="min-h-[280px]" />
              <div className="flex flex-wrap gap-2">
                {selectedSkill.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => duplicateSkill(selectedSkill.id)}>
                  {t('actions.duplicate')}
                </Button>
                <Button variant="destructive" onClick={() => deleteSkill(selectedSkill.id)}>
                  {t('actions.delete')}
                </Button>
              </div>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">SKILL.md</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">{buildSkillMarkdown(selectedSkill)}</pre>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
