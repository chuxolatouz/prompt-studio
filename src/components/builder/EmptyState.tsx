'use client';

import {PackageOpen, Search, Sparkles, Wrench, type LucideIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Link} from '@/i18n/navigation';

const iconMap = {
  packageOpen: PackageOpen,
  search: Search,
  sparkles: Sparkles,
  wrench: Wrench,
} as const;

export function EmptyState({
  icon,
  iconName,
  title,
  description,
  primaryCTA,
  secondaryCTA,
}: {
  icon?: LucideIcon;
  iconName?: keyof typeof iconMap;
  title: string;
  description: string;
  primaryCTA?: {label: string; href?: string; onClick?: () => void};
  secondaryCTA?: {label: string; href?: string; onClick?: () => void};
}) {
  const Icon = icon ?? (iconName ? iconMap[iconName] : Search);

  return (
    <Card className="builder-panel border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[color:var(--prompteero-blue)]">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="max-w-md text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {primaryCTA ? (
            primaryCTA.href ? (
              <Button asChild>
                <Link href={primaryCTA.href}>{primaryCTA.label}</Link>
              </Button>
            ) : (
              <Button onClick={primaryCTA.onClick}>{primaryCTA.label}</Button>
            )
          ) : null}
          {secondaryCTA ? (
            secondaryCTA.href ? (
              <Button asChild variant="outline">
                <Link href={secondaryCTA.href}>{secondaryCTA.label}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondaryCTA.onClick}>
                {secondaryCTA.label}
              </Button>
            )
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
