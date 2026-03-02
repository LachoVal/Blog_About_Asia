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
    return;
  }

  const { data } = await supabase.auth.getSession();
  toggleAuthNav(target, Boolean(data?.session));
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
