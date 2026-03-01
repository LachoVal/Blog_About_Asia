import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { getFavorites } from '/src/lib/favorites.js';

mountHeader('#app-header', '/favorites');
mountFooter('#app-footer');

const list = document.querySelector('#favorites-list');
const favorites = getFavorites();

if (!favorites.length) {
  list.innerHTML = '<p class="text-body-secondary mb-0">No favorites yet. Open a post and save one.</p>';
} else {
  list.innerHTML = favorites
    .map(
      (post) => `
        <a class="list-group-item list-group-item-action" href="/posts/${post.id}">
          ${post.title}
        </a>
      `
    )
    .join('');
}
