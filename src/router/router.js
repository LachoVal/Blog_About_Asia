export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ADMIN: '/admin',
  POSTS: '/posts/{id}',
  CREATE_POST: '/create-post',
  FAVORITES: '/favorites'
};

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function getCurrentPathname() {
  return normalizePathname(window.location.pathname);
}

export function matchRoute(pathname = getCurrentPathname()) {
  const normalized = normalizePathname(pathname);

  if (normalized === ROUTES.HOME) {
    return { key: 'HOME', pattern: ROUTES.HOME, params: {} };
  }

  if (normalized === ROUTES.LOGIN) {
    return { key: 'LOGIN', pattern: ROUTES.LOGIN, params: {} };
  }

  if (normalized === ROUTES.REGISTER) {
    return { key: 'REGISTER', pattern: ROUTES.REGISTER, params: {} };
  }

  if (normalized === ROUTES.ADMIN) {
    return { key: 'ADMIN', pattern: ROUTES.ADMIN, params: {} };
  }

  if (normalized === ROUTES.CREATE_POST) {
    return { key: 'CREATE_POST', pattern: ROUTES.CREATE_POST, params: {} };
  }

  if (normalized === ROUTES.FAVORITES) {
    return { key: 'FAVORITES', pattern: ROUTES.FAVORITES, params: {} };
  }

  const postsMatch = normalized.match(/^\/posts\/([^/?#]+)$/);
  if (postsMatch) {
    return {
      key: 'POSTS',
      pattern: ROUTES.POSTS,
      params: { id: decodeURIComponent(postsMatch[1]) }
    };
  }

  if (normalized === '/posts') {
    return {
      key: 'POSTS',
      pattern: ROUTES.POSTS,
      params: {}
    };
  }

  return null;
}

export function getCurrentRouteBase(pathname = getCurrentPathname()) {
  const matchedRoute = matchRoute(pathname);
  if (!matchedRoute) {
    return pathname;
  }

  if (matchedRoute.key === 'POSTS') {
    return '/posts';
  }

  return matchedRoute.pattern;
}

export function toPostRoute(postId) {
  return `/posts/${encodeURIComponent(String(postId))}`;
}

export function getPostIdFromRoute(defaultId = '1') {
  const matchedRoute = matchRoute();
  if (matchedRoute?.key === 'POSTS' && matchedRoute.params.id) {
    return matchedRoute.params.id;
  }

  return new URLSearchParams(window.location.search).get('id') || defaultId;
}

export function isRouteActive(targetRoute, pathname = getCurrentPathname()) {
  const currentBaseRoute = getCurrentRouteBase(pathname);
  return targetRoute === currentBaseRoute;
}
