# prompteero

prompteero is a bilingual (ES/EN) visual app to build exportable **Prompts**, **Skills**, and **Agents** for non-experts.

## Differential
- Canvas drag & drop + 3 modules (Prompt / Skill / Agent).
- Skill Builder exports packs as folders with **SKILL.md**.
- Agent Builder exports **AGENTS.md + skills/** bundle.
- Prompt Builder includes **Quest Mode** onboarding + **Pro Mode** editing.
- Final prompt order is a first-class feature (drag reorder + keyboard move up/down).
- Public gallery supports favorites, filters and fork/copy flow.

## Stack
- Next.js (App Router) + TypeScript
- TailwindCSS + shadcn-style UI
- dnd-kit
- next-intl (ES default + EN)
- zod
- JSZip
- Supabase optional (Auth + Postgres)

## Copy & i18n
- Copy spec document: `docs/COPY_SPEC.md`
- ES is the default locale (no ES/EN mixed copy when `NEXT_LOCALE=es`)
- Single source of truth for UI strings:
  - `src/i18n/es.json`
  - `src/i18n/en.json`
- i18n helpers:
  - `src/i18n/helpers.ts`
  - `src/i18n/request.ts`
- Quick checks:
  - `npm run test:copy`
  - `npm run test:plural`
  - `npm run test:i18n`

## Routes
- `/`
- `/builders`
- `/prompt-builder`
- `/skill-builder`
- `/agent-builder`
- `/structures`
- `/gallery`
- `/p/[slug]`
- `/auth`
- `/dashboard`
- `/admin`

## Local Setup (No Supabase)
```bash
npm install
npm run dev
```

Local mode supports all builders with localStorage.
Disabled without Supabase: publish, favorites, public gallery, reports, admin.

## Supabase Setup
1. Copy env:
```bash
cp .env.example .env.local
```
2. Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

3. Run schema SQL:
```sql
create table if not exists users_profile (
  id uuid primary key,
  display_name text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists prompts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users_profile(id),
  title text not null,
  slug text unique not null,
  language text check (language in ('es','en','auto')) default 'auto',
  visibility text check (visibility in ('public','private')) default 'private',
  status text check (status in ('active','hidden')) default 'active',
  hidden_reason text,
  structure text,
  macro text,
  tags text[] default '{}',
  builder_state jsonb,
  output_prompt text,
  favorites_count int default 0,
  views_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists favorites (
  user_id uuid references users_profile(id) on delete cascade,
  prompt_id uuid references prompts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, prompt_id)
);

create table if not exists skill_packs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users_profile(id),
  title text not null,
  slug text unique,
  visibility text check (visibility in ('public','private')) default 'private',
  status text check (status in ('active','hidden')) default 'active',
  description text,
  tags text[] default '{}',
  skills jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users_profile(id),
  title text not null,
  slug text unique,
  visibility text check (visibility in ('public','private')) default 'private',
  status text check (status in ('active','hidden')) default 'active',
  spec jsonb,
  output_prompt text,
  exports jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid null,
  target_type text check (target_type in ('prompt','skill_pack','agent')),
  target_id uuid not null,
  reason text,
  status text check (status in ('open','resolved')) default 'open',
  created_at timestamptz default now()
);

create or replace function increment_prompt_views(prompt_slug text)
returns void
language sql
as $$
  update prompts set views_count = views_count + 1 where slug = prompt_slug;
$$;
```

4. RLS baseline:
```sql
alter table prompts enable row level security;
alter table skill_packs enable row level security;
alter table agents enable row level security;
alter table reports enable row level security;
alter table favorites enable row level security;

create policy "public read prompts" on prompts for select using (visibility = 'public' and status = 'active');
create policy "owner crud prompts" on prompts for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "public read skill packs" on skill_packs for select using (visibility = 'public' and status = 'active');
create policy "owner crud skill packs" on skill_packs for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "public read agents" on agents for select using (visibility = 'public' and status = 'active');
create policy "owner crud agents" on agents for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "create reports" on reports for insert with check (true);

create policy "own favorites select" on favorites for select using (auth.uid() = user_id);
create policy "own favorites insert" on favorites for insert with check (auth.uid() = user_id);
create policy "own favorites delete" on favorites for delete using (auth.uid() = user_id);

create or replace function sync_prompt_favorites_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update prompts set favorites_count = coalesce(favorites_count, 0) + 1 where id = new.prompt_id;
    return new;
  end if;
  if tg_op = 'DELETE' then
    update prompts set favorites_count = greatest(coalesce(favorites_count, 0) - 1, 0) where id = old.prompt_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger trg_favorites_count_ins after insert on favorites for each row execute function sync_prompt_favorites_count();
create trigger trg_favorites_count_del after delete on favorites for each row execute function sync_prompt_favorites_count();
```

You can also run the curated script at `docs/supabase-schema-v2.sql`.

## Prompt Builder UX
- **Quest Mode** runs as onboarding by default until completing Role + Goal + Output Format.
- Users can always switch between **Quest Mode** and **Pro Mode**.
- Final segment order controls:
  - visual segment layout,
  - generated prompt preview,
  - copy/export outputs.
- Macro apply flow includes before/after order preview and never deletes content.

## Gallery UX
- `/gallery` includes search, macro filter, tag filter, and sort by recent/views/favorites.
- `/p/[slug]` includes Copy, Fork, Favorite, and Report actions.
- Favorite and Publish actions are auth-gated with return-to-action after login.

## Export
- Prompt Builder export menu now includes:
  - text (`.txt`)
  - markdown (`.md`)
  - bundle zip (`PROMPT.md`, `PROMPT.txt`, `meta.json`, `segments.json`)
- Export order respects the final segment order.

## Manual QA Checklist
1. Open `/prompt-builder` in a fresh browser profile and verify Quest Mode appears by default.
2. Complete Role + Goal + Output Format in Quest Mode, continue to Pro Mode, then toggle back to Quest.
3. Reorder segments and confirm preview/copy/export follow the new order.
4. Apply a macro and confirm before/after order preview and resulting segment order.
5. Without login, click Publish/Favorite and verify auth gate appears.
6. Login through auth gate and verify return-to-action path works.
7. Open `/gallery`, test search + filters + sort and favorite toggle.
8. Open `/p/[slug]`, test Copy + Fork + Favorite + Report actions.

## Definition of Done (MVP v1)
- [x] Landing keeps existing style and uses Builders-focused CTAs.
- [x] Navbar uses one **Builders** item (desktop dropdown + mobile expandable menu).
- [x] `/builders` hub exists with 3 cards.
- [x] `/structures` includes RTF, TAO, BAB, CARE, CO-STAR, CRISPE, STAR.
- [x] Prompt structures are macro-driven in Prompt Builder.
- [x] Prompt Builder has versioned state (`version: 1`) validated with zod.
- [x] Prompt Builder palette uses image chips from `/public/chips` and `/data/blocks.json`.
- [x] Anti-hallucination block is ON by default, editable, resettable.
- [x] Skill Builder exports folder-based pack with `SKILL.md` files.
- [x] Agent Builder exports `AGENTS.md` + `skills/` + `agent.json`.
- [x] Public gallery + read-only prompt page + duplicate (login only).
- [x] Reports + admin moderation (hide/restore + `hidden_reason`).
- [x] Auth email/password + profile upsert (`users_profile`) on session.
- [x] App works in local-only mode without Supabase.
- [x] No model API calls.
- [x] Navbar compacted to ~40px height.
- [x] Siri-style rainbow glow on feature cards.
- [x] Button contrast improved (navbar active links use blue bg + white text).
