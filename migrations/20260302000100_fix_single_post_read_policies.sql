drop policy if exists "posts_select_owner_authenticated" on public.posts;
create policy "posts_select_owner_authenticated"
on public.posts
for select
to authenticated
using (auth.uid() = author_id);

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "comments_select_public" on public.comments;
create policy "comments_select_public"
on public.comments
for select
to anon, authenticated
using (true);
