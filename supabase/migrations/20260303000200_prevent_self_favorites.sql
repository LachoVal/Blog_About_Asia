drop policy if exists "favorites_insert_own" on public.favorites;

create policy "favorites_insert_own"
on public.favorites
for insert
to authenticated
with check (
  auth.uid() = user_id
  and not exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.author_id = auth.uid()
  )
);
