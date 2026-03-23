import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import {SkillBuilderPage} from '@/features/skill-builder/skill-builder-page';
import type {AppLocale} from '@/i18n/routing';
import {buildMetadata} from '@/lib/seo';
import {seoCopy} from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;

  return buildMetadata({
    locale,
    pathname: '/skill-builder',
    title: seoCopy[locale].skillBuilderTitle,
    description: seoCopy[locale].skillBuilderDescription,
  });
}

export default function SkillBuilderRoute() {
  return <SkillBuilderPage />;
}
