'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {useAuth} from '@/features/common/auth-context';
import {featureFlags} from '@/lib/feature-flags';
import {getSupabaseBrowserClient} from '@/lib/supabase';
import {toast} from 'sonner';

type Report = {
  id: string;
  target_id: string;
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
};

export default function AdminPage() {
  const t = useTranslations();
  const {isAdmin, user} = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [hiddenReason, setHiddenReason] = useState('');

  useEffect(() => {
    if (!featureFlags.moderation || !user || !isAdmin) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.from('reports').select('id,target_id,reason,status,created_at').order('created_at', {ascending: false}).then(({data}) => {
      setReports((data as Report[]) ?? []);
    });
  }, [isAdmin, user]);

  const setPromptStatus = async (reportId: string, targetId: string, status: 'hidden' | 'active') => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const payload = status === 'hidden' ? {status, hidden_reason: hiddenReason || t('gallery.hiddenByAdmin')} : {status, hidden_reason: null};
    await supabase.from('prompts').update(payload).eq('id', targetId);
    await supabase.from('reports').update({status: 'resolved'}).eq('id', reportId);

    toast.success(t('admin.updated'));
    setReports((prev) => prev.map((report) => (report.id === reportId ? {...report, status: 'resolved'} : report)));
    setHiddenReason('');
  };

  if (!featureFlags.moderation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.title')}</CardTitle>
          <CardDescription>{t('admin.disabled')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!user || !isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.title')}</CardTitle>
          <CardDescription>{t('admin.forbidden')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.title')}</CardTitle>
          <CardDescription>{t('admin.subtitle')}</CardDescription>
        </CardHeader>
      </Card>
      {reports.length === 0 ? (
        <Card>
          <CardContent className="pt-4 text-sm text-slate-600">{t('admin.empty')}</CardContent>
        </Card>
      ) : (
        reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle className="text-base">{report.target_id}</CardTitle>
              <CardDescription>
                {new Date(report.created_at).toLocaleString()} · {report.status}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{report.reason}</p>
              <Input value={hiddenReason} onChange={(e) => setHiddenReason(e.target.value)} placeholder={t('admin.hiddenReason')} />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="destructive" onClick={() => setPromptStatus(report.id, report.target_id, 'hidden')}>
                  {t('admin.hidePrompt')}
                </Button>
                <Button variant="outline" onClick={() => setPromptStatus(report.id, report.target_id, 'active')}>
                  {t('admin.restorePrompt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
