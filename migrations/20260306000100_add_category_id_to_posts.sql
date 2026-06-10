alter table public.posts
  add column if not exists category_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_category_id_fkey'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_category_id_fkey
      foreign key (category_id)
      references public.categories (id)
      on delete set null
      not valid;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'posts_category_id_fkey'
      and conrelid = 'public.posts'::regclass
      and not convalidated
  ) then
    alter table public.posts
      validate constraint posts_category_id_fkey;
  end if;
end
$$;

create index if not exists idx_posts_category_id
  on public.posts (category_id);