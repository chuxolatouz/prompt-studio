import {unstable_cache} from 'next/cache';
import {getSupabaseServerClient} from '@/lib/supabase';

export type PublicPrompt = {
  id: string;
  slug: string;
  title: string;
  language: 'es' | 'en' | 'auto';
  structure: string;
  macro: string;
  tags: string[];
  outputPrompt: string;
  excerpt: string;
  favoritesCount: number;
  viewsCount: number;
  authorName: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type PromptRow = {
  id: string;
  slug: string;
  title: string;
  language?: 'es' | 'en' | 'auto';
  structure: string;
  tags?: string[];
  output_prompt: string;
  favorites_count?: number;
  views_count?: number;
  created_at?: string;
  updated_at?: string | null;
  builder_state?: {
    macro?: string;
  } | null;
  users_profile?: Array<{display_name: string | null}> | {display_name: string | null} | null;
};

export type PromptSortMode = 'recent' | 'views' | 'favorites';

export type PublicPromptSearchParams = {
  q?: string;
  macro?: string;
  tag?: string;
  sort?: PromptSortMode;
  page?: number;
  pageSize?: number;
};

export type PublicPromptSearchResult = {
  items: PublicPrompt[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  macros: string[];
  tags: string[];
};

export function buildPromptExcerpt(value: string, maxLength = 180) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function normalizeAuthorName(input: PromptRow['users_profile']) {
  if (Array.isArray(input)) return input[0]?.display_name ?? null;
  return input?.display_name ?? null;
}

function normalizePromptRow(row: PromptRow): PublicPrompt {
  const macro = row.builder_state?.macro || row.structure;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    language: row.language ?? 'auto',
    structure: row.structure,
    macro,
    tags: row.tags ?? [],
    outputPrompt: row.output_prompt,
    excerpt: buildPromptExcerpt(row.output_prompt),
    favoritesCount: row.favorites_count ?? 0,
    viewsCount: row.views_count ?? 0,
    authorName: normalizeAuthorName(row.users_profile),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? null,
  };
}

async function fetchPublicPrompts(): Promise<PublicPrompt[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const {data, error} = await supabase
    .from('prompts')
    .select('id,slug,title,language,structure,tags,output_prompt,favorites_count,views_count,created_at,updated_at,builder_state,users_profile(display_name)')
    .eq('visibility', 'public')
    .eq('status', 'active')
    .order('created_at', {ascending: false});

  if (error || !data) return [];

  return (data as PromptRow[]).map(normalizePromptRow);
}

const getCachedPublicPrompts = unstable_cache(fetchPublicPrompts, ['public-prompts'], {revalidate: 300});

export async function getPublicPrompts() {
  return getCachedPublicPrompts();
}

export async function getPublicPromptBySlug(slug: string) {
  const prompts = await getPublicPrompts();
  return prompts.find((prompt) => prompt.slug === slug) ?? null;
}

export async function getPublicPromptTaxonomy() {
  const prompts = await getPublicPrompts();
  const macros = Array.from(new Set(prompts.map((prompt) => prompt.macro).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const tags = Array.from(new Set(prompts.flatMap((prompt) => prompt.tags).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  return {macros, tags};
}

export async function searchPublicPrompts({
  q = '',
  macro,
  tag,
  sort = 'recent',
  page = 1,
  pageSize = 12,
}: PublicPromptSearchParams = {}): Promise<PublicPromptSearchResult> {
  const prompts = await getPublicPrompts();
  const query = q.trim().toLowerCase();

  const filtered = prompts
    .filter((prompt) => {
      const queryMatch =
        !query ||
        [prompt.title, prompt.excerpt, prompt.structure, prompt.macro, ...prompt.tags]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const macroMatch = !macro || macro === 'all' || prompt.macro === macro;
      const tagMatch = !tag || tag === 'all' || prompt.tags.includes(tag);
      return queryMatch && macroMatch && tagMatch;
    })
    .sort((left, right) => {
      if (sort === 'views') return right.viewsCount - left.viewsCount;
      if (sort === 'favorites') return right.favoritesCount - left.favoritesCount;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  const {macros, tags} = await getPublicPromptTaxonomy();

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages,
    macros,
    tags,
  };
}
