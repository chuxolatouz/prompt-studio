import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[color:var(--prompteero-blue)] text-white hover:bg-[#12548c] focus-visible:ring-[color:var(--prompteero-blue)]',
        secondary:
          'bg-[color:var(--prompteero-light)] text-[color:var(--prompteero-dark)] hover:bg-[#d8d8d8]',
        outline: 'border border-[color:var(--prompteero-light)] bg-white text-[color:var(--prompteero-dark)] hover:bg-slate-50',
        ghost: 'text-[color:var(--prompteero-mid)] hover:bg-slate-100',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
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
