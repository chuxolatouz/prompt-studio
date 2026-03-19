'use client';

import Link from 'next/link';
import {type FormEvent, useEffect, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/features/common/auth-context';
import {
  authResultFromError,
  buildAuthHref,
  getDefaultAuthDestination,
  parseAuthIntent,
  sanitizeNextPath,
  type AuthMode,
} from '@/lib/auth';
import {featureFlags} from '@/lib/feature-flags';
import {getSupabaseBrowserClient} from '@/lib/supabase';
import {cn} from '@/lib/utils';
import {toast} from 'sonner';

type FormMode = 'login' | 'register' | 'forgot' | 'recovery';
type FieldErrors = Partial<Record<'email' | 'password' | 'confirmPassword' | 'newPassword' | 'confirmNewPassword', string>>;
type FeedbackTone = 'info' | 'success' | 'error';
type RecoveryState = 'idle' | 'resolving' | 'ready' | 'invalid';
type FeedbackState = {
  tone: FeedbackTone;
  title?: string;
  description: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PasswordField({
  label,
  placeholder,
  value,
  onChange,
  error,
  show,
  onToggle,
  autoComplete,
  toggleLabel,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
  toggleLabel: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className={cn(error && 'border-red-300 focus-visible:ring-red-400', 'pr-20')}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-8 -translate-y-1/2 px-2 text-xs text-slate-600"
          onClick={onToggle}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="sr-only">{toggleLabel}</span>
        </Button>
      </div>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </label>
  );
}

function FeedbackBanner({feedback}: {feedback: FeedbackState | null}) {
  if (!feedback) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm',
        feedback.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        feedback.tone === 'info' && 'border-blue-200 bg-blue-50 text-blue-900',
        feedback.tone === 'error' && 'border-red-200 bg-red-50 text-red-900'
      )}
    >
      {feedback.title ? <p className="font-semibold">{feedback.title}</p> : null}
      <p className={cn(feedback.title && 'mt-1')}>{feedback.description}</p>
    </div>
  );
}

function PasswordRequirementHint({
  currentLength,
  minimum,
  pendingLabel,
  successLabel,
}: {
  currentLength: number;
  minimum: number;
  pendingLabel: string;
  successLabel: string;
}) {
  const meetsRequirement = currentLength >= minimum;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium',
        meetsRequirement ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'
      )}
    >
      <span className={cn('h-2.5 w-2.5 rounded-full', meetsRequirement ? 'bg-emerald-500' : 'bg-amber-500')} aria-hidden="true" />
      <p>{meetsRequirement ? successLabel : pendingLabel}</p>
    </div>
  );
}

export default function AuthPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {user, signIn, signUp, resetPassword, loading} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('idle');
  const queryMode = searchParams.get('mode');
  const intent = parseAuthIntent(searchParams.get('intent'));
  const nextParam = searchParams.get('next');
  const safeNextPath = nextParam ? sanitizeNextPath(nextParam, '') : '';
  const redirectPath = sanitizeNextPath(nextParam, getDefaultAuthDestination(intent));
  const [mode, setMode] = useState<FormMode>(() => {
    if (queryMode === 'register') return 'register';
    if (queryMode === 'forgot') return 'forgot';
    if (queryMode === 'recovery') return 'recovery';
    return 'login';
  });

  const title =
    mode === 'forgot'
      ? t('auth.forgotTitle')
      : mode === 'recovery'
        ? t('auth.recoveryTitle')
        : t(`auth.intents.${intent}.title`);
  const subtitle =
    mode === 'forgot'
      ? t('auth.forgotSubtitle')
      : mode === 'recovery'
        ? t('auth.recoverySubtitle')
        : t(`auth.intents.${intent}.subtitle`);
  const benefit = t(`auth.intents.${intent}.benefit`);
  const trimmedNewPasswordLength = newPassword.trim().length;

  useEffect(() => {
    if (queryMode === 'register') {
      setMode('register');
      return;
    }

    if (queryMode === 'forgot') {
      setMode('forgot');
      return;
    }

    if (queryMode === 'recovery') {
      setMode('recovery');
      return;
    }

    setMode('login');
  }, [queryMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.location.hash.includes('type=recovery')) return;
    setMode('recovery');
  }, []);

  useEffect(() => {
    setFieldErrors({});
    setFeedback(null);
  }, [mode, intent]);

  useEffect(() => {
    if (mode !== 'recovery') {
      setRecoveryState('idle');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setRecoveryState('invalid');
      setFeedback({tone: 'error', description: t('auth.recoveryLinkInvalid')});
      return;
    }

    let cancelled = false;

    const prepareRecoverySession = async () => {
      setRecoveryState('resolving');
      setFeedback({tone: 'info', description: t('auth.recoveryLinkPending')});

      const initResult = await supabase.auth.initialize();
      const {data, error} = await supabase.auth.getSession();

      if (cancelled) return;

      if (initResult.error || error || !data.session) {
        setRecoveryState('invalid');
        setFeedback({tone: 'error', description: t('auth.recoveryLinkInvalid')});
        return;
      }

      setRecoveryState('ready');
      setFeedback(null);
    };

    void prepareRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [mode, t]);

  useEffect(() => {
    if (mode === 'recovery') return;
    if (!user) return;
    router.replace(redirectPath);
  }, [mode, redirectPath, router, user]);

  const openMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setFieldErrors({});
    setFeedback(null);
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    router.replace(buildAuthHref(nextMode, {next: safeNextPath || undefined, intent}));
  };

  const updateField = (field: keyof FieldErrors, value: string, setter: (value: string) => void) => {
    setter(value);
    setFieldErrors((current) => ({...current, [field]: undefined}));
    setFeedback(null);
  };

  const validateEmail = (value: string) => {
    if (!value) return t('auth.emailRequired');
    if (!EMAIL_PATTERN.test(value)) return t('auth.emailInvalid');
    return undefined;
  };

  const validateAuthFields = () => {
    const nextErrors: FieldErrors = {};
    const trimmedEmail = email.trim();

    nextErrors.email = validateEmail(trimmedEmail);

    if (!password) {
      nextErrors.password = t('auth.passwordRequired');
    } else if (mode === 'register' && password.trim().length < 8) {
      nextErrors.password = t('auth.passwordTooShort');
    }

    if (mode === 'register') {
      if (!confirmPassword) {
        nextErrors.confirmPassword = t('auth.confirmPasswordRequired');
      } else if (password !== confirmPassword) {
        nextErrors.confirmPassword = t('auth.passwordMismatch');
      }
    }

    setFieldErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const validateForgotFields = () => {
    const nextErrors: FieldErrors = {email: validateEmail(email.trim())};
    setFieldErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const validateRecoveryFields = () => {
    const nextErrors: FieldErrors = {};

    if (!newPassword.trim()) {
      nextErrors.newPassword = t('auth.passwordRequired');
    } else if (newPassword.trim().length < 8) {
      nextErrors.newPassword = t('auth.passwordTooShort');
    }

    if (!confirmNewPassword.trim()) {
      nextErrors.confirmNewPassword = t('auth.confirmPasswordRequired');
    } else if (newPassword.trim() !== confirmNewPassword.trim()) {
      nextErrors.confirmNewPassword = t('auth.passwordMismatch');
    }

    setFieldErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const submitAccess = async () => {
    if (!validateAuthFields()) return;

    const trimmedEmail = email.trim();
    setPending(true);
    setFeedback(null);

    const result = mode === 'login' ? await signIn(trimmedEmail, password) : await signUp(trimmedEmail, password);

    setPending(false);

    if (result.status === 'success') {
      router.replace(redirectPath);
      return;
    }

    if (result.status === 'email_confirmation_required' && mode === 'register') {
      setFeedback({
        tone: 'info',
        title: t('auth.checkEmailTitle'),
        description: t('auth.emailConfirmationDescription', {email: trimmedEmail}),
      });
      return;
    }

    setFeedback({
      tone: 'error',
      description: t(result.messageKey || 'auth.genericError'),
    });
  };

  const sendRecoveryLink = async () => {
    if (!validateForgotFields()) return;

    const trimmedEmail = email.trim();
    setPending(true);
    setFeedback(null);

    const result = await resetPassword(trimmedEmail);
    setPending(false);

    if (result.status === 'success') {
      setFeedback({
        tone: 'success',
        title: t('auth.resetSentTitle'),
        description: t('auth.resetSentDescription', {email: trimmedEmail}),
      });
      return;
    }

    setFeedback({
      tone: 'error',
      description: t(result.messageKey || 'auth.genericError'),
    });
  };

  const updatePasswordFromRecovery = async () => {
    if (!validateRecoveryFields()) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFeedback({tone: 'error', description: t('auth.genericError')});
      return;
    }

    if (recoveryState !== 'ready') {
      setFeedback({tone: 'error', description: t('auth.recoveryLinkInvalid')});
      return;
    }

    const {data: sessionData, error: sessionError} = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      setRecoveryState('invalid');
      setFeedback({tone: 'error', description: t('auth.recoveryLinkInvalid')});
      return;
    }

    setPending(true);
    setFeedback(null);

    const {error} = await supabase.auth.updateUser({password: newPassword.trim()});
    const result = authResultFromError(error);

    setPending(false);

    if (result.status !== 'success') {
      setFeedback({
        tone: 'error',
        description: t(result.messageKey || 'auth.genericError'),
      });
      return;
    }

    toast.success(t('auth.passwordUpdated'));
    router.replace(redirectPath);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'forgot') {
      await sendRecoveryLink();
      return;
    }

    if (mode === 'recovery') {
      await updatePasswordFromRecovery();
      return;
    }

    await submitAccess();
  };

  if (!featureFlags.supabase) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('auth.title')}</CardTitle>
            <CardDescription>{t('auth.disabled')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/builders">{t('auth.exploreBuilders')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('common.loading')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (user && mode !== 'recovery') {
    return null;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1.15fr)_320px]">
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="space-y-4 border-b border-slate-100 bg-white">
          <div className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--prompteero-blue)]">
            {t('auth.optionalEyebrow')}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl text-slate-900">{title}</CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">{subtitle}</CardDescription>
          </div>
          {mode !== 'forgot' && mode !== 'recovery' ? (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{benefit}</p>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <FeedbackBanner feedback={feedback} />

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode !== 'forgot' && mode !== 'recovery' ? (
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={mode === 'login' ? 'default' : 'outline'} onClick={() => openMode('login')}>
                  {t('auth.login')}
                </Button>
                <Button type="button" variant={mode === 'register' ? 'default' : 'outline'} onClick={() => openMode('register')}>
                  {t('auth.register')}
                </Button>
              </div>
            ) : null}

            {mode !== 'recovery' ? (
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700">{t('auth.email')}</span>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => updateField('email', event.target.value, setEmail)}
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={cn(fieldErrors.email && 'border-red-300 focus-visible:ring-red-400')}
                />
                {fieldErrors.email ? <p className="text-xs font-medium text-red-600">{fieldErrors.email}</p> : null}
              </label>
            ) : null}

            {mode !== 'forgot' && mode !== 'recovery' ? (
              <PasswordField
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(value) => updateField('password', value, setPassword)}
                error={fieldErrors.password}
                show={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                toggleLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              />
            ) : null}

            {mode === 'register' ? (
              <PasswordField
                label={t('auth.confirmPassword')}
                placeholder={t('auth.passwordPlaceholder')}
                value={confirmPassword}
                onChange={(value) => updateField('confirmPassword', value, setConfirmPassword)}
                error={fieldErrors.confirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((current) => !current)}
                autoComplete="new-password"
                toggleLabel={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              />
            ) : null}

            {mode === 'recovery' ? (
              <>
                <PasswordField
                  label={t('auth.newPassword')}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={newPassword}
                  onChange={(value) => updateField('newPassword', value, setNewPassword)}
                  error={fieldErrors.newPassword}
                  show={showNewPassword}
                  onToggle={() => setShowNewPassword((current) => !current)}
                  autoComplete="new-password"
                  toggleLabel={showNewPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                />
                <PasswordRequirementHint
                  currentLength={trimmedNewPasswordLength}
                  minimum={8}
                  pendingLabel={t('auth.passwordRequirementHint', {count: trimmedNewPasswordLength})}
                  successLabel={t('auth.passwordRequirementReady')}
                />
                <PasswordField
                  label={t('auth.confirmPassword')}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={confirmNewPassword}
                  onChange={(value) => updateField('confirmNewPassword', value, setConfirmNewPassword)}
                  error={fieldErrors.confirmNewPassword}
                  show={showConfirmNewPassword}
                  onToggle={() => setShowConfirmNewPassword((current) => !current)}
                  autoComplete="new-password"
                  toggleLabel={showConfirmNewPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                />
              </>
            ) : null}

            <Button className="w-full" type="submit" disabled={pending || (mode === 'recovery' && recoveryState === 'resolving')}>
              {mode === 'login'
                ? pending
                  ? t('auth.loginPending')
                  : t('auth.login')
                : mode === 'register'
                  ? pending
                    ? t('auth.registerPending')
                    : t('auth.register')
                  : mode === 'forgot'
                    ? pending
                      ? t('auth.sendRecoveryPending')
                      : t('auth.sendRecovery')
                    : pending
                      ? t('auth.updatePasswordPending')
                      : t('auth.updatePassword')}
            </Button>

            {mode === 'login' ? (
              <button type="button" onClick={() => openMode('forgot')} className="text-xs font-medium text-blue-700 underline underline-offset-2">
                {t('auth.forgotPassword')}
              </button>
            ) : null}

            {mode === 'register' || mode === 'forgot' || mode === 'recovery' ? (
              <Button type="button" variant="outline" className="w-full" onClick={() => openMode('login')}>
                {t('auth.backToLogin')}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-gradient-to-br from-cyan-50 via-white to-emerald-50">
        <CardHeader className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--prompteero-blue)]">{t('auth.intentBenefitTitle')}</p>
          <CardTitle className="text-xl text-slate-900">{benefit}</CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-600">{t('auth.optionalHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
            <p className="text-sm font-semibold text-slate-900">{t(`auth.intents.${intent}.title`)}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t(`auth.intents.${intent}.subtitle`)}</p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/builders">{t('auth.exploreBuilders')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
