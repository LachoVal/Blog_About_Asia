import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { toPostRoute } from '/src/router/router.js';

const featuredPosts = [
  { id: 1, title: 'Tokyo in 48 Hours', excerpt: 'A compact guide to food, transit, and culture.' },
  { id: 2, title: 'Hanoi Street Food Walk', excerpt: 'Where to eat and what to try in the Old Quarter.' },
  { id: 3, title: 'Bali Sunrise Spots', excerpt: 'Top sunrise views across Ubud and nearby peaks.' }
];

mountHeader('#app-header');
mountFooter('#app-footer');

const postsContainer = document.querySelector('#featured-posts');
postsContainer.innerHTML = featuredPosts
  .map(
    (post) => `
      <article class="col-12 col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex flex-column">
            <h2 class="h5 card-title">${post.title}</h2>
            <p class="card-text text-body-secondary">${post.excerpt}</p>
            <div class="mt-auto d-flex gap-2">
              <a class="btn btn-primary btn-sm" href="${toPostRoute(post.id)}">Read Post</a>
              <a class="btn btn-outline-secondary btn-sm" href="/favorites">Favorites</a>
            </div>
          </div>
        </div>
      </article>
    `
  )
  .join('');
