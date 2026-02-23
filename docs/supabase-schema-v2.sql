-- Prompt Studio v2 additions (Quest Mode + Favorites)

alter table if exists prompts
  add column if not exists macro text,
  add column if not exists favorites_count int default 0;

create table if not exists favorites (
  user_id uuid references users_profile(id) on delete cascade,
  prompt_id uuid references prompts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, prompt_id)
);

alter table if exists favorites enable row level security;

drop policy if exists "own favorites select" on favorites;
drop policy if exists "own favorites insert" on favorites;
drop policy if exists "own favorites delete" on favorites;

create policy "own favorites select"
on favorites
for select
using (auth.uid() = user_id);

create policy "own favorites insert"
on favorites
for insert
with check (auth.uid() = user_id);

create policy "own favorites delete"
on favorites
for delete
using (auth.uid() = user_id);

create or replace function sync_prompt_favorites_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update prompts
    set favorites_count = coalesce(favorites_count, 0) + 1
    where id = new.prompt_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update prompts
    set favorites_count = greatest(coalesce(favorites_count, 0) - 1, 0)
    where id = old.prompt_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_favorites_count_ins on favorites;
drop trigger if exists trg_favorites_count_del on favorites;

create trigger trg_favorites_count_ins
after insert on favorites
for each row
execute function sync_prompt_favorites_count();

create trigger trg_favorites_count_del
after delete on favorites
for each row
execute function sync_prompt_favorites_count();
