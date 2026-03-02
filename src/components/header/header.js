import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import headerTemplate from './header.html?raw';
import './header.css';
import { getCurrentRouteBase, isRouteActive } from '/src/router/router.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

function toggleAuthNav(target, isAuthenticated) {
  target.querySelectorAll('[data-auth="guest"]').forEach((element) => {
    element.classList.toggle('d-none', isAuthenticated);
  });

  target.querySelectorAll('[data-auth="user"]').forEach((element) => {
    element.classList.toggle('d-none', !isAuthenticated);
  });
}

async function syncAuthNav(target) {
  const supabase = requireSupabase();
  if (!supabase) {
    toggleAuthNav(target, false);
    target.querySelectorAll('[data-auth="admin"]').forEach((element) => {
      element.classList.add('d-none');
    });
    return;
  }

  const { data } = await supabase.auth.getSession();
  const currentUser = data?.session?.user || null;
  toggleAuthNav(target, Boolean(currentUser));

  if (!currentUser) {
    target.querySelectorAll('[data-auth="admin"]').forEach((element) => {
      element.classList.add('d-none');
    });
    return;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .maybeSingle();

  const isAdmin = !error && profile?.role === 'admin';
  target.querySelectorAll('[data-auth="admin"]').forEach((element) => {
    element.classList.toggle('d-none', !isAdmin);
  });
}

export function mountHeader(targetSelector, currentRoute) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    return;
  }

  target.innerHTML = headerTemplate;
  const links = target.querySelectorAll('[data-route]');
  const routeToUse = currentRoute || getCurrentRouteBase();

  links.forEach((link) => {
    const route = link.getAttribute('data-route');
    const isActive = isRouteActive(route, routeToUse);
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  const logoutLink = target.querySelector('[data-action="logout"]');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (event) => {
      event.preventDefault();
      const supabase = requireSupabase();
      if (!supabase) {
        window.location.assign('/login/index.html');
        return;
      }

      await supabase.auth.signOut();
      window.location.assign('/login/index.html');
    });
  }

  syncAuthNav(target);

  const supabase = requireSupabase();
  if (supabase) {
    supabase.auth.onAuthStateChange(() => {
      syncAuthNav(target);
    });
  }
}
