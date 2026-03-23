'use client';

import {useEffect, useMemo, useState} from 'react';
import {ChevronLeft, ChevronRight, Plus, Search, Settings2} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Modal} from '@/components/ui/modal';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Textarea} from '@/components/ui/textarea';
import {useAuth} from '@/features/common/auth-context';
import {usePromptCatalog} from '@/features/common/use-prompt-catalog';
import {
  deletePromptPaletteBlock,
  deletePromptRole,
  deletePromptStructure,
  listAdminSuggestions,
  updateSuggestionStatus,
  upsertPromptPaletteBlock,
  upsertPromptRole,
  upsertPromptStructure,
} from '@/lib/catalog';
import {featureFlags} from '@/lib/feature-flags';
import {
  PromptPaletteBlockRecord,
  PromptRoleRecord,
  PromptStructureRecord,
  SuggestionStatus,
  UserSuggestionRecord,
} from '@/lib/schemas';
import {getSupabaseBrowserClient} from '@/lib/supabase';
import {slugify} from '@/lib/utils';
import {toast} from 'sonner';

type Report = {
  id: string;
  target_id: string;
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
};

type StructureFormState = {
  id: string;
  labelEs: string;
  labelEn: string;
  whatIsEs: string;
  whatIsEn: string;
  whenToUseEs: string;
  whenToUseEn: string;
  templateEs: string;
  templateEn: string;
  exampleEs: string;
  exampleEn: string;
  sections: string;
  columnOrder: string;
  sortOrder: string;
  isActive: boolean;
};

type RoleFormState = {
  id: string;
  labelEs: string;
  labelEn: string;
  descriptionEs: string;
  descriptionEn: string;
  icon: string;
  sortOrder: string;
  isActive: boolean;
};

type PaletteFormState = {
  id: string;
  titleEs: string;
  titleEn: string;
  contentEs: string;
  contentEn: string;
  niche: string;
  structure: string;
  targetColumn: string;
  level: 'basic' | 'intermediate' | 'advanced';
  tags: string;
  image: string;
  sortOrder: string;
  isActive: boolean;
};

const SEGMENT_OPTIONS = ['role', 'goal', 'context', 'inputs', 'constraints', 'output-format', 'examples'];
const PAGE_SIZE = 6;
type AdminTabKey = 'moderation' | 'structures' | 'roles' | 'palette' | 'suggestions';

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitComma(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function paginateItems<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalItems: items.length,
  };
}

function AdminListControls({
  query,
  onQueryChange,
  onPrevPage,
  onNextPage,
  page,
  totalPages,
  totalItems,
  placeholder,
  resultsLabel,
  prevLabel,
  nextLabel,
  pageLabel,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  page: number;
  totalPages: number;
  totalItems: number;
  placeholder: string;
  resultsLabel: string;
  prevLabel: string;
  nextLabel: string;
  pageLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} className="pl-9" />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{resultsLabel.replace('{count}', String(totalItems))}</span>
        <span>{pageLabel.replace('{page}', String(page)).replace('{total}', String(totalPages))}</span>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrevPage}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          {prevLabel}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNextPage}>
          {nextLabel}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function toStructureForm(record?: PromptStructureRecord): StructureFormState {
  if (!record) {
    return {
      id: '',
      labelEs: '',
      labelEn: '',
      whatIsEs: '',
      whatIsEn: '',
      whenToUseEs: '',
      whenToUseEn: '',
      templateEs: '',
      templateEn: '',
      exampleEs: '',
      exampleEn: '',
      sections: '',
      columnOrder: 'role, goal, context, inputs, constraints, output-format, examples',
      sortOrder: '0',
      isActive: true,
    };
  }

  return {
    id: record.id,
    labelEs: record.localizedLabel.es,
    labelEn: record.localizedLabel.en,
    whatIsEs: record.localizedWhatIs.es,
    whatIsEn: record.localizedWhatIs.en,
    whenToUseEs: record.localizedWhenToUse.es.join('\n'),
    whenToUseEn: record.localizedWhenToUse.en.join('\n'),
    templateEs: record.localizedTemplate.es,
    templateEn: record.localizedTemplate.en,
    exampleEs: record.localizedExample.es,
    exampleEn: record.localizedExample.en,
    sections: record.sections.join(', '),
    columnOrder: record.columnOrder.join(', '),
    sortOrder: String(record.sortOrder),
    isActive: record.isActive,
  };
}

function toRoleForm(record?: PromptRoleRecord): RoleFormState {
  if (!record) {
    return {
      id: '',
      labelEs: '',
      labelEn: '',
      descriptionEs: '',
      descriptionEn: '',
      icon: 'Sparkles',
      sortOrder: '0',
      isActive: true,
    };
  }

  return {
    id: record.id,
    labelEs: record.localizedLabel.es,
    labelEn: record.localizedLabel.en,
    descriptionEs: record.localizedDescription.es,
    descriptionEn: record.localizedDescription.en,
    icon: record.icon,
    sortOrder: String(record.sortOrder),
    isActive: record.isActive,
  };
}

function toPaletteForm(record?: PromptPaletteBlockRecord): PaletteFormState {
  if (!record) {
    return {
      id: '',
      titleEs: '',
      titleEn: '',
      contentEs: '',
      contentEn: '',
      niche: '',
      structure: 'RTF',
      targetColumn: 'context',
      level: 'basic',
      tags: '',
      image: '',
      sortOrder: '0',
      isActive: true,
    };
  }

  return {
    id: record.id,
    titleEs: record.localizedTitle.es,
    titleEn: record.localizedTitle.en,
    contentEs: record.localizedContent.es,
    contentEn: record.localizedContent.en,
    niche: record.niche,
    structure: record.structure,
    targetColumn: record.targetColumn,
    level: record.level,
    tags: record.tags.join(', '),
    image: record.image,
    sortOrder: String(record.sortOrder),
    isActive: record.isActive,
  };
}

export default function AdminPage() {
  const t = useTranslations();
  const locale = useLocale() as 'es' | 'en';
  const {isAdmin, user} = useAuth();
  const {structures, roles, paletteBlocks, refresh} = usePromptCatalog(locale, {includeInactive: true});
  const [reports, setReports] = useState<Report[]>([]);
  const [suggestions, setSuggestions] = useState<UserSuggestionRecord[]>([]);
  const [reportReasons, setReportReasons] = useState<Record<string, string>>({});
  const [suggestionNotes, setSuggestionNotes] = useState<Record<string, string>>({});

  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [paletteModalOpen, setPaletteModalOpen] = useState(false);
  const [structureForm, setStructureForm] = useState<StructureFormState>(toStructureForm());
  const [roleForm, setRoleForm] = useState<RoleFormState>(toRoleForm());
  const [paletteForm, setPaletteForm] = useState<PaletteFormState>(toPaletteForm());
  const [queries, setQueries] = useState<Record<AdminTabKey, string>>({
    moderation: '',
    structures: '',
    roles: '',
    palette: '',
    suggestions: '',
  });
  const [pages, setPages] = useState<Record<AdminTabKey, number>>({
    moderation: 1,
    structures: 1,
    roles: 1,
    palette: 1,
    suggestions: 1,
  });

  const isEnabled = featureFlags.catalogAdmin && featureFlags.moderation && featureFlags.suggestions;

  const setQuery = (tab: AdminTabKey, value: string) => {
    setQueries((prev) => ({...prev, [tab]: value}));
    setPages((prev) => ({...prev, [tab]: 1}));
  };

  const goToPage = (tab: AdminTabKey, nextPage: number) => {
    setPages((prev) => ({...prev, [tab]: Math.max(1, nextPage)}));
  };

  const reloadAdminData = async () => {
    if (!user || !isAdmin) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const [{data: reportData}, nextSuggestions] = await Promise.all([
      supabase.from('reports').select('id,target_id,reason,status,created_at').order('created_at', {ascending: false}),
      listAdminSuggestions(),
    ]);

    setReports((reportData as Report[]) ?? []);
    setSuggestions(nextSuggestions);
  };

  useEffect(() => {
    if (!isEnabled || !user || !isAdmin) return;
    void reloadAdminData();
  }, [isAdmin, isEnabled, user]);

  const activeStructures = useMemo(() => structures.filter((item) => item.isActive), [structures]);

  const moderationView = useMemo(() => {
    const query = queries.moderation.trim().toLowerCase();
    const filtered = reports.filter((item) => `${item.target_id} ${item.reason} ${item.status}`.toLowerCase().includes(query));
    return paginateItems(filtered, pages.moderation);
  }, [pages.moderation, queries.moderation, reports]);

  const structuresView = useMemo(() => {
    const query = queries.structures.trim().toLowerCase();
    const filtered = structures.filter((item) => `${item.id} ${item.label} ${item.whatIs} ${item.columnOrder.join(' ')}`.toLowerCase().includes(query));
    return paginateItems(filtered, pages.structures);
  }, [pages.structures, queries.structures, structures]);

  const rolesView = useMemo(() => {
    const query = queries.roles.trim().toLowerCase();
    const filtered = roles.filter((item) => `${item.id} ${item.label} ${item.icon} ${item.description}`.toLowerCase().includes(query));
    return paginateItems(filtered, pages.roles);
  }, [pages.roles, queries.roles, roles]);

  const paletteView = useMemo(() => {
    const query = queries.palette.trim().toLowerCase();
    const filtered = paletteBlocks.filter((item) =>
      `${item.id} ${item.title} ${item.content} ${item.niche} ${item.structure} ${item.targetColumn} ${item.tags.join(' ')}`.toLowerCase().includes(query)
    );
    return paginateItems(filtered, pages.palette);
  }, [pages.palette, paletteBlocks, queries.palette]);

  const suggestionsView = useMemo(() => {
    const query = queries.suggestions.trim().toLowerCase();
    const filtered = suggestions.filter((item) =>
      `${item.title} ${item.message} ${item.category} ${item.status} ${item.linkedEntityId ?? ''}`.toLowerCase().includes(query)
    );
    return paginateItems(filtered, pages.suggestions);
  }, [pages.suggestions, queries.suggestions, suggestions]);

  const setPromptStatus = async (reportId: string, targetId: string, status: 'hidden' | 'active') => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const hiddenReason = reportReasons[reportId] || t('admin.hiddenByAdmin');
    const payload = status === 'hidden' ? {status, hidden_reason: hiddenReason} : {status, hidden_reason: null};

    await supabase.from('prompts').update(payload).eq('id', targetId);
    await supabase.from('reports').update({status: 'resolved'}).eq('id', reportId);

    toast.success(t('admin.updated'));
    await reloadAdminData();
  };

  const saveStructure = async () => {
    const id = structureForm.id.trim() || slugify(structureForm.labelEn || structureForm.labelEs).toUpperCase();
    if (!id || !structureForm.labelEs.trim() || !structureForm.labelEn.trim()) {
      toast.error(t('admin.validation'));
      return;
    }

    const record: PromptStructureRecord = {
      id,
      label: locale === 'es' ? structureForm.labelEs.trim() : structureForm.labelEn.trim(),
      localizedLabel: {es: structureForm.labelEs.trim(), en: structureForm.labelEn.trim()},
      whatIs: locale === 'es' ? structureForm.whatIsEs.trim() : structureForm.whatIsEn.trim(),
      localizedWhatIs: {es: structureForm.whatIsEs.trim(), en: structureForm.whatIsEn.trim()},
      whenToUse: locale === 'es' ? splitLines(structureForm.whenToUseEs) : splitLines(structureForm.whenToUseEn),
      localizedWhenToUse: {es: splitLines(structureForm.whenToUseEs), en: splitLines(structureForm.whenToUseEn)},
      template: locale === 'es' ? structureForm.templateEs.trim() : structureForm.templateEn.trim(),
      localizedTemplate: {es: structureForm.templateEs.trim(), en: structureForm.templateEn.trim()},
      example: locale === 'es' ? structureForm.exampleEs.trim() : structureForm.exampleEn.trim(),
      localizedExample: {es: structureForm.exampleEs.trim(), en: structureForm.exampleEn.trim()},
      sections: splitComma(structureForm.sections),
      columnOrder: splitComma(structureForm.columnOrder).filter((item) => SEGMENT_OPTIONS.includes(item)),
      sortOrder: Number(structureForm.sortOrder || 0),
      isActive: structureForm.isActive,
    };

    const {error} = await upsertPromptStructure(record);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t('admin.saved'));
    setStructureModalOpen(false);
    setStructureForm(toStructureForm());
    await refresh();
  };

  const saveRole = async () => {
    const id = roleForm.id.trim() || slugify(roleForm.labelEn || roleForm.labelEs);
    if (!id || !roleForm.labelEs.trim() || !roleForm.labelEn.trim()) {
      toast.error(t('admin.validation'));
      return;
    }

    const record: PromptRoleRecord = {
      id,
      label: locale === 'es' ? roleForm.labelEs.trim() : roleForm.labelEn.trim(),
      localizedLabel: {es: roleForm.labelEs.trim(), en: roleForm.labelEn.trim()},
      icon: roleForm.icon.trim() || 'Sparkles',
      description: locale === 'es' ? roleForm.descriptionEs.trim() : roleForm.descriptionEn.trim(),
      localizedDescription: {es: roleForm.descriptionEs.trim(), en: roleForm.descriptionEn.trim()},
      sortOrder: Number(roleForm.sortOrder || 0),
      isActive: roleForm.isActive,
    };

    const {error} = await upsertPromptRole(record);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t('admin.saved'));
    setRoleModalOpen(false);
    setRoleForm(toRoleForm());
    await refresh();
  };

  const savePaletteBlock = async () => {
    const id = paletteForm.id.trim() || slugify(paletteForm.titleEn || paletteForm.titleEs);
    if (!id || !paletteForm.titleEs.trim() || !paletteForm.titleEn.trim() || !paletteForm.structure) {
      toast.error(t('admin.validation'));
      return;
    }

    const record: PromptPaletteBlockRecord = {
      id,
      title: locale === 'es' ? paletteForm.titleEs.trim() : paletteForm.titleEn.trim(),
      localizedTitle: {es: paletteForm.titleEs.trim(), en: paletteForm.titleEn.trim()},
      content: locale === 'es' ? paletteForm.contentEs.trim() : paletteForm.contentEn.trim(),
      localizedContent: {es: paletteForm.contentEs.trim(), en: paletteForm.contentEn.trim()},
      niche: paletteForm.niche.trim() || 'general',
      structure: paletteForm.structure,
      targetColumn: paletteForm.targetColumn,
      level: paletteForm.level,
      tags: splitComma(paletteForm.tags),
      image: paletteForm.image.trim(),
      sortOrder: Number(paletteForm.sortOrder || 0),
      isActive: paletteForm.isActive,
    };

    const {error} = await upsertPromptPaletteBlock(record);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t('admin.saved'));
    setPaletteModalOpen(false);
    setPaletteForm(toPaletteForm());
    await refresh();
  };

  const updateSuggestion = async (id: string, status: SuggestionStatus) => {
    const {error} = await updateSuggestionStatus(id, status, suggestionNotes[id]);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t('admin.updated'));
    await reloadAdminData();
  };

  if (!isEnabled) {
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
      <Card className="border-[color:var(--prompteero-light)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-[color:var(--prompteero-blue)]" />
            <CardTitle>{t('admin.title')}</CardTitle>
          </div>
          <CardDescription>{t('admin.subtitle')}</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="moderation" className="space-y-4">
        <TabsList className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <TabsTrigger value="moderation">{t('admin.tabs.moderation')}</TabsTrigger>
          <TabsTrigger value="structures">{t('admin.tabs.structures')}</TabsTrigger>
          <TabsTrigger value="roles">{t('admin.tabs.roles')}</TabsTrigger>
          <TabsTrigger value="palette">{t('admin.tabs.palette')}</TabsTrigger>
          <TabsTrigger value="suggestions">{t('admin.tabs.suggestions')}</TabsTrigger>
        </TabsList>

        <TabsContent value="moderation" className="space-y-4">
          <AdminListControls
            query={queries.moderation}
            onQueryChange={(value) => setQuery('moderation', value)}
            onPrevPage={() => goToPage('moderation', moderationView.page - 1)}
            onNextPage={() => goToPage('moderation', moderationView.page + 1)}
            page={moderationView.page}
            totalPages={moderationView.totalPages}
            totalItems={moderationView.totalItems}
            placeholder={t('admin.searchModeration')}
            resultsLabel={t('admin.results', {count: '{count}'})}
            prevLabel={t('admin.prev')}
            nextLabel={t('admin.next')}
            pageLabel={t('admin.pageIndicator', {page: '{page}', total: '{total}'})}
          />
          {moderationView.totalItems === 0 ? (
            <Card>
              <CardContent className="pt-4 text-sm text-slate-600">{t('admin.empty')}</CardContent>
            </Card>
          ) : (
            moderationView.items.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{report.target_id}</CardTitle>
                  <CardDescription>
                    {new Date(report.created_at).toLocaleString(locale)} · {report.status}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-slate-700">{report.reason}</p>
                  <Input
                    value={reportReasons[report.id] ?? ''}
                    onChange={(event) => setReportReasons((prev) => ({...prev, [report.id]: event.target.value}))}
                    placeholder={t('admin.hiddenReason')}
                  />
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
        </TabsContent>

        <TabsContent value="structures" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setStructureForm(toStructureForm());
                setStructureModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addStructure')}
            </Button>
          </div>
          <AdminListControls
            query={queries.structures}
            onQueryChange={(value) => setQuery('structures', value)}
            onPrevPage={() => goToPage('structures', structuresView.page - 1)}
            onNextPage={() => goToPage('structures', structuresView.page + 1)}
            page={structuresView.page}
            totalPages={structuresView.totalPages}
            totalItems={structuresView.totalItems}
            placeholder={t('admin.searchStructures')}
            resultsLabel={t('admin.results', {count: '{count}'})}
            prevLabel={t('admin.prev')}
            nextLabel={t('admin.next')}
            pageLabel={t('admin.pageIndicator', {page: '{page}', total: '{total}'})}
          />
          <div className="grid gap-4">
            {structuresView.items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{item.id} · {item.label}</CardTitle>
                  <CardDescription>
                    {item.isActive ? t('admin.active') : t('admin.inactive')} · {t('admin.sortOrderLabel')}: {item.sortOrder}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-slate-700">{item.whatIs}</p>
                  <p className="text-xs text-slate-500">{item.columnOrder.join(' · ')}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => {
                      setStructureForm(toStructureForm(item));
                      setStructureModalOpen(true);
                    }}>
                      {t('actions.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const {error} = await upsertPromptStructure({...item, isActive: !item.isActive});
                        if (error) {
                          toast.error(error.message);
                          return;
                        }
                        toast.success(t('admin.updated'));
                        await refresh();
                      }}
                    >
                      {item.isActive ? t('admin.deactivate') : t('admin.activate')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const {error} = await deletePromptStructure(item.id);
                        if (error) {
                          toast.error(error.message);
                          return;
                        }
                        toast.success(t('admin.deleted'));
                        await refresh();
                      }}
                    >
                      {t('actions.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setRoleForm(toRoleForm());
                setRoleModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addRole')}
            </Button>
          </div>
          <AdminListControls
            query={queries.roles}
            onQueryChange={(value) => setQuery('roles', value)}
            onPrevPage={() => goToPage('roles', rolesView.page - 1)}
            onNextPage={() => goToPage('roles', rolesView.page + 1)}
            page={rolesView.page}
            totalPages={rolesView.totalPages}
            totalItems={rolesView.totalItems}
            placeholder={t('admin.searchRoles')}
            resultsLabel={t('admin.results', {count: '{count}'})}
            prevLabel={t('admin.prev')}
            nextLabel={t('admin.next')}
            pageLabel={t('admin.pageIndicator', {page: '{page}', total: '{total}'})}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rolesView.items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{item.label}</CardTitle>
                  <CardDescription>{item.icon} · {item.isActive ? t('admin.active') : t('admin.inactive')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.description ? <p className="line-clamp-2 text-sm text-slate-700">{item.description}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => {
                      setRoleForm(toRoleForm(item));
                      setRoleModalOpen(true);
                    }}>
                      {t('actions.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const {error} = await upsertPromptRole({...item, isActive: !item.isActive});
                        if (error) {
                          toast.error(error.message);
                          return;
                        }
                        toast.success(t('admin.updated'));
                        await refresh();
                      }}
                    >
                      {item.isActive ? t('admin.deactivate') : t('admin.activate')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const {error} = await deletePromptRole(item.id);
                        if (error) {
                          toast.error(error.message);
                          return;
                        }
                        toast.success(t('admin.deleted'));
                        await refresh();
                      }}
                    >
                      {t('actions.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="palette" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setPaletteForm(toPaletteForm());
                setPaletteModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.addPaletteBlock')}
            </Button>
          </div>
          <AdminListControls
            query={queries.palette}
            onQueryChange={(value) => setQuery('palette', value)}
            onPrevPage={() => goToPage('palette', paletteView.page - 1)}
            onNextPage={() => goToPage('palette', paletteView.page + 1)}
            page={paletteView.page}
            totalPages={paletteView.totalPages}
            totalItems={paletteView.totalItems}
            placeholder={t('admin.searchPalette')}
            resultsLabel={t('admin.results', {count: '{count}'})}
            prevLabel={t('admin.prev')}
            nextLabel={t('admin.next')}
            pageLabel={t('admin.pageIndicator', {page: '{page}', total: '{total}'})}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paletteView.items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>
                    {item.niche} · {item.structure} · {item.targetColumn} · {item.level}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-slate-700">{item.content}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-1">{tag}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => {
                      setPaletteForm(toPaletteForm(item));
                      setPaletteModalOpen(true);
                    }}>
                      {t('actions.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const {error} = await upsertPromptPaletteBlock({...item, isActive: !item.isActive});
                        if (error) {
                          toast.error(error.message);
                          return;
                        }
                        toast.success(t('admin.updated'));
                        await refresh();
                      }}
                    >
                      {item.isActive ? t('admin.deactivate') : t('admin.activate')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const {error} = await deletePromptPaletteBlock(item.id);
                        if (error) {
                          toast.error(error.message);
                          return;
                        }
                        toast.success(t('admin.deleted'));
                        await refresh();
                      }}
                    >
                      {t('actions.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <AdminListControls
            query={queries.suggestions}
            onQueryChange={(value) => setQuery('suggestions', value)}
            onPrevPage={() => goToPage('suggestions', suggestionsView.page - 1)}
            onNextPage={() => goToPage('suggestions', suggestionsView.page + 1)}
            page={suggestionsView.page}
            totalPages={suggestionsView.totalPages}
            totalItems={suggestionsView.totalItems}
            placeholder={t('admin.searchSuggestions')}
            resultsLabel={t('admin.results', {count: '{count}'})}
            prevLabel={t('admin.prev')}
            nextLabel={t('admin.next')}
            pageLabel={t('admin.pageIndicator', {page: '{page}', total: '{total}'})}
          />
          {suggestionsView.totalItems === 0 ? (
            <Card>
              <CardContent className="pt-4 text-sm text-slate-600">{t('admin.noSuggestions')}</CardContent>
            </Card>
          ) : (
            suggestionsView.items.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>
                    {t(`suggestions.categories.${item.category}`)} · {t(`suggestions.statuses.${item.status}`)} ·{' '}
                    {item.createdAt ? new Date(item.createdAt).toLocaleString(locale) : t('common.loading')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-3 text-sm text-slate-700">{item.message}</p>
                  {item.linkedEntityType && item.linkedEntityId ? (
                    <p className="text-xs text-slate-500">{item.linkedEntityType} · {item.linkedEntityId}</p>
                  ) : null}
                  <Textarea
                    value={suggestionNotes[item.id] ?? item.adminNotes ?? ''}
                    onChange={(event) => setSuggestionNotes((prev) => ({...prev, [item.id]: event.target.value}))}
                    placeholder={t('admin.adminNotesPlaceholder')}
                  />
                  <div className="flex flex-wrap gap-2">
                    {(['open', 'in_review', 'implemented', 'rejected'] as SuggestionStatus[]).map((status) => (
                      <Button key={status} variant={item.status === status ? 'default' : 'outline'} onClick={() => updateSuggestion(item.id, status)}>
                        {t(`suggestions.statuses.${status}`)}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Modal
        open={structureModalOpen}
        onOpenChange={setStructureModalOpen}
        title={t('admin.structureModalTitle')}
        description={t('admin.structureModalDescription')}
        footer={
          <>
            <Button variant="outline" onClick={() => setStructureModalOpen(false)}>{t('actions.cancel')}</Button>
            <Button onClick={saveStructure}>{t('actions.save')}</Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={structureForm.id} onChange={(event) => setStructureForm((prev) => ({...prev, id: event.target.value}))} placeholder="RTF" />
          <Input value={structureForm.sortOrder} onChange={(event) => setStructureForm((prev) => ({...prev, sortOrder: event.target.value}))} placeholder={t('admin.sortOrderLabel')} />
          <Input value={structureForm.labelEs} onChange={(event) => setStructureForm((prev) => ({...prev, labelEs: event.target.value}))} placeholder={t('admin.fields.labelEs')} />
          <Input value={structureForm.labelEn} onChange={(event) => setStructureForm((prev) => ({...prev, labelEn: event.target.value}))} placeholder={t('admin.fields.labelEn')} />
          <Textarea value={structureForm.whatIsEs} onChange={(event) => setStructureForm((prev) => ({...prev, whatIsEs: event.target.value}))} placeholder={t('admin.fields.whatIsEs')} />
          <Textarea value={structureForm.whatIsEn} onChange={(event) => setStructureForm((prev) => ({...prev, whatIsEn: event.target.value}))} placeholder={t('admin.fields.whatIsEn')} />
          <Textarea value={structureForm.whenToUseEs} onChange={(event) => setStructureForm((prev) => ({...prev, whenToUseEs: event.target.value}))} placeholder={t('admin.fields.whenToUseEs')} />
          <Textarea value={structureForm.whenToUseEn} onChange={(event) => setStructureForm((prev) => ({...prev, whenToUseEn: event.target.value}))} placeholder={t('admin.fields.whenToUseEn')} />
          <Textarea value={structureForm.templateEs} onChange={(event) => setStructureForm((prev) => ({...prev, templateEs: event.target.value}))} placeholder={t('admin.fields.templateEs')} />
          <Textarea value={structureForm.templateEn} onChange={(event) => setStructureForm((prev) => ({...prev, templateEn: event.target.value}))} placeholder={t('admin.fields.templateEn')} />
          <Textarea value={structureForm.exampleEs} onChange={(event) => setStructureForm((prev) => ({...prev, exampleEs: event.target.value}))} placeholder={t('admin.fields.exampleEs')} />
          <Textarea value={structureForm.exampleEn} onChange={(event) => setStructureForm((prev) => ({...prev, exampleEn: event.target.value}))} placeholder={t('admin.fields.exampleEn')} />
          <Input value={structureForm.sections} onChange={(event) => setStructureForm((prev) => ({...prev, sections: event.target.value}))} placeholder={t('admin.fields.sections')} className="md:col-span-2" />
          <Input value={structureForm.columnOrder} onChange={(event) => setStructureForm((prev) => ({...prev, columnOrder: event.target.value}))} placeholder={t('admin.fields.columnOrder')} className="md:col-span-2" />
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input type="checkbox" checked={structureForm.isActive} onChange={(event) => setStructureForm((prev) => ({...prev, isActive: event.target.checked}))} />
            {t('admin.active')}
          </label>
        </div>
      </Modal>

      <Modal
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
        title={t('admin.roleModalTitle')}
        description={t('admin.roleModalDescription')}
        footer={
          <>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>{t('actions.cancel')}</Button>
            <Button onClick={saveRole}>{t('actions.save')}</Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={roleForm.id} onChange={(event) => setRoleForm((prev) => ({...prev, id: event.target.value}))} placeholder="prompt-engineer" />
          <Input value={roleForm.icon} onChange={(event) => setRoleForm((prev) => ({...prev, icon: event.target.value}))} placeholder="Sparkles" />
          <Input value={roleForm.labelEs} onChange={(event) => setRoleForm((prev) => ({...prev, labelEs: event.target.value}))} placeholder={t('admin.fields.labelEs')} />
          <Input value={roleForm.labelEn} onChange={(event) => setRoleForm((prev) => ({...prev, labelEn: event.target.value}))} placeholder={t('admin.fields.labelEn')} />
          <Textarea value={roleForm.descriptionEs} onChange={(event) => setRoleForm((prev) => ({...prev, descriptionEs: event.target.value}))} placeholder={t('admin.fields.descriptionEs')} />
          <Textarea value={roleForm.descriptionEn} onChange={(event) => setRoleForm((prev) => ({...prev, descriptionEn: event.target.value}))} placeholder={t('admin.fields.descriptionEn')} />
          <Input value={roleForm.sortOrder} onChange={(event) => setRoleForm((prev) => ({...prev, sortOrder: event.target.value}))} placeholder={t('admin.sortOrderLabel')} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={roleForm.isActive} onChange={(event) => setRoleForm((prev) => ({...prev, isActive: event.target.checked}))} />
            {t('admin.active')}
          </label>
        </div>
      </Modal>

      <Modal
        open={paletteModalOpen}
        onOpenChange={setPaletteModalOpen}
        title={t('admin.paletteModalTitle')}
        description={t('admin.paletteModalDescription')}
        footer={
          <>
            <Button variant="outline" onClick={() => setPaletteModalOpen(false)}>{t('actions.cancel')}</Button>
            <Button onClick={savePaletteBlock}>{t('actions.save')}</Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={paletteForm.id} onChange={(event) => setPaletteForm((prev) => ({...prev, id: event.target.value}))} placeholder="dev-web-1" />
          <Input value={paletteForm.niche} onChange={(event) => setPaletteForm((prev) => ({...prev, niche: event.target.value}))} placeholder="dev:web" />
          <Input value={paletteForm.titleEs} onChange={(event) => setPaletteForm((prev) => ({...prev, titleEs: event.target.value}))} placeholder={t('admin.fields.titleEs')} />
          <Input value={paletteForm.titleEn} onChange={(event) => setPaletteForm((prev) => ({...prev, titleEn: event.target.value}))} placeholder={t('admin.fields.titleEn')} />
          <Textarea value={paletteForm.contentEs} onChange={(event) => setPaletteForm((prev) => ({...prev, contentEs: event.target.value}))} placeholder={t('admin.fields.contentEs')} />
          <Textarea value={paletteForm.contentEn} onChange={(event) => setPaletteForm((prev) => ({...prev, contentEn: event.target.value}))} placeholder={t('admin.fields.contentEn')} />
          <Input value={paletteForm.image} onChange={(event) => setPaletteForm((prev) => ({...prev, image: event.target.value}))} placeholder="/chips/dev-web.svg" />
          <Input value={paletteForm.tags} onChange={(event) => setPaletteForm((prev) => ({...prev, tags: event.target.value}))} placeholder={t('admin.fields.tags')} />
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{t('admin.fields.structure')}</p>
            <Select value={paletteForm.structure} onValueChange={(value) => setPaletteForm((prev) => ({...prev, structure: value}))}>
              <SelectTrigger>
                <SelectValue placeholder={t('admin.fields.structure')} />
              </SelectTrigger>
              <SelectContent>
                {activeStructures.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.id} · {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{t('admin.fields.targetColumn')}</p>
            <Select value={paletteForm.targetColumn} onValueChange={(value) => setPaletteForm((prev) => ({...prev, targetColumn: value}))}>
              <SelectTrigger>
                <SelectValue placeholder={t('admin.fields.targetColumn')} />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_OPTIONS.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{t('admin.fields.level')}</p>
            <Select value={paletteForm.level} onValueChange={(value) => setPaletteForm((prev) => ({...prev, level: value as PaletteFormState['level']}))}>
              <SelectTrigger>
                <SelectValue placeholder={t('admin.fields.level')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">{t('admin.levels.basic')}</SelectItem>
                <SelectItem value="intermediate">{t('admin.levels.intermediate')}</SelectItem>
                <SelectItem value="advanced">{t('admin.levels.advanced')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input value={paletteForm.sortOrder} onChange={(event) => setPaletteForm((prev) => ({...prev, sortOrder: event.target.value}))} placeholder={t('admin.sortOrderLabel')} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={paletteForm.isActive} onChange={(event) => setPaletteForm((prev) => ({...prev, isActive: event.target.checked}))} />
            {t('admin.active')}
          </label>
        </div>
      </Modal>
    </div>
  );
}
