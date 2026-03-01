import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const form = document.querySelector('#register-form');
const message = document.querySelector('#register-message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = 'Creating account...';

  const supabase = requireSupabase();
  const formData = new FormData(form);
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');

  if (!supabase) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';
    return;
  }

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error.message;
    return;
  }

  message.className = 'mt-3 mb-0 text-success';
  message.textContent = 'Registration successful. Check your inbox if email confirmation is enabled.';
});
