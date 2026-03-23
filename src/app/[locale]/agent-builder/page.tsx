import type {Metadata} from 'next';
import {AgentBuilderPage} from '@/features/agent-builder/agent-builder-page';
import {isAppLocale, type AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';

  return buildMetadata({
    locale: nextLocale,
    pathname: '/agent-builder',
    title: seoCopy[nextLocale].agentBuilderTitle,
    description: seoCopy[nextLocale].agentBuilderDescription,
  });
}

export default function LocalizedAgentBuilderPage() {
  return <AgentBuilderPage />;
}
