import {cva, type VariantProps} from 'class-variance-authority';
import * as React from 'react';
import {cn} from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'bg-[color:var(--prompteero-orange)] text-white',
      secondary: 'bg-slate-100 text-[color:var(--prompteero-mid)]',
      outline: 'border border-[color:var(--prompteero-light)] text-[color:var(--prompteero-mid)]',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({className, variant, ...props}: BadgeProps) {
  return <div className={cn(badgeVariants({variant}), className)} {...props} />;
}

export {Badge, badgeVariants};
