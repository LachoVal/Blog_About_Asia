import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { translate } from '/src/lib/i18n.js';

mountHeader('#app-header');
mountFooter('#app-footer');

document.title = `${translate('updatePasswordTitle')} | Asian Travel Blog`;

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
  message.textContent = translate('updatePasswordAction') + '...';

  const supabase = requireSupabase();
  if (!supabase) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = translate('supabaseMissing');
    return;
  }

  const formData = new FormData(form);
  const oldPassword = String(formData.get('old-password') || '');
  const newPassword = String(formData.get('new-password') || '').trim();
  const confirmPassword = String(formData.get('confirm-password') || '').trim();

  if (!oldPassword) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = translate('oldPasswordLabel');
    return;
  }

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = translate('registerInvalidEmail');
    return;
  }

  // Validate password length
  if (newPassword.length < 6) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = translate('atLeast6Characters');
    return;
  }

  if (oldPassword === newPassword) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = translate('newPasswordLabel');
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData?.session?.user;
  const userEmail = sessionUser?.email;

  if (!sessionUser || !userEmail) {
    window.location.replace('/login/index.html');
    return;
  }

  // Re-authenticate with old password before allowing password change.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: oldPassword,
  });

  if (verifyError) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = translate('oldPasswordLabel');
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
  message.textContent = translate('loginSuccess');
  setTimeout(() => {
    window.location.assign('/');
  }, 1500);
});
