import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const form = document.querySelector('#create-post-form');
const message = document.querySelector('#create-post-message');
const heading = document.querySelector('main h1');
const submitButton = form.querySelector('button[type="submit"]');

const editPostId = new URLSearchParams(window.location.search).get('edit');

async function getAuthenticatedSession() {
  const supabase = requireSupabase();
  if (!supabase) {
    window.location.replace('/login/index.html');
    return { supabase: null, session: null };
  }

  const { data } = await supabase.auth.getSession();
  if (!data?.session) {
    window.location.replace('/login/index.html');
    return { supabase, session: null };
  }

  return { supabase, session: data.session };
}

getAuthenticatedSession();

async function loadPostForEditing() {
  if (!editPostId) {
    return;
  }

  const { supabase, session } = await getAuthenticatedSession();
  if (!supabase || !session) {
    return;
  }

  heading.textContent = 'Edit Post';
  submitButton.textContent = 'Save Changes';
  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = 'Loading post...';

  const { data, error } = await supabase
    .from('posts')
    .select('id, title, content')
    .eq('id', editPostId)
    .maybeSingle();

  if (error || !data) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error?.message || 'Unable to load this post for editing.';
    return;
  }

  const titleInput = form.querySelector('#post-title');
  const contentInput = form.querySelector('#post-content');
  titleInput.value = data.title || '';
  contentInput.value = data.content || '';

  message.className = 'mt-3 mb-0 text-success';
  message.textContent = 'Editing mode enabled.';
}

loadPostForEditing();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = editPostId ? 'Saving changes...' : 'Publishing...';

  const { supabase, session } = await getAuthenticatedSession();
  if (!supabase || !session) {
    return;
  }

  const formData = new FormData(form);
  const title = String(formData.get('title') || '');
  const content = String(formData.get('content') || '');

  let error;
  if (editPostId) {
    ({ error } = await supabase
      .from('posts')
      .update({ title, content })
      .eq('id', editPostId));
  } else {
    ({ error } = await supabase
      .from('posts')
      .insert({ title, content, author_id: session.user.id }));
  }

  if (error) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error.message;
    return;
  }

  if (editPostId) {
    message.className = 'mt-3 mb-0 text-success';
    message.textContent = 'Post updated successfully.';
    return;
  }

  form.reset();
  message.className = 'mt-3 mb-0 text-success';
  message.textContent = 'Post published.';
});
