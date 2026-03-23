-- Prompteero admin catalog + suggestions

create extension if not exists pgcrypto;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users_profile
    where id = uid
      and is_admin = true
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.prompt_structures (
  id text primary key,
  label jsonb not null default '{"es":"","en":""}'::jsonb,
  what_is jsonb not null default '{"es":"","en":""}'::jsonb,
  when_to_use jsonb not null default '{"es":[],"en":[]}'::jsonb,
  template jsonb not null default '{"es":"","en":""}'::jsonb,
  example jsonb not null default '{"es":"","en":""}'::jsonb,
  sections text[] not null default '{}',
  column_order text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_roles (
  id text primary key,
  label jsonb not null default '{"es":"","en":""}'::jsonb,
  description jsonb not null default '{"es":"","en":""}'::jsonb,
  icon text not null default 'Sparkles',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prompt_palette_blocks (
  id text primary key,
  title jsonb not null default '{"es":"","en":""}'::jsonb,
  content jsonb not null default '{"es":"","en":""}'::jsonb,
  niche text not null,
  structure_id text not null references public.prompt_structures(id) on delete restrict,
  target_column text not null,
  level text not null default 'basic' check (level in ('basic', 'intermediate', 'advanced')),
  tags text[] not null default '{}',
  image text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_suggestions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users_profile(id) on delete cascade default auth.uid(),
  title text not null,
  message text not null,
  category text not null default 'general' check (category in ('structure', 'role', 'palette', 'general')),
  status text not null default 'open' check (status in ('open', 'in_review', 'implemented', 'rejected')),
  linked_entity_type text null check (linked_entity_type in ('structure', 'role', 'palette_block')),
  linked_entity_id text null,
  admin_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_prompt_structures_touch on public.prompt_structures;
create trigger trg_prompt_structures_touch
before update on public.prompt_structures
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_prompt_roles_touch on public.prompt_roles;
create trigger trg_prompt_roles_touch
before update on public.prompt_roles
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_prompt_palette_blocks_touch on public.prompt_palette_blocks;
create trigger trg_prompt_palette_blocks_touch
before update on public.prompt_palette_blocks
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_user_suggestions_touch on public.user_suggestions;
create trigger trg_user_suggestions_touch
before update on public.user_suggestions
for each row
execute function public.touch_updated_at();

alter table public.prompt_structures enable row level security;
alter table public.prompt_roles enable row level security;
alter table public.prompt_palette_blocks enable row level security;
alter table public.user_suggestions enable row level security;

drop policy if exists "prompt_structures_read_active" on public.prompt_structures;
create policy "prompt_structures_read_active"
on public.prompt_structures
for select
using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists "prompt_structures_admin_write" on public.prompt_structures;
create policy "prompt_structures_admin_write"
on public.prompt_structures
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "prompt_roles_read_active" on public.prompt_roles;
create policy "prompt_roles_read_active"
on public.prompt_roles
for select
using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists "prompt_roles_admin_write" on public.prompt_roles;
create policy "prompt_roles_admin_write"
on public.prompt_roles
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "prompt_palette_blocks_read_active" on public.prompt_palette_blocks;
create policy "prompt_palette_blocks_read_active"
on public.prompt_palette_blocks
for select
using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists "prompt_palette_blocks_admin_write" on public.prompt_palette_blocks;
create policy "prompt_palette_blocks_admin_write"
on public.prompt_palette_blocks
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "user_suggestions_insert_own" on public.user_suggestions;
create policy "user_suggestions_insert_own"
on public.user_suggestions
for insert
with check (auth.uid() = created_by);

drop policy if exists "user_suggestions_select_own_or_admin" on public.user_suggestions;
create policy "user_suggestions_select_own_or_admin"
on public.user_suggestions
for select
using (auth.uid() = created_by or public.is_admin(auth.uid()));

drop policy if exists "user_suggestions_admin_update" on public.user_suggestions;
create policy "user_suggestions_admin_update"
on public.user_suggestions
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
