'use client';

import {useAuth} from '@/features/common/auth-context';

export function ShowWhenLoggedOut({children}: {children: React.ReactNode}) {
  const {user, loading} = useAuth();
  if (loading || user) return null;
  return <>{children}</>;
}
