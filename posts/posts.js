import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { addFavorite } from '/src/lib/favorites.js';
import { getPostIdFromRoute } from '/src/router/router.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const demoPostMap = {
  '1': {
    title: 'Tokyo in 48 Hours',
    content: 'Explore Shibuya, Asakusa, and Tsukiji with this fast-paced Tokyo itinerary.'
  },
  '2': {
    title: 'Hanoi Street Food Walk',
    content: 'Try phở, bún chả, and egg coffee while walking through Hanoi’s old quarter.'
  },
  '3': {
    title: 'Bali Sunrise Spots',
    content: 'From Mount Batur to Campuhan Ridge Walk, these are Bali’s best sunrise views.'
  }
};

const postId = getPostIdFromRoute('1');
const post = demoPostMap[postId] || {
  title: `Post ${postId}`,
  content: 'Post content is not available yet. You can connect this route to your backend table.'
};

const postIdLabel = document.querySelector('#post-id');
const postTitle = document.querySelector('#post-title');
const postContent = document.querySelector('#post-content');
const saveFavoriteButton = document.querySelector('#save-favorite');
const postMessage = document.querySelector('#post-message');

postIdLabel.textContent = `Post ID: ${postId}`;
postTitle.textContent = post.title;
postContent.textContent = post.content;

saveFavoriteButton.addEventListener('click', () => {
  addFavorite({ id: postId, title: post.title });
  postMessage.className = 'mt-3 mb-0 text-success';
  postMessage.textContent = 'Saved to favorites.';
});
