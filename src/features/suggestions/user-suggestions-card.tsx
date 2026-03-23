'use client';

import {useEffect, useMemo, useState} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Textarea} from '@/components/ui/textarea';
import {useAuth} from '@/features/common/auth-context';
import {usePromptCatalog} from '@/features/common/use-prompt-catalog';
import {Link} from '@/i18n/navigation';
import {buildAuthHref} from '@/lib/auth';
import {createUserSuggestion, listMySuggestions} from '@/lib/catalog';
import {LinkedEntityType, SuggestionCategory, UserSuggestionRecord} from '@/lib/schemas';
import {featureFlags} from '@/lib/feature-flags';
import {toast} from 'sonner';

type LinkedOption = {
  value: string;
  label: string;
};

export function UserSuggestionsCard() {
  const t = useTranslations();
  const locale = useLocale() as 'es' | 'en';
  const {user, isAdmin} = useAuth();
  const {structures, roles, paletteBlocks} = usePromptCatalog(locale);
  const [items, setItems] = useState<UserSuggestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('general');
  const [linkedEntityType, setLinkedEntityType] = useState<'none' | LinkedEntityType>('none');
  const [linkedEntityId, setLinkedEntityId] = useState('none');

  useEffect(() => {
    if (!user || isAdmin || !featureFlags.suggestions) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const next = await listMySuggestions(user.id);
      if (!cancelled) {
        setItems(next);
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, user]);

  const linkedOptions = useMemo<LinkedOption[]>(() => {
    if (linkedEntityType === 'structure') {
      return structures.map((item) => ({value: item.id, label: `${item.id} · ${item.label}`}));
    }
    if (linkedEntityType === 'role') {
      return roles.map((item) => ({value: item.id, label: item.label}));
    }
    if (linkedEntityType === 'palette_block') {
      return paletteBlocks.map((item) => ({value: item.id, label: `${item.title} · ${item.niche}`}));
    }
    return [];
  }, [linkedEntityType, paletteBlocks, roles, structures]);

  if (!featureFlags.suggestions) return null;

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('suggestions.title')}</CardTitle>
          <CardDescription>{t('suggestions.loginRequired')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={buildAuthHref('login', {next: '/dashboard', intent: 'account'})}>{t('auth.login')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('suggestions.adminTitle')}</CardTitle>
          <CardDescription>{t('suggestions.adminDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/admin">{t('suggestions.goToAdmin')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const submit = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error(t('suggestions.validation'));
      return;
    }

    try {
      setSubmitting(true);
      const {error} = await createUserSuggestion({
        title: title.trim(),
        message: message.trim(),
        category,
        linkedEntityType: linkedEntityType === 'none' ? null : linkedEntityType,
        linkedEntityId: linkedEntityId === 'none' ? null : linkedEntityId,
      });

      if (error) throw error;

      const next = await listMySuggestions(user.id);
      setItems(next);
      setTitle('');
      setMessage('');
      setCategory('general');
      setLinkedEntityType('none');
      setLinkedEntityId('none');
      toast.success(t('suggestions.submitted'));
    } catch (error) {
      console.error(error);
      toast.error(t('suggestions.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('suggestions.title')}</CardTitle>
          <CardDescription>{t('suggestions.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('suggestions.titlePlaceholder')} />
          <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('suggestions.messagePlaceholder')} />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">{t('suggestions.category')}</p>
              <Select value={category} onValueChange={(value) => setCategory(value as SuggestionCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('suggestions.category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t('suggestions.categories.general')}</SelectItem>
                  <SelectItem value="structure">{t('suggestions.categories.structure')}</SelectItem>
                  <SelectItem value="role">{t('suggestions.categories.role')}</SelectItem>
                  <SelectItem value="palette">{t('suggestions.categories.palette')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">{t('suggestions.linkType')}</p>
              <Select
                value={linkedEntityType}
                onValueChange={(value) => {
                  setLinkedEntityType(value as 'none' | LinkedEntityType);
                  setLinkedEntityId('none');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('suggestions.optionalLink')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('suggestions.noLink')}</SelectItem>
                  <SelectItem value="structure">{t('suggestions.linkTypes.structure')}</SelectItem>
                  <SelectItem value="role">{t('suggestions.linkTypes.role')}</SelectItem>
                  <SelectItem value="palette_block">{t('suggestions.linkTypes.paletteBlock')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {linkedEntityType !== 'none' ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">{t('suggestions.linkedItem')}</p>
              <Select value={linkedEntityId} onValueChange={setLinkedEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('suggestions.selectLinkedItem')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('suggestions.noLink')}</SelectItem>
                  {linkedOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? t('common.loading') : t('suggestions.submit')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('suggestions.historyTitle')}</CardTitle>
          <CardDescription>{t('suggestions.historyDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-slate-600">{t('common.loading')}</p> : null}
          {!loading && items.length === 0 ? <p className="text-sm text-slate-600">{t('suggestions.empty')}</p> : null}
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-700">{t(`suggestions.statuses.${item.status}`)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{item.message}</p>
              <p className="mt-2 text-xs text-slate-500">
                {t(`suggestions.categories.${item.category}`)}
                {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString(locale)}` : ''}
              </p>
              {item.adminNotes ? <p className="mt-2 text-xs text-slate-600">{t('suggestions.adminNotes')}: {item.adminNotes}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
