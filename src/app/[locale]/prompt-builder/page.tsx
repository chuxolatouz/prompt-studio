import type {Metadata} from 'next';
import {PromptBuilderPage} from '@/features/prompt-builder/prompt-builder-page';
import {isAppLocale, type AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';

  return buildMetadata({
    locale: nextLocale,
    pathname: '/prompt-builder',
    title: seoCopy[nextLocale].promptBuilderTitle,
    description: seoCopy[nextLocale].promptBuilderDescription,
  });
}

export default function LocalizedPromptBuilderPage() {
  return <PromptBuilderPage />;
}
