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
        and posts.is_approved = true
    )
  )
);
