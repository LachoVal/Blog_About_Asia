import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const status = document.querySelector('#admin-status');

async function protectAdminPage() {
  const supabase = requireSupabase();
  if (!supabase) {
    window.location.replace('/login/index.html');
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (!data?.session) {
    window.location.replace('/login/index.html');
    return;
  }

  status.textContent = 'Authenticated. You can extend this page with admin-only data views.';
}

protectAdminPage();
