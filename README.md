# prompteero

prompteero is a bilingual (ES/EN) visual app to build exportable **Prompts**, **Skills**, and **Agents** for non-experts.

## Differential
- Canvas drag & drop + 3 modules (Prompt / Skill / Agent).
- Skill Builder exports packs as folders with **SKILL.md**.
- Agent Builder exports **AGENTS.md + skills/** bundle.

## Stack
- Next.js (App Router) + TypeScript
- TailwindCSS + shadcn-style UI
- dnd-kit
- next-intl (ES default + EN)
- zod
- JSZip
- Supabase optional (Auth + Postgres)

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
Disabled without Supabase: publish, public gallery, reports, admin.

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
  tags text[] default '{}',
  builder_state jsonb,
  output_prompt text,
  views_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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

create policy "public read prompts" on prompts for select using (visibility = 'public' and status = 'active');
create policy "owner crud prompts" on prompts for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "public read skill packs" on skill_packs for select using (visibility = 'public' and status = 'active');
create policy "owner crud skill packs" on skill_packs for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "public read agents" on agents for select using (visibility = 'public' and status = 'active');
create policy "owner crud agents" on agents for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "create reports" on reports for insert with check (true);
```

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
