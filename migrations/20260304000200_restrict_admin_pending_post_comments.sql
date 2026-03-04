drop policy if exists "comments_insert_owner" on public.comments;
create policy "comments_insert_owner"
on public.comments
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    not public.is_admin(auth.uid())
    or exists (
      select 1
      from public.posts
      where posts.id = comments.post_id
        and posts.author_id = auth.uid()
        and posts.is_approved = true
    )
  )
);

drop policy if exists "comments_select_public" on public.comments;
create policy "comments_select_public"
on public.comments
for select
to anon, authenticated
using (
  not (
    public.is_admin(auth.uid())
    and exists (
      select 1
      from public.posts
      where posts.id = comments.post_id
        and posts.is_approved = false
    )
  )
);

drop policy if exists "comments_admin_select_all" on public.comments;
create policy "comments_admin_select_all"
on public.comments
for select
to authenticated
using (
  public.is_admin(auth.uid())
  and exists (
    select 1
    from public.posts
    where posts.id = comments.post_id
      and posts.is_approved = true
  )
);
