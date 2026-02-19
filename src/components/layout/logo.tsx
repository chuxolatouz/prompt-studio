import Image from 'next/image';
import {cn} from '@/lib/utils';

type LogoProps = {
  variant?: 'full' | 'icon';
  size?: number;
  className?: string;
  priority?: boolean;
};

export function Logo({variant = 'full', size, className, priority = false}: LogoProps) {
  if (variant === 'icon') {
    const iconSize = size ?? 32;
    return (
      <Image
        src="/brand/prompteero-icon.png"
        alt="prompteero"
        width={iconSize}
        height={iconSize}
        className={cn('h-auto w-auto rounded-md object-cover', className)}
        priority={priority}
      />
    );
  }

  const width = size ?? 180;
  const height = Math.round(width * (266 / 1024));

  return (
    <Image
      src="/brand/prompteero-logo-primary.png"
      alt="prompteero"
      width={width}
      height={height}
      className={cn('h-auto w-auto object-contain', className)}
      priority={priority}
    />
  );
}
