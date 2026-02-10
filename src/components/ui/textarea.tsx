import * as React from 'react';
import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
