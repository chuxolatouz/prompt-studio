'use client';

import {AuthProvider} from '@/features/common/auth-context';
import {TooltipProvider} from '@/components/ui/tooltip';

export function Providers({children}: {children: React.ReactNode}) {
  return (
    <AuthProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </AuthProvider>
  );
}
