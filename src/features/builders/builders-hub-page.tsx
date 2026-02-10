import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {Bot, Puzzle, TextCursorInput} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';

export async function BuildersHubPage() {
  const t = await getTranslations();

  const items = [
    {
      href: '/prompt-builder',
      title: t('nav.promptBuilder'),
      description: t('buildersHub.promptDesc'),
      icon: TextCursorInput,
    },
    {
      href: '/skill-builder',
      title: t('nav.skillBuilder'),
      description: t('buildersHub.skillDesc'),
      icon: Puzzle,
    },
    {
      href: '/agent-builder',
      title: t('nav.agentBuilder'),
      description: t('buildersHub.agentDesc'),
      icon: Bot,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('buildersHub.title')}</CardTitle>
          <CardDescription>{t('buildersHub.subtitle')}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.href}>
              <CardHeader>
                <Icon className="h-10 w-10 text-blue-600" />
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={item.href}>{t('buildersHub.open')}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
