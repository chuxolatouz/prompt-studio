'use client';

import {AuthProvider} from '@/features/common/auth-context';
import {TooltipProvider} from '@/components/ui/tooltip';
import {Toaster} from 'sonner';

export function Providers({children}: {children: React.ReactNode}) {
  return (
    <AuthProvider>
      <TooltipProvider>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </TooltipProvider>
    </AuthProvider>
  );
}
