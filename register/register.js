import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const form = document.querySelector('#register-form');
const message = document.querySelector('#register-message');
const submitButton = form?.querySelector('button[type="submit"]');
let isSubmitting = false;

function normalizeEmail(rawEmail) {
  return String(rawEmail || '')
    .trim()
    .replace(/[\u201C\u201D\u2018\u2019]/g, '"')
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '')
    .toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAlreadyRegisteredError(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code === 'user_already_exists' || message.includes('user already registered');
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

redirectIfAuthenticated();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (isSubmitting) {
    return;
  }

  isSubmitting = true;
  if (submitButton) {
    submitButton.disabled = true;
  }

  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = 'Creating account...';

  const supabase = requireSupabase();
  const formData = new FormData(form);
  const name = String(formData.get('name') || '').trim();
  const email = normalizeEmail(formData.get('email'));
  const password = String(formData.get('password') || '');

  if (!supabase) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';
    isSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
    }
    return;
  }

  if (!name || !email || !password) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = 'Please provide name, email, and password.';
    isSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
    }
    return;
  }

  if (!isValidEmail(email)) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = 'Please enter a valid email address (example: name@example.com).';
    isSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
    }
    return;
  }

  const { error: preflightSignInError } = await supabase.auth.signInWithPassword({ email, password });
  if (!preflightSignInError) {
    message.className = 'mt-3 mb-0 text-success';
    message.textContent = 'Account already exists and credentials are correct. Redirecting...';
    window.location.assign('/');
    return;
  }

  const preflightMessage = String(preflightSignInError.message || '').toLowerCase();
  if (preflightMessage.includes('email not confirmed')) {
    message.className = 'mt-3 mb-0 text-warning';
    message.textContent = 'This account already exists but email is not confirmed yet. Please check your inbox and then log in.';
    isSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
    }
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
    if (isAlreadyRegisteredError(error)) {
      message.className = 'mt-3 mb-0 text-warning';
      message.textContent = 'This email is already registered';
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
      }
      return;
    }

    const errorMessage = String(error.message || '').toLowerCase();

    if (errorMessage.includes('rate limit')) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (!signInError) {
        message.className = 'mt-3 mb-0 text-success';
        message.textContent = 'Account is already available. Redirecting...';
        window.location.assign('/');
        return;
      }

      const signInErrorMessage = String(signInError.message || '').toLowerCase();
      message.className = 'mt-3 mb-0 text-warning';
      message.textContent = signInErrorMessage.includes('email not confirmed')
        ? 'Your account seems created but email confirmation is still required. Please check your inbox or use Login later.'
        : 'Signup emails are temporarily rate-limited by Supabase. Please try Login if this account already exists, or retry shortly.';
    } else {
      message.className = 'mt-3 mb-0 text-danger';
      message.textContent = error.message;
    }

    isSubmitting = false;
    if (submitButton) {
      submitButton.disabled = false;
    }
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
  isSubmitting = false;
  if (submitButton) {
    submitButton.disabled = false;
  }
});
