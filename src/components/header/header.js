import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import headerTemplate from './header.html?raw';
import './header.css';

export function mountHeader(targetSelector, currentRoute) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    return;
  }

  target.innerHTML = headerTemplate;
  const links = target.querySelectorAll('[data-route]');

  links.forEach((link) => {
    const route = link.getAttribute('data-route');
    const isPostsRoute = route === '/posts' && currentRoute.startsWith('/posts');
    const isActive = route === currentRoute || isPostsRoute;
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}
