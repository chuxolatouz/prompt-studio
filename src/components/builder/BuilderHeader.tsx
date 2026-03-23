'use client';

import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {HeaderActions} from '@/components/builder/HeaderActions';
import type {BuilderAction, BuilderCounter} from '@/components/builder/types';

export function BuilderHeader({
  title,
  subtitle,
  counters = [],
  actions = [],
}: {
  title: string;
  subtitle: string;
  counters?: BuilderCounter[];
  actions?: BuilderAction[];
}) {
  return (
    <Card className="builder-surface border-[color:var(--builder-border-strong)] bg-[color:var(--builder-surface)]">
      <CardHeader className="gap-4 border-b border-slate-100 bg-[color:var(--builder-hero)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl text-slate-900">{title}</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</CardDescription>
          </div>
          <HeaderActions actions={actions} />
        </div>
      </CardHeader>
      {counters.length > 0 ? (
        <CardContent className="flex flex-wrap gap-2 pt-4">
          {counters.map((counter) => (
            <Badge key={`${counter.label}-${counter.value}`} variant="secondary" className="gap-1 rounded-full px-3 py-1 text-xs font-medium">
              <span className="text-slate-500">{counter.label}</span>
              <span className="text-slate-900">{counter.value}</span>
            </Badge>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}
