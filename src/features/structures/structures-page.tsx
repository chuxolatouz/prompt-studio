'use client';

import {useTranslations} from 'next-intl';
import structures from '@/data/structures.json';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';

export function StructuresPage() {
  const t = useTranslations();

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(t('actions.copied'));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('structuresPage.title')}</CardTitle>
          <CardDescription>{t('structuresPage.subtitle')}</CardDescription>
        </CardHeader>
      </Card>

      {(structures as Array<any>).map((structure) => {
        const template = t(structure.templateKey);
        const example = t(structure.exampleKey);

        return (
          <Card key={structure.id}>
            <CardHeader>
              <CardTitle>
                {structure.id} - {t(structure.titleKey)}
              </CardTitle>
              <CardDescription>{t(structure.whatIsKey)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="mb-1 text-sm font-semibold">{t('structuresPage.whenToUse')}</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {structure.whenToUseKeys.map((key: string) => (
                    <li key={key}>{t(key)}</li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">{t('structuresPage.template')}</p>
                    <Button variant="outline" size="sm" onClick={() => copyText(template)}>
                      {t('structuresPage.copyTemplate')}
                    </Button>
                  </div>
                  <Textarea value={template} readOnly className="min-h-40" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">{t('structuresPage.example')}</p>
                    <Button variant="outline" size="sm" onClick={() => copyText(example)}>
                      {t('structuresPage.copyExample')}
                    </Button>
                  </div>
                  <Textarea value={example} readOnly className="min-h-40" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
