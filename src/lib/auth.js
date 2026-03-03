import { requireSupabase } from '/src/lib/supabaseClient.js';

const LOGIN_PATH = '/login/index.html';

const PROTECTED_PATHS = new Set([
  '/post.html',
  '/create-post.html',
  '/my-posts.html',
  '/favorites.html',
  '/admin.html',
  '/create-post',
  '/create-post/',
  '/create-post/index.html',
  '/favorites',
  '/favorites/',
  '/favorites/index.html',
  '/my-posts',
  '/my-posts/',
  '/admin',
  '/admin/',
  '/admin/index.html'
]);

function normalizePath(pathname) {
  if (!pathname) {
    return '/';
  }

  return pathname.toLowerCase();
}

function isProtectedGuestPath(pathname = window.location.pathname) {
  const normalized = normalizePath(pathname);
  return PROTECTED_PATHS.has(normalized);
}

export function getLoginPath() {
  return LOGIN_PATH;
}

export async function getCurrentUser() {
  const supabase = requireSupabase();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

export async function redirectGuestFromProtectedPage() {
  if (!isProtectedGuestPath()) {
    return false;
  }

  const currentUser = await getCurrentUser();
  if (currentUser) {
    return false;
  }

  window.location.replace(LOGIN_PATH);
  return true;
}
