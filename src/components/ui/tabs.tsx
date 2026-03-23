'use client';

import * as React from 'react';
import {cn} from '@/lib/utils';

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used inside <Tabs>.');
  }
  return context;
}

export function Tabs({
  children,
  defaultValue,
  value,
  onValueChange,
  className,
}: {
  children: React.ReactNode;
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [onValueChange, value]
  );

  return (
    <TabsContext.Provider value={{value: currentValue, setValue}}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({children, className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('inline-flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 p-1', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  children,
  value,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
}) {
  const context = useTabsContext();
  const active = context.value === value;

  return (
    <button
      type="button"
      className={cn(
        'flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--prompteero-blue)]',
        active ? 'bg-[color:var(--prompteero-blue)] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100',
        className
      )}
      onClick={() => context.setValue(value)}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  children,
  value,
  className,
  forceMount = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value: string;
  forceMount?: boolean;
}) {
  const context = useTabsContext();
  const active = context.value === value;

  if (!active && !forceMount) {
    return null;
  }

  return (
    <div className={cn(!active && 'hidden', className)} {...props}>
      {children}
    </div>
  );
}
