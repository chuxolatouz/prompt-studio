import type {Metadata} from 'next';
import {SkillBuilderPage} from '@/features/skill-builder/skill-builder-page';
import {isAppLocale, type AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const nextLocale: AppLocale = isAppLocale(locale) ? locale : 'es';

  return buildMetadata({
    locale: nextLocale,
    pathname: '/skill-builder',
    title: seoCopy[nextLocale].skillBuilderTitle,
    description: seoCopy[nextLocale].skillBuilderDescription,
  });
}

export default function LocalizedSkillBuilderPage() {
  return <SkillBuilderPage />;
}
