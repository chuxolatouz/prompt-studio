import blocksSeed from '@/data/blocks.json';
import rolesSeed from '@/data/roles.json';
import structuresSeed from '@/data/structures.json';
import enMessages from '@/i18n/en.json';
import esMessages from '@/i18n/es.json';
import {
  LinkedEntityType,
  PromptPaletteBlockRecord,
  PromptRoleRecord,
  PromptStructureRecord,
  SuggestionCategory,
  SuggestionStatus,
  UserSuggestionRecord,
} from '@/lib/schemas';
import {getSupabaseBrowserClient, supabaseEnabled} from '@/lib/supabase';

type CatalogLocale = 'es' | 'en';
type LocalizedText = {es: string; en: string};
type CatalogOptions = {includeInactive?: boolean};

type SuggestionPayload = {
  title: string;
  message: string;
  category: SuggestionCategory;
  linkedEntityType?: LinkedEntityType | null;
  linkedEntityId?: string | null;
};

type StructureSeed = {
  id: string;
  titleKey: string;
  whatIsKey: string;
  whenToUseKeys: string[];
  templateKey: string;
  exampleKey: string;
  sections: string[];
  macro: {
    columnOrder: string[];
  };
};

type RoleSeed = {
  id: string;
  labelKey: string;
  icon: string;
};

type BlockSeed = {
  id: string;
  titleKey: string;
  contentKey: string;
  niche: string;
  structure: string;
  level: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
  image: string;
  targetColumn: string;
};

function getMessageValue(source: unknown, key: string): string {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, source);

  return typeof value === 'string' ? value : key;
}

function toLocalizedText(value: unknown): LocalizedText {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const es = typeof record.es === 'string' ? record.es : typeof record.en === 'string' ? record.en : '';
    const en = typeof record.en === 'string' ? record.en : typeof record.es === 'string' ? record.es : '';
    return {es, en};
  }

  if (typeof value === 'string') return {es: value, en: value};
  return {es: '', en: ''};
}

function localizedList(value: unknown): {es: string[]; en: string[]} {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const es = Array.isArray(record.es) ? record.es.map(String).filter(Boolean) : [];
    const en = Array.isArray(record.en) ? record.en.map(String).filter(Boolean) : [];
    return {
      es: es.length ? es : en,
      en: en.length ? en : es,
    };
  }

  if (Array.isArray(value)) {
    const list = value.map(String).filter(Boolean);
    return {es: list, en: list};
  }

  return {es: [], en: []};
}

function pickLocale(text: LocalizedText, locale: CatalogLocale) {
  return text[locale] || text.es || text.en || '';
}

function structureSeedToRecord(seed: StructureSeed, index: number, locale: CatalogLocale): PromptStructureRecord {
  const localizedLabel = {
    es: getMessageValue(esMessages, seed.titleKey),
    en: getMessageValue(enMessages, seed.titleKey),
  };
  const localizedWhatIs = {
    es: getMessageValue(esMessages, seed.whatIsKey),
    en: getMessageValue(enMessages, seed.whatIsKey),
  };
  const localizedWhenToUse = {
    es: seed.whenToUseKeys.map((key) => getMessageValue(esMessages, key)),
    en: seed.whenToUseKeys.map((key) => getMessageValue(enMessages, key)),
  };
  const localizedTemplate = {
    es: getMessageValue(esMessages, seed.templateKey),
    en: getMessageValue(enMessages, seed.templateKey),
  };
  const localizedExample = {
    es: getMessageValue(esMessages, seed.exampleKey),
    en: getMessageValue(enMessages, seed.exampleKey),
  };

  return {
    id: seed.id,
    label: pickLocale(localizedLabel, locale),
    localizedLabel,
    whatIs: pickLocale(localizedWhatIs, locale),
    localizedWhatIs,
    whenToUse: localizedWhenToUse[locale],
    localizedWhenToUse,
    template: pickLocale(localizedTemplate, locale),
    localizedTemplate,
    example: pickLocale(localizedExample, locale),
    localizedExample,
    sections: seed.sections,
    columnOrder: seed.macro.columnOrder,
    sortOrder: index,
    isActive: true,
  };
}

function roleSeedToRecord(seed: RoleSeed, index: number, locale: CatalogLocale): PromptRoleRecord {
  const localizedLabel = {
    es: getMessageValue(esMessages, seed.labelKey),
    en: getMessageValue(enMessages, seed.labelKey),
  };

  return {
    id: seed.id,
    label: pickLocale(localizedLabel, locale),
    localizedLabel,
    icon: seed.icon,
    description: '',
    localizedDescription: {es: '', en: ''},
    sortOrder: index,
    isActive: true,
  };
}

function blockSeedToRecord(seed: BlockSeed, index: number, locale: CatalogLocale): PromptPaletteBlockRecord {
  const localizedTitle = {
    es: getMessageValue(esMessages, seed.titleKey),
    en: getMessageValue(enMessages, seed.titleKey),
  };
  const localizedContent = {
    es: getMessageValue(esMessages, seed.contentKey),
    en: getMessageValue(enMessages, seed.contentKey),
  };

  return {
    id: seed.id,
    title: pickLocale(localizedTitle, locale),
    localizedTitle,
    content: pickLocale(localizedContent, locale),
    localizedContent,
    niche: seed.niche,
    structure: seed.structure,
    targetColumn: seed.targetColumn,
    level: seed.level,
    tags: seed.tags,
    image: seed.image,
    sortOrder: index,
    isActive: true,
  };
}

export function getFallbackPromptCatalog(locale: CatalogLocale) {
  return {
    structures: (structuresSeed as StructureSeed[]).map((seed, index) => structureSeedToRecord(seed, index, locale)),
    roles: (rolesSeed as RoleSeed[]).map((seed, index) => roleSeedToRecord(seed, index, locale)),
    paletteBlocks: (blocksSeed as BlockSeed[]).map((seed, index) => blockSeedToRecord(seed, index, locale)),
  };
}

function mapStructureRow(row: Record<string, unknown>, locale: CatalogLocale): PromptStructureRecord {
  const localizedLabel = toLocalizedText(row.label);
  const localizedWhatIs = toLocalizedText(row.what_is);
  const localizedWhenToUse = localizedList(row.when_to_use);
  const localizedTemplate = toLocalizedText(row.template);
  const localizedExample = toLocalizedText(row.example);

  return {
    id: String(row.id ?? ''),
    label: pickLocale(localizedLabel, locale),
    localizedLabel,
    whatIs: pickLocale(localizedWhatIs, locale),
    localizedWhatIs,
    whenToUse: localizedWhenToUse[locale],
    localizedWhenToUse,
    template: pickLocale(localizedTemplate, locale),
    localizedTemplate,
    example: pickLocale(localizedExample, locale),
    localizedExample,
    sections: Array.isArray(row.sections) ? row.sections.map(String) : [],
    columnOrder: Array.isArray(row.column_order) ? row.column_order.map(String) : [],
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
  };
}

function mapRoleRow(row: Record<string, unknown>, locale: CatalogLocale): PromptRoleRecord {
  const localizedLabel = toLocalizedText(row.label);
  const localizedDescription = toLocalizedText(row.description);

  return {
    id: String(row.id ?? ''),
    label: pickLocale(localizedLabel, locale),
    localizedLabel,
    icon: typeof row.icon === 'string' ? row.icon : 'Sparkles',
    description: pickLocale(localizedDescription, locale),
    localizedDescription,
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
  };
}

function mapPaletteRow(row: Record<string, unknown>, locale: CatalogLocale): PromptPaletteBlockRecord {
  const localizedTitle = toLocalizedText(row.title);
  const localizedContent = toLocalizedText(row.content);

  return {
    id: String(row.id ?? ''),
    title: pickLocale(localizedTitle, locale),
    localizedTitle,
    content: pickLocale(localizedContent, locale),
    localizedContent,
    niche: typeof row.niche === 'string' ? row.niche : 'all',
    structure: typeof row.structure_id === 'string' ? row.structure_id : '',
    targetColumn: typeof row.target_column === 'string' ? row.target_column : 'context',
    level: row.level === 'advanced' ? 'advanced' : row.level === 'intermediate' ? 'intermediate' : 'basic',
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    image: typeof row.image === 'string' ? row.image : '',
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
  };
}

export async function loadPromptCatalog(locale: CatalogLocale, options: CatalogOptions = {}) {
  const fallback = getFallbackPromptCatalog(locale);

  if (!supabaseEnabled) {
    return options.includeInactive ? fallback : fallback;
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return fallback;

  const structureQuery = supabase.from('prompt_structures').select('*').order('sort_order', {ascending: true}).order('id', {ascending: true});
  const roleQuery = supabase.from('prompt_roles').select('*').order('sort_order', {ascending: true}).order('id', {ascending: true});
  const blockQuery = supabase.from('prompt_palette_blocks').select('*').order('sort_order', {ascending: true}).order('id', {ascending: true});

  if (!options.includeInactive) {
    structureQuery.eq('is_active', true);
    roleQuery.eq('is_active', true);
    blockQuery.eq('is_active', true);
  }

  const [structuresResult, rolesResult, blocksResult] = await Promise.all([structureQuery, roleQuery, blockQuery]);

  return {
    structures:
      structuresResult.error || !structuresResult.data?.length
        ? fallback.structures
        : structuresResult.data.map((row) => mapStructureRow(row as Record<string, unknown>, locale)),
    roles:
      rolesResult.error || !rolesResult.data?.length ? fallback.roles : rolesResult.data.map((row) => mapRoleRow(row as Record<string, unknown>, locale)),
    paletteBlocks:
      blocksResult.error || !blocksResult.data?.length
        ? fallback.paletteBlocks
        : blocksResult.data.map((row) => mapPaletteRow(row as Record<string, unknown>, locale)),
  };
}

export async function listPromptStructures(locale: CatalogLocale, options: CatalogOptions = {}) {
  const result = await loadPromptCatalog(locale, options);
  return result.structures;
}

export async function listPromptRoles(locale: CatalogLocale, options: CatalogOptions = {}) {
  const result = await loadPromptCatalog(locale, options);
  return result.roles;
}

export async function listPromptPaletteBlocks(locale: CatalogLocale, options: CatalogOptions = {}) {
  const result = await loadPromptCatalog(locale, options);
  return result.paletteBlocks;
}

export async function upsertPromptStructure(record: PromptStructureRecord) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase unavailable');

  return supabase.from('prompt_structures').upsert(
    {
      id: record.id,
      label: record.localizedLabel,
      what_is: record.localizedWhatIs,
      when_to_use: record.localizedWhenToUse,
      template: record.localizedTemplate,
      example: record.localizedExample,
      sections: record.sections,
      column_order: record.columnOrder,
      sort_order: record.sortOrder,
      is_active: record.isActive,
    },
    {onConflict: 'id'}
  );
}

export async function upsertPromptRole(record: PromptRoleRecord) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase unavailable');

  return supabase.from('prompt_roles').upsert(
    {
      id: record.id,
      label: record.localizedLabel,
      description: record.localizedDescription,
      icon: record.icon,
      sort_order: record.sortOrder,
      is_active: record.isActive,
    },
    {onConflict: 'id'}
  );
}

export async function upsertPromptPaletteBlock(record: PromptPaletteBlockRecord) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase unavailable');

  return supabase.from('prompt_palette_blocks').upsert(
    {
      id: record.id,
      title: record.localizedTitle,
      content: record.localizedContent,
      niche: record.niche,
      structure_id: record.structure,
      target_column: record.targetColumn,
      level: record.level,
      tags: record.tags,
      image: record.image,
      sort_order: record.sortOrder,
      is_active: record.isActive,
    },
    {onConflict: 'id'}
  );
}

export async function deletePromptStructure(id: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase unavailable');
  return supabase.from('prompt_structures').delete().eq('id', id);
}

export async function deletePromptRole(id: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase unavailable');
  return supabase.from('prompt_roles').delete().eq('id', id);
}

export async function deletePromptPaletteBlock(id: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase unavailable');
  return supabase.from('prompt_palette_blocks').delete().eq('id', id);
}

function mapSuggestionRow(row: Record<string, unknown>): UserSuggestionRecord {
  return {
    id: String(row.id ?? ''),
    title: typeof row.title === 'string' ? row.title : '',
    message: typeof row.message === 'string' ? row.message : '',
    category: row.category === 'structure' || row.category === 'role' || row.category === 'palette' ? row.category : 'general',
    status:
      row.status === 'implemented' || row.status === 'rejected' || row.status === 'in_review' ? row.status : 'open',
    linkedEntityType:
      row.linked_entity_type === 'structure' || row.linked_entity_type === 'role' || row.linked_entity_type === 'palette_block'
        ? row.linked_entity_type
        : null,
    linkedEntityId: typeof row.linked_entity_id === 'string' ? row.linked_entity_id : null,
    createdBy: typeof row.created_by === 'string' ? row.created_by : null,
    adminNotes: typeof row.admin_notes === 'string' ? row.admin_notes : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

export async function createUserSuggestion(payload: SuggestionPayload) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase unavailable');

  return supabase.from('user_suggestions').insert({
    title: payload.title,
    message: payload.message,
    category: payload.category,
    linked_entity_type: payload.linkedEntityType ?? null,
    linked_entity_id: payload.linkedEntityId ?? null,
  });
}

export async function listMySuggestions(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [] as UserSuggestionRecord[];

  const {data, error} = await supabase
    .from('user_suggestions')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', {ascending: false});

  if (error) return [];
  return (data ?? []).map((row) => mapSuggestionRow(row as Record<string, unknown>));
}

export async function listAdminSuggestions() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [] as UserSuggestionRecord[];

  const {data, error} = await supabase.from('user_suggestions').select('*').order('created_at', {ascending: false});
  if (error) return [];
  return (data ?? []).map((row) => mapSuggestionRow(row as Record<string, unknown>));
}

export async function updateSuggestionStatus(id: string, status: SuggestionStatus, adminNotes?: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase unavailable');

  return supabase
    .from('user_suggestions')
    .update({
      status,
      admin_notes: adminNotes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}
