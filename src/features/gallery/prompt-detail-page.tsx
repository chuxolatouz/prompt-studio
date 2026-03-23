import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Link} from '@/i18n/navigation';
import type {AppLocale} from '@/i18n/routing';
import type {PublicPrompt} from '@/lib/public-prompts';
import {PublicPromptActions} from '@/features/gallery/public-prompt-actions';
import {getTranslations} from 'next-intl/server';

export async function PromptDetailPage({prompt, locale}: {prompt: PublicPrompt; locale?: AppLocale}) {
  const t = await getTranslations(locale ? {locale} : undefined);

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" className="hover:text-blue-700">
            {t('nav.home')}
          </Link>
          <span>/</span>
          <Link href="/prompts" className="hover:text-blue-700">
            {t('gallery.title')}
          </Link>
          <span>/</span>
          <span className="text-slate-700">{prompt.title}</span>
        </div>
      </nav>

      <article className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{prompt.title}</CardTitle>
            <CardDescription>
              {t('gallery.publishedBy', {name: prompt.authorName || t('gallery.anonymous')})} · {new Date(prompt.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Link href={`/prompts/macro/${encodeURIComponent(prompt.macro)}`}>
                <Badge>{t('gallery.macroBadge', {macro: prompt.macro})}</Badge>
              </Link>
              {prompt.tags.map((tag) => (
                <Link key={tag} href={`/prompts/tag/${encodeURIComponent(tag)}`}>
                  <Badge variant="secondary">{tag}</Badge>
                </Link>
              ))}
            </div>

            <p className="text-sm leading-relaxed text-slate-700">{prompt.excerpt}</p>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-50">
              <pre className="whitespace-pre-wrap font-mono leading-relaxed">{prompt.outputPrompt}</pre>
            </div>

            <PublicPromptActions
              item={{
                id: prompt.id,
                slug: prompt.slug,
                title: prompt.title,
                structure: prompt.structure,
                tags: prompt.tags,
                outputPrompt: prompt.outputPrompt,
                favoritesCount: prompt.favoritesCount,
              }}
              returnTo={`/p/${prompt.slug}`}
            />
          </CardContent>
        </Card>
      </article>
    </div>
  );
}
