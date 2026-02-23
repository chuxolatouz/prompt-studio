import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[color:var(--prompteero-blue)] !text-white shadow-sm hover:bg-[#0f4f87] hover:!text-white active:bg-[#0d4474] focus-visible:ring-[color:var(--prompteero-blue)]',
        secondary:
          'bg-slate-900 !text-white shadow-sm hover:bg-slate-800 hover:!text-white active:bg-slate-950 focus-visible:ring-slate-900',
        outline:
          'border border-slate-400 bg-white !text-slate-900 hover:border-[color:var(--prompteero-blue)] hover:bg-blue-50 hover:!text-slate-950 active:bg-blue-100 focus-visible:ring-[color:var(--prompteero-blue)]',
        ghost: '!text-slate-900 hover:bg-slate-200 hover:!text-slate-950 active:bg-slate-300 focus-visible:ring-[color:var(--prompteero-blue)]',
        destructive: 'bg-red-600 !text-white shadow-sm hover:bg-red-700 hover:!text-white active:bg-red-800 focus-visible:ring-red-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 rounded-xl px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant, size, asChild = false, ...props}, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({variant, size, className}))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export {Button, buttonVariants};
