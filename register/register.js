import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const form = document.querySelector('#register-form');
const message = document.querySelector('#register-message');

async function redirectIfAuthenticated() {
  const supabase = requireSupabase();
  if (!supabase) {
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (data?.session) {
    window.location.replace('/');
  }
}

redirectIfAuthenticated();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = 'Creating account...';

  const supabase = requireSupabase();
  const formData = new FormData(form);
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!supabase) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';
    return;
  }

  if (!name || !email || !password) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = 'Please provide name, email, and password.';
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name
      },
      emailRedirectTo: `${window.location.origin}/login/index.html`
    }
  });

  if (error) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error.message;
    return;
  }

  form.reset();

  if (data?.session) {
    message.className = 'mt-3 mb-0 text-success';
    message.textContent = 'Registration successful. Redirecting...';
    window.location.assign('/');
    return;
  }

  message.className = 'mt-3 mb-0 text-success';
  message.textContent = 'Registration successful. Check your inbox to confirm your email, then log in.';
});
