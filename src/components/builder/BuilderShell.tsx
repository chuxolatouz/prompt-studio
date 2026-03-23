'use client';

import * as React from 'react';
import {useTranslations} from 'next-intl';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {BuilderHeader} from '@/components/builder/BuilderHeader';
import type {BuilderAction, BuilderCounter, BuilderMobileSection} from '@/components/builder/types';
import {cn} from '@/lib/utils';

type BuilderShellContextValue = {
  setMobileSection: (section: BuilderMobileSection) => void;
};

const BuilderShellContext = React.createContext<BuilderShellContextValue | null>(null);

export function useBuilderShell() {
  return React.useContext(BuilderShellContext);
}

export function BuilderShell({
  title,
  subtitle,
  counters = [],
  actions = [],
  sidebar,
  editor,
  preview,
  defaultMobileSection = 'editor',
  sidebarSticky = true,
  previewSticky = true,
}: {
  title: string;
  subtitle: string;
  counters?: BuilderCounter[];
  actions?: BuilderAction[];
  sidebar: React.ReactNode;
  editor: React.ReactNode;
  preview: React.ReactNode;
  defaultMobileSection?: BuilderMobileSection;
  sidebarSticky?: boolean;
  previewSticky?: boolean;
}) {
  const t = useTranslations();
  const [mobileSection, setMobileSection] = React.useState<BuilderMobileSection>(defaultMobileSection);

  return (
    <BuilderShellContext.Provider value={{setMobileSection}}>
      <div className="builder-shell space-y-6">
        <BuilderHeader title={title} subtitle={subtitle} counters={counters} actions={actions} />

        <div className="lg:hidden">
          <Tabs value={mobileSection} defaultValue={defaultMobileSection} onValueChange={(value) => setMobileSection(value as BuilderMobileSection)} className="space-y-4">
            <TabsList>
              <TabsTrigger value="sidebar">{t('builderShell.tabs.sidebar')}</TabsTrigger>
              <TabsTrigger value="editor">{t('builderShell.tabs.editor')}</TabsTrigger>
              <TabsTrigger value="preview">{t('builderShell.tabs.preview')}</TabsTrigger>
            </TabsList>
            <TabsContent value="sidebar" className="space-y-4">
              {sidebar}
            </TabsContent>
            <TabsContent value="editor" className="space-y-4">
              {editor}
            </TabsContent>
            <TabsContent value="preview" className="space-y-4">
              {preview}
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden gap-[var(--builder-gap)] lg:grid lg:grid-cols-[minmax(240px,var(--builder-sidebar))_minmax(0,1fr)_minmax(300px,var(--builder-preview))]">
          <aside className={cn('space-y-4', sidebarSticky && 'lg:sticky lg:top-[120px] lg:self-start')}>{sidebar}</aside>
          <section className="min-w-0 space-y-4">{editor}</section>
          <aside className={cn('space-y-4', previewSticky && 'lg:sticky lg:top-[120px] lg:self-start')}>{preview}</aside>
        </div>
      </div>
    </BuilderShellContext.Provider>
  );
}
