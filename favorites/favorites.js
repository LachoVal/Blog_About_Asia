import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { getFavorites } from '/src/lib/favorites.js';
import { toPostRoute } from '/src/router/router.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const list = document.querySelector('#favorites-list');
const favorites = getFavorites();

if (!favorites.length) {
  list.innerHTML = '<p class="text-body-secondary mb-0">No favorites yet. Open a post and save one.</p>';
} else {
  list.innerHTML = favorites
    .map(
      (post) => `
        <a class="list-group-item list-group-item-action" href="${toPostRoute(post.id)}">
          ${post.title}
        </a>
      `
    )
    .join('');
}
