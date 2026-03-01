create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  image_url text,
  country_id uuid not null references public.countries (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete cascade,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create index if not exists idx_posts_country_id on public.posts (country_id);
create index if not exists idx_posts_author_id on public.posts (author_id);
create index if not exists idx_comments_post_id on public.comments (post_id);
create index if not exists idx_comments_user_id on public.comments (user_id);
create index if not exists idx_favorites_user_id on public.favorites (user_id);
create index if not exists idx_favorites_post_id on public.favorites (post_id);

create or replace function public.is_admin(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'avatar_url',
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.countries enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.favorites enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles_insert_own_or_admin"
on public.profiles
for insert
with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy "profiles_delete_admin_only"
on public.profiles
for delete
using (public.is_admin(auth.uid()));

create policy "countries_select_public"
on public.countries
for select
to anon, authenticated
using (true);

create policy "countries_admin_all"
on public.countries
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "posts_select_approved_public"
on public.posts
for select
to anon, authenticated
using (is_approved = true);

create policy "posts_select_all_admin"
on public.posts
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "posts_insert_owner"
on public.posts
for insert
to authenticated
with check (auth.uid() = author_id);

create policy "posts_update_owner"
on public.posts
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "posts_delete_owner"
on public.posts
for delete
to authenticated
using (auth.uid() = author_id);

create policy "posts_admin_all"
on public.posts
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "comments_select_own"
on public.comments
for select
to authenticated
using (auth.uid() = user_id);

create policy "comments_insert_owner"
on public.comments
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "comments_update_owner"
on public.comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "comments_delete_owner"
on public.comments
for delete
to authenticated
using (auth.uid() = user_id);

create policy "comments_admin_all"
on public.comments
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "favorites_select_own"
on public.favorites
for select
to authenticated
using (auth.uid() = user_id);

create policy "favorites_insert_own"
on public.favorites
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "favorites_delete_own"
on public.favorites
for delete
to authenticated
using (auth.uid() = user_id);

create policy "favorites_admin_all"
on public.favorites
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
