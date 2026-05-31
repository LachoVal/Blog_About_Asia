import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { getLoginPath, redirectGuestFromProtectedPage } from '/src/lib/auth.js';
import { translate } from '/src/lib/i18n.js';

mountHeader('#app-header');
mountFooter('#app-footer');

document.title = `${translate('myFavoritePosts')} | Asian Travel Blog`;

const list = document.querySelector('#favorites-list');
const emptyState = document.querySelector('#favorites-empty');
const message = document.querySelector('#favorites-message');

const state = {
  supabase: null,
  currentUser: null,
  favorites: []
};

const COVER_PLACEHOLDER = 'https://images.unsplash.com/photo-1526481280695-3c4691f5e66c?auto=format&fit=crop&w=1200&q=80';

function showMessage(text) {
  message.classList.remove('d-none');
  message.textContent = text;
}

function hideMessage() {
  message.classList.add('d-none');
  message.textContent = '';
}

function normalizeCountryName(countryValue) {
  if (!countryValue) {
    return translate('unknownCountry');
  }

  const language = localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
  const country = Array.isArray(countryValue) ? countryValue[0] : countryValue;

  if (!country) {
    return translate('unknownCountry');
  }

  if (language === 'bg') {
    return country.name_bg || country.name_en || translate('unknownCountry');
  }

  return country.name_en || country.name_bg || translate('unknownCountry');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderEmptyState(isEmpty) {
  emptyState.classList.toggle('d-none', !isEmpty);
  list.classList.toggle('d-none', isEmpty);
}

function createFavoriteCard(favorite) {
  const post = favorite.posts || {};
  const card = document.createElement('article');
  card.className = 'card mb-3';
  card.dataset.favoriteId = String(favorite.id);

  const postTitle = post.title || translate('unknownPost');
  const safePostTitle = escapeHtml(postTitle);
  const countryName = normalizeCountryName(post.countries);
  const safeCountryName = escapeHtml(countryName);

  card.innerHTML = `
    <div class="row g-0">
      <div class="col-md-4 favorite-image-wrap">
        <img src="${post.image_url || COVER_PLACEHOLDER}" class="img-fluid rounded-start favorite-image" alt="${safePostTitle}" />
      </div>
      <div class="col-md-8">
        <div class="card-body h-100 d-flex flex-column justify-content-between gap-3">
          <div>
            <h5 class="card-title mb-2">${safePostTitle}</h5>
            <span class="badge text-bg-primary favorite-country-badge">${safeCountryName}</span>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <a class="btn btn-primary" href="/post.html?id=${post.id}">${translate('read')}</a>
            <button type="button" class="btn btn-danger js-remove-favorite" data-favorite-id="${favorite.id}">
              <i class="bi bi-heart-fill" aria-hidden="true"></i>
              <span class="ms-1">${translate('removeFavorite')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const image = card.querySelector('.favorite-image');
  if (image) {
    image.addEventListener('error', () => {
      if (image.src !== COVER_PLACEHOLDER) {
        image.src = COVER_PLACEHOLDER;
      }
    });
  }

  return card;
}

function renderFavorites() {
  list.innerHTML = '';

  if (!state.favorites.length) {
    renderEmptyState(true);
    return;
  }

  const fragment = document.createDocumentFragment();
  state.favorites.forEach((favorite) => {
    fragment.appendChild(createFavoriteCard(favorite));
  });
  list.appendChild(fragment);

  renderEmptyState(false);
}

function wireLanguageChangeRerender() {
  document.addEventListener('languagechange', () => {
    if (!state.currentUser) {
      return;
    }

    renderFavorites();
  });
}

async function requireCurrentUser() {
  const { data } = await state.supabase.auth.getSession();
  const currentUser = data?.session?.user || null;

  if (!currentUser) {
    window.location.replace(getLoginPath());
    return null;
  }

  state.currentUser = currentUser;
  return currentUser;
}

async function fetchFavorites() {
  const { data, error } = await state.supabase
    .from('favorites')
    .select('id, post_id, posts(id, title, image_url, countries(name_en, name_bg))')
    .eq('user_id', state.currentUser.id)
    .order('id', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  state.favorites = (data || []).filter((entry) => entry?.posts?.id);
}

async function removeFavorite(favoriteRecordId) {
  const { error } = await state.supabase
    .from('favorites')
    .delete()
    .eq('id', favoriteRecordId);

  if (error) {
    throw new Error(error.message);
  }

  state.favorites = state.favorites.filter((favorite) => String(favorite.id) !== String(favoriteRecordId));
  const card = list.querySelector(`[data-favorite-id="${favoriteRecordId}"]`);
  if (card) {
    card.remove();
  }

  if (!state.favorites.length) {
    renderEmptyState(true);
  }
}

list.addEventListener('click', async (event) => {
  const removeButton = event.target.closest('.js-remove-favorite');
  if (!removeButton) {
    return;
  }

  const favoriteRecordId = removeButton.dataset.favoriteId;
  if (!favoriteRecordId) {
    return;
  }

  removeButton.disabled = true;
  hideMessage();

  try {
    await removeFavorite(favoriteRecordId);
  } catch (error) {
    showMessage(error?.message || translate('failedRemoveFavorite'));
    removeButton.disabled = false;
  }
});

async function init() {
  const redirected = await redirectGuestFromProtectedPage();
  if (redirected) {
    return;
  }

  state.supabase = requireSupabase();
  if (!state.supabase) {
    window.location.replace(getLoginPath());
    return;
  }

  wireLanguageChangeRerender();

  try {
    const currentUser = await requireCurrentUser();
    if (!currentUser) {
      return;
    }

    await fetchFavorites();
    renderFavorites();
  } catch (error) {
    showMessage(error?.message || translate('failedLoadFavorites'));
    renderEmptyState(true);
  }
}

init();
