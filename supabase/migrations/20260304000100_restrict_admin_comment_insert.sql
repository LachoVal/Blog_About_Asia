drop policy if exists "comments_insert_owner" on public.comments;
drop policy if exists "comments_admin_all" on public.comments;

drop policy if exists "comments_admin_select_all" on public.comments;
drop policy if exists "comments_admin_update_all" on public.comments;
drop policy if exists "comments_admin_delete_all" on public.comments;

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
    )
  )
);

create policy "comments_admin_select_all"
on public.comments
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "comments_admin_update_all"
on public.comments
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "comments_admin_delete_all"
on public.comments
for delete
to authenticated
using (public.is_admin(auth.uid()));
