import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const form = document.querySelector('#change-password-form');
const message = document.querySelector('#change-password-message');

async function requireSession() {
  const supabase = requireSupabase();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  if (!data?.session) {
    window.location.replace('/login/index.html');
    return null;
  }

  return data.session;
}

requireSession();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = 'Updating password...';

  const supabase = requireSupabase();
  if (!supabase) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';
    return;
  }

  const formData = new FormData(form);
  const newPassword = String(formData.get('new-password') || '').trim();
  const confirmPassword = String(formData.get('confirm-password') || '').trim();

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = 'Passwords do not match.';
    return;
  }

  // Validate password length
  if (newPassword.length < 6) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = 'Password must be at least 6 characters long.';
    return;
  }

  // Update password in Supabase
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error.message;
    return;
  }

  message.className = 'mt-3 mb-0 text-success';
  message.textContent = 'Password updated successfully! Redirecting...';
  setTimeout(() => {
    window.location.assign('/');
  }, 1500);
});
