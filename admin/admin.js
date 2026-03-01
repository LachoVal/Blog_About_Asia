import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const status = document.querySelector('#admin-status');
status.textContent = requireSupabase()
  ? 'Supabase is connected. You can extend this page with admin-only data views.'
  : 'Supabase is not configured yet. Add credentials to your .env file to enable admin data operations.';
