import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header', '/login');
mountFooter('#app-footer');

const form = document.querySelector('#login-form');
const message = document.querySelector('#login-message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = 'Signing in...';

  const supabase = requireSupabase();
  const formData = new FormData(form);
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');

  if (!supabase) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error.message;
    return;
  }

  message.className = 'mt-3 mb-0 text-success';
  message.textContent = 'Login successful.';
});
