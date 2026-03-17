'use client';

import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Modal} from '@/components/ui/modal';
import {appendAuthAction, buildAuthHref, type AuthIntent} from '@/lib/auth';

type AuthGateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo: string;
  action: 'publish' | 'favorite';
  intent: AuthIntent;
};

export function AuthGateModal({open, onOpenChange, returnTo, action, intent}: AuthGateModalProps) {
  const t = useTranslations();
  const nextPath = appendAuthAction(returnTo, action);
  const title = t(`auth.intents.${intent}.title`);
  const description = t(`auth.intents.${intent}.subtitle`);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button asChild>
            <Link href={buildAuthHref('login', {next: nextPath, intent})}>{t('auth.login')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={buildAuthHref('register', {next: nextPath, intent})}>{t('auth.register')}</Link>
          </Button>
        </>
      }
    />
  );
}
