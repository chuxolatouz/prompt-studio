'use client';

import {AuthProvider} from '@/features/common/auth-context';
import {TooltipProvider} from '@/components/ui/tooltip';
import {CookieConsentBanner} from '@/components/layout/cookie-consent-banner';
import {Toaster} from 'sonner';

export function Providers({children}: {children: React.ReactNode}) {
  return (
    <AuthProvider>
      <TooltipProvider>
        {children}
        <CookieConsentBanner />
        <Toaster richColors position="top-right" closeButton />
      </TooltipProvider>
    </AuthProvider>
  );
}
