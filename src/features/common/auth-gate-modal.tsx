'use client';

import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Modal} from '@/components/ui/modal';

type AuthGateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo: string;
  action: 'publish' | 'favorite';
};

export function AuthGateModal({open, onOpenChange, returnTo, action}: AuthGateModalProps) {
  const t = useTranslations();
  const next = encodeURIComponent(`${returnTo}${returnTo.includes('?') ? '&' : '?'}action=${action}`);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('auth.requiredTitle')}
      description={t('auth.requiredDesc')}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button asChild>
            <Link href={`/auth?mode=login&next=${next}`}>{t('auth.loginToContinue')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/auth?mode=register&next=${next}`}>{t('auth.register')}</Link>
          </Button>
        </>
      }
    />
  );
}
