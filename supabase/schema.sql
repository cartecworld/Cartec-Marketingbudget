-- Cartec Marketingbudget – databaseschema voor Supabase.
-- Plak dit in Supabase → SQL Editor → New query en klik op Run. Je kunt het veilig opnieuw draaien.

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#94A3B8',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  description   text not null,
  amount        numeric(10, 2) not null check (amount > 0),
  category_id   uuid references public.categories (id) on delete set null,
  result        text,
  invoice_path  text,
  invoice_name  text,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (date);

-- Alleen ingelogde gebruikers (de 4 teamleden) mogen lezen en schrijven.
alter table public.categories enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "team categories" on public.categories;
create policy "team categories" on public.categories
  for all to authenticated using (true) with check (true);

drop policy if exists "team expenses" on public.expenses;
create policy "team expenses" on public.expenses
  for all to authenticated using (true) with check (true);

-- Privé opslag voor facturen.
insert into storage.buckets (id, name, public, file_size_limit)
values ('facturen', 'facturen', false, 10485760)
on conflict (id) do nothing;

drop policy if exists "team facturen lezen" on storage.objects;
create policy "team facturen lezen" on storage.objects
  for select to authenticated using (bucket_id = 'facturen');

drop policy if exists "team facturen uploaden" on storage.objects;
create policy "team facturen uploaden" on storage.objects
  for insert to authenticated with check (bucket_id = 'facturen');

drop policy if exists "team facturen wijzigen" on storage.objects;
create policy "team facturen wijzigen" on storage.objects
  for update to authenticated using (bucket_id = 'facturen');

drop policy if exists "team facturen verwijderen" on storage.objects;
create policy "team facturen verwijderen" on storage.objects
  for delete to authenticated using (bucket_id = 'facturen');

-- Startcategorieën (alleen als er nog geen categorieën zijn).
insert into public.categories (name, color, created_at)
select name, color, now() + (ord || ' milliseconds')::interval
from (values
  (1, 'Advertenties', '#5B6CFF'),
  (2, 'Prijsgeld', '#FFB020'),
  (3, 'Samenwerkingen', '#2FBF71'),
  (4, 'Opleidingen/cursussen', '#9B6BFF'),
  (5, 'Offline marketingmateriaal', '#FF6B6B'),
  (6, 'Online marketingmateriaal', '#22B8CF')
) as v (ord, name, color)
where not exists (select 1 from public.categories);
