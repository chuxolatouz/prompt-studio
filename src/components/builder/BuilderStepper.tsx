'use client';

import {CheckCircle2} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {useBuilderShell} from '@/components/builder/BuilderShell';
import type {BuilderStep} from '@/components/builder/types';

export function BuilderStepper({
  title,
  description,
  steps,
  onStepSelect,
}: {
  title: string;
  description: string;
  steps: BuilderStep[];
  onStepSelect?: (stepId: string) => void;
}) {
  const t = useTranslations();
  const shell = useBuilderShell();

  return (
    <Card className="builder-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => {
                  shell?.setMobileSection('editor');
                  onStepSelect?.(step.id);
                }}
                className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--prompteero-blue)]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{step.title}</span>
                    {step.hint ? <span className="mt-1 block text-xs text-slate-500">{step.hint}</span> : null}
                  </span>
                </div>
                {step.complete ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('promptBuilder.complete')}
                  </span>
                ) : (
                  <Badge variant="secondary" className="shrink-0">
                    {t('promptBuilder.pending')}
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
