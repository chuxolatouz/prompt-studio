'use client';

import {useTranslations} from 'next-intl';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {HeaderActions} from '@/components/builder/HeaderActions';
import type {BuilderAction, PreviewTab} from '@/components/builder/types';

export function PreviewPanel({
  title,
  description,
  tabs,
  actions = [],
  defaultTab,
}: {
  title: string;
  description?: string;
  tabs: PreviewTab[];
  actions?: BuilderAction[];
  defaultTab?: string;
}) {
  const t = useTranslations();
  const activeDefaultTab = defaultTab ?? tabs[0]?.id;

  return (
    <Card glow className="builder-panel overflow-hidden border-blue-100 shadow-lg">
      <CardHeader className="gap-3 border-b border-slate-100 bg-slate-50/70">
        <div className="space-y-1">
          <CardTitle className="text-sm">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions.length > 0 ? <HeaderActions actions={actions} className="justify-start" /> : null}
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <Tabs defaultValue={activeDefaultTab} className="space-y-4">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
        {tabs.length === 0 ? <p className="text-sm text-slate-500">{t('common.loading')}</p> : null}
      </CardContent>
    </Card>
  );
}
