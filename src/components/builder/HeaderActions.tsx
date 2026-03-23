'use client';

import {ChevronDown} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {cn} from '@/lib/utils';
import type {BuilderAction} from '@/components/builder/types';

export function HeaderActions({
  actions,
  className,
  size = 'sm',
}: {
  actions: BuilderAction[];
  className?: string;
  size?: 'sm' | 'default';
}) {
  if (actions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {actions.map((action) => {
        if (action.exportItems?.length) {
          return (
            <DropdownMenu key={action.id}>
              <DropdownMenuTrigger asChild>
                <Button variant={action.variant ?? 'outline'} size={size} disabled={action.disabled} title={action.title}>
                  {action.icon ? <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">{action.icon}</span> : null}
                  {action.label}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {action.exportItems.map((item) => (
                  <DropdownMenuItem key={item.id} disabled={item.disabled} onSelect={item.onSelect}>
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <Button
            key={action.id}
            variant={action.variant ?? 'outline'}
            size={size}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
          >
            {action.icon ? <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">{action.icon}</span> : null}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
