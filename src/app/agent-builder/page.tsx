import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import {AgentBuilderPage} from '@/features/agent-builder/agent-builder-page';
import type {AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;

  return buildMetadata({
    locale,
    pathname: '/agent-builder',
    title: seoCopy[locale].agentBuilderTitle,
    description: seoCopy[locale].agentBuilderDescription,
  });
}

export default function AgentBuilderRoute() {
  return <AgentBuilderPage />;
}
