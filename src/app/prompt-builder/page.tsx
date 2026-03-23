import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import {PromptBuilderPage} from '@/features/prompt-builder/prompt-builder-page';
import type {AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;

  return buildMetadata({
    locale,
    pathname: '/prompt-builder',
    title: seoCopy[locale].promptBuilderTitle,
    description: seoCopy[locale].promptBuilderDescription,
  });
}

export default function PromptBuilderRoute() {
  return <PromptBuilderPage />;
}
