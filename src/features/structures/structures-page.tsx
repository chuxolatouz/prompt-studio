'use client';

import {useLocale, useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {StepHelp} from '@/components/ui/step-help';
import {Textarea} from '@/components/ui/textarea';
import {usePromptCatalog} from '@/features/common/use-prompt-catalog';
import {toast} from 'sonner';

export function StructuresPage() {
  const t = useTranslations();
  const locale = useLocale() as 'es' | 'en';
  const {structures} = usePromptCatalog(locale);

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

      {structures.map((structure) => {
        return (
          <Card key={structure.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>
                  {structure.id} - {structure.label}
                </span>
                <StepHelp tooltip={t('structuresPage.macroTooltip')} />
              </CardTitle>
              <CardDescription>{structure.whatIs}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="mb-1 text-sm font-semibold">{t('structuresPage.whenToUse')}</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {structure.whenToUse.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">{t('structuresPage.template')}</p>
                    <Button variant="outline" size="sm" onClick={() => copyText(structure.template)}>
                      {t('structuresPage.copyTemplate')}
                    </Button>
                  </div>
                  <Textarea value={structure.template} readOnly className="min-h-40" />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">{t('structuresPage.example')}</p>
                    <Button variant="outline" size="sm" onClick={() => copyText(structure.example)}>
                      {t('structuresPage.copyExample')}
                    </Button>
                  </div>
                  <Textarea value={structure.example} readOnly className="min-h-40" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
