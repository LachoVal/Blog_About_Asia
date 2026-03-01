import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const form = document.querySelector('#create-post-form');
const message = document.querySelector('#create-post-message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = 'Publishing...';

  const supabase = requireSupabase();
  const formData = new FormData(form);
  const title = String(formData.get('title') || '');
  const content = String(formData.get('content') || '');

  if (!supabase) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';
    return;
  }

  const { error } = await supabase.from('posts').insert({ title, content });
  if (error) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error.message;
    return;
  }

  form.reset();
  message.className = 'mt-3 mb-0 text-success';
  message.textContent = 'Post published.';
});
