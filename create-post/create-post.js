import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const form = document.querySelector('#create-post-form');
const message = document.querySelector('#create-post-message');

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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = 'Publishing...';

  const { supabase, session } = await getAuthenticatedSession();
  if (!supabase || !session) {
    return;
  }

  const formData = new FormData(form);
  const title = String(formData.get('title') || '');
  const content = String(formData.get('content') || '');

  const { error } = await supabase.from('posts').insert({ title, content, author_id: session.user.id });
  if (error) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error.message;
    return;
  }

  form.reset();
  message.className = 'mt-3 mb-0 text-success';
  message.textContent = 'Post published.';
});
