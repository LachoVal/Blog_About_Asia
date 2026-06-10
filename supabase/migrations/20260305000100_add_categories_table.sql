create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name_en text not null unique,
  name_bg text not null
);

alter table public.categories enable row level security;

create policy "categories_select_public"
on public.categories
for select
to anon, authenticated
using (true);

create policy "categories_admin_all"
on public.categories
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));