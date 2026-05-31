import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { translate } from '/src/lib/i18n.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const form = document.querySelector('#login-form');
const message = document.querySelector('#login-message');

function setMessage(text, variant = 'secondary') {
  message.className = `mt-3 mb-0 text-${variant}`;
  message.textContent = text;
}

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

document.addEventListener('DOMContentLoaded', () => {
  redirectIfAuthenticated();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(translate('signingIn'));

  const supabase = requireSupabase();
  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!supabase) {
    setMessage(translate('supabaseMissing'), 'warning');
    return;
  }

  if (!email || !password) {
    setMessage(translate('loginMissingFields'), 'warning');
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setMessage(error.message, 'danger');
    return;
  }

  setMessage(translate('loginSuccess'), 'success');
  window.location.assign('/');
});
