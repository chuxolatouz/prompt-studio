'use client';

import {HelpCircle} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';

interface StepHelpProps {
  tooltip: string;
}

export function StepHelp({tooltip}: StepHelpProps) {
  const t = useTranslations('common');

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={t('whatIsThis')}
            className="cursor-help rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
