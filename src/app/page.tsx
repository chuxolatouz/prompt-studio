import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {Bot, BrainCircuit, Heart, Puzzle, Sparkles, TextCursorInput, UserRoundPlus, WandSparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Logo} from '@/components/layout/logo';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {ParticleField} from '@/components/ui/particle-field';
import {ShowWhenLoggedOut} from '@/features/common/show-when-logged-out';

const cards = [
  {icon: TextCursorInput, key: 'landing.prompt', href: '/prompt-builder'},
  {icon: Puzzle, key: 'landing.skill', href: '/skill-builder'},
  {icon: Bot, key: 'landing.agent', href: '/agent-builder'},
];

export default async function Home() {
  const t = await getTranslations();

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-cyan-100 via-white to-emerald-100 p-5 sm:p-7">
        <ParticleField className="absolute inset-0 z-0" density="low" colorMode="brand-blue" />
        <div className="relative z-10">
          <Logo variant="full" size={220} className="mb-3" priority />
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">{t('landing.title')}</h1>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-700">{t('landing.subtitle')}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/builders">{t('landing.ctaBuilders')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/gallery">{t('landing.ctaGallery')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} glow>
              <CardHeader>
                <Icon className="h-10 w-10 text-blue-600" />
                <CardTitle>{t(`${card.key}.title`)}</CardTitle>
                <CardDescription>{t(`${card.key}.description`)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <Link href={card.href} className="inline-block text-xs font-semibold text-blue-700 underline underline-offset-2">
                  {t('landing.goToBuilder')}
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <ShowWhenLoggedOut>
        <section>
          <Card glow>
            <CardHeader>
              <UserRoundPlus className="h-10 w-10 text-[color:var(--prompteero-blue)]" />
              <CardTitle>{t('landing.account.title')}</CardTitle>
              <CardDescription>{t('landing.account.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/auth?mode=login">{t('auth.login')}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/auth?mode=register">{t('auth.register')}</Link>
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Link href="/auth?mode=login&next=/skill-builder" className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/30">
                  <p className="text-sm font-semibold text-slate-900">{t('landing.account.createSkillTitle')}</p>
                  <p className="mt-1 text-xs text-slate-600">{t('landing.account.createSkillDescription')}</p>
                </Link>
                <Link href="/auth?mode=login&next=/dashboard" className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/30">
                  <p className="text-sm font-semibold text-slate-900">{t('landing.account.saveTitle')}</p>
                  <p className="mt-1 text-xs text-slate-600">{t('landing.account.saveDescription')}</p>
                </Link>
                <Link href="/auth?mode=login&next=/gallery" className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/30">
                  <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                    <Heart className="h-4 w-4 text-[color:var(--prompteero-blue)]" />
                    {t('landing.account.likeTitle')}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{t('landing.account.likeDescription')}</p>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </ShowWhenLoggedOut>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card glow>
          <CardHeader>
            <Sparkles className="h-10 w-10 text-emerald-600" />
            <CardTitle>{t('landing.structures.title')}</CardTitle>
            <CardDescription>{t('landing.structures.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/structures">{t('landing.structures.cta')}</Link>
            </Button>
          </CardContent>
        </Card>
        <Card glow>
          <CardHeader>
            <WandSparkles className="h-10 w-10 text-orange-600" />
            <CardTitle>{t('landing.builders.title')}</CardTitle>
            <CardDescription>{t('landing.builders.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild>
              <Link href="/builders">{t('landing.builders.open')}</Link>
            </Button>
            <div className="flex flex-wrap gap-2">
              <Link href="/prompt-builder">
                <Badge variant="secondary">{t('nav.promptBuilder')}</Badge>
              </Link>
              <Link href="/skill-builder">
                <Badge variant="secondary">{t('nav.skillBuilder')}</Badge>
              </Link>
              <Link href="/agent-builder">
                <Badge variant="secondary">{t('nav.agentBuilder')}</Badge>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <BrainCircuit className="h-10 w-10 text-violet-600" />
            <CardTitle>{t('landing.differentialTitle')}</CardTitle>
            <CardDescription>{t('landing.differentialDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>{t('landing.diff1')}</p>
            <p>{t('landing.diff2')}</p>
            <p>{t('landing.diff3')}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
