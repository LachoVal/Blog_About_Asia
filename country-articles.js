import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { toPostRoute } from '/src/router/router.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { translate } from '/src/lib/i18n.js';

mountHeader('#app-header');
mountFooter('#app-footer');

document.title = `${translate('countryPosts')} | Asian Travel Blog`;

const title = document.querySelector('#country-articles-title');
const breadcrumbCurrent = document.querySelector('#country-breadcrumb-current');
const loading = document.querySelector('#articles-loading');
const message = document.querySelector('#articles-message');
const empty = document.querySelector('#articles-empty');
const grid = document.querySelector('#articlesGrid');
const categoriesFilterWrap = document.querySelector('#categories-filter-wrap');
const categoriesFilterCount = document.querySelector('#categories-filter-count');
const categoriesFilterList = document.querySelector('#categories-filter-list');
const categoriesFilterEmpty = document.querySelector('#categories-filter-empty');

const params = new URLSearchParams(window.location.search);
const countryId = params.get('country_id');

let currentCountry = null;
let currentPosts = [];
let currentCategories = [];
let selectedCategoryIds = new Set();

const IMAGE_PLACEHOLDER = 'https://images.unsplash.com/photo-1526481280695-3c4691f5e66c?auto=format&fit=crop&w=1200&q=80';

function hideLoading() {
  loading.classList.add('d-none');
}

function showMessage(text) {
  message.textContent = text;
  message.classList.remove('d-none');
}

function showEmpty() {
  empty.classList.remove('d-none');
}

function hideEmpty() {
  empty.classList.add('d-none');
}

function hideAlerts() {
  message.classList.add('d-none');
  message.textContent = '';
  empty.classList.add('d-none');
}

function setCountryContext(countryName) {
  const resolved = countryName || translate('unknownCountry');
  title.textContent = `${translate('postByCountryTitle')} ${resolved}`;
  breadcrumbCurrent.textContent = resolved;
}

function getSelectedLanguage() {
  return localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
}

function getLocalizedCategoryName(category, language) {
  return language === 'bg'
    ? category?.name_bg || category?.name_en || translate('unknownCategory')
    : category?.name_en || category?.name_bg || translate('unknownCategory');
}

function getPostCategory(post) {
  return Array.isArray(post?.categories) ? post.categories[0] : post?.categories;
}

function getVisiblePosts() {
  if (!selectedCategoryIds.size) {
    return [];
  }

  return currentPosts.filter((post) => {
    const category = getPostCategory(post);
    return category?.id && selectedCategoryIds.has(String(category.id));
  });
}

function updateFilterCount() {
  if (!categoriesFilterCount) {
    return;
  }

  categoriesFilterCount.textContent = currentCategories.length ? `${currentCategories.length}` : '';
}

function renderCategoryFilters(language) {
  if (!categoriesFilterWrap || !categoriesFilterList || !categoriesFilterEmpty) {
    return;
  }

  categoriesFilterList.innerHTML = '';
  categoriesFilterEmpty.classList.toggle('d-none', currentCategories.length > 0);
  categoriesFilterWrap.classList.toggle('d-none', currentCategories.length === 0);

  if (!currentCategories.length) {
    updateFilterCount();
    return;
  }

  const fragment = document.createDocumentFragment();
  currentCategories.forEach((category) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-check form-check-inline category-filter-check';

    const input = document.createElement('input');
    input.className = 'form-check-input';
    input.type = 'checkbox';
    input.id = `category-filter-${category.id}`;
    input.value = String(category.id);
    input.checked = selectedCategoryIds.has(String(category.id));

    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.setAttribute('for', input.id);
    label.textContent = getLocalizedCategoryName(category, language);

    wrapper.append(input, label);
    fragment.appendChild(wrapper);
  });

  categoriesFilterList.appendChild(fragment);
  updateFilterCount();
}

function createPostCard(post, countryName) {
  const column = document.createElement('article');
  column.className = 'col';

  const card = document.createElement('div');
  card.className = 'card h-100 shadow-sm';

  const image = document.createElement('img');
  image.src = post.image_url || IMAGE_PLACEHOLDER;
  image.className = 'card-img-top';
  image.alt = post.title || translate('postCoverImage');
  image.style.height = '240px';
  image.style.objectFit = 'cover';

  const body = document.createElement('div');
  body.className = 'card-body d-flex flex-column';

  const badge = document.createElement('span');
  badge.className = 'badge text-bg-light border mb-2 align-self-start';
  badge.textContent = countryName;

  const category = getPostCategory(post);
  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'badge text-bg-secondary mb-2 align-self-start';
  categoryBadge.textContent = category ? getLocalizedCategoryName(category, getSelectedLanguage()) : translate('unknownCategory');

  const heading = document.createElement('h2');
  heading.className = 'h5 card-title';
  heading.textContent = post.title || translate('unknownPost');

  const button = document.createElement('a');
  button.className = 'btn btn-primary mt-auto';
  button.href = toPostRoute(post.id);
  button.textContent = translate('readLabel');

  body.append(badge, categoryBadge, heading, button);
  card.append(image, body);
  column.appendChild(card);

  return column;
}

function renderPosts(posts, countryName) {
  grid.innerHTML = '';

  if (!posts.length) {
    showEmpty();
    return;
  }

  hideEmpty();

  const fragment = document.createDocumentFragment();
  posts.forEach((post) => {
    fragment.appendChild(createPostCard(post, countryName));
  });

  grid.appendChild(fragment);
}

function renderFilteredPosts(countryName) {
  renderPosts(getVisiblePosts(), countryName);
}

async function fetchCountry(supabase, selectedCountryId) {
  const { data, error } = await supabase
    .from('countries')
    .select('id, name_en, name_bg')
    .eq('id', selectedCountryId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
}

async function fetchCountryPosts(supabase, selectedCountryId) {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, image_url, country_id, category_id, created_at, categories:categories!posts_category_id_fkey(id, name_en, name_bg)')
    .eq('is_approved', true)
    .eq('country_id', selectedCountryId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function fetchCategories(supabase) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_en, name_bg')
    .order('name_en', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function init() {
  hideAlerts();

  if (!countryId) {
    hideLoading();
    setCountryContext(translate('unknownCountry'));
    showMessage(translate('missingCountryId'));
    return;
  }

  const supabase = requireSupabase();
  if (!supabase) {
    hideLoading();
    showMessage(translate('supabaseMissing'));
    return;
  }

  try {
    const [country, posts, categories] = await Promise.all([
      fetchCountry(supabase, countryId),
      fetchCountryPosts(supabase, countryId),
      fetchCategories(supabase)
    ]);

    hideLoading();

    if (!country) {
      setCountryContext(translate('unknownCountry'));
      showMessage(translate('countryNotFound'));
      return;
    }

    const language = localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
    const countryName = language === 'bg'
      ? country.name_bg || country.name_en || translate('unknownCountry')
      : country.name_en || country.name_bg || translate('unknownCountry');

    currentCountry = country;
    currentPosts = posts;
    currentCategories = categories;
    selectedCategoryIds = new Set(categories.map((category) => String(category.id)));
    setCountryContext(countryName);
    renderCategoryFilters(language);
    renderFilteredPosts(countryName);
  } catch (error) {
    hideLoading();
    showMessage(error?.message || translate('failedLoadCountryPosts'));
  }
}

document.addEventListener('languagechange', () => {
  if (!currentCountry) {
    return;
  }

  const language = localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
  const countryName = language === 'bg'
    ? currentCountry.name_bg || currentCountry.name_en || translate('unknownCountry')
    : currentCountry.name_en || currentCountry.name_bg || translate('unknownCountry');

  setCountryContext(countryName);
  renderCategoryFilters(language);
  renderFilteredPosts(countryName);
});

categoriesFilterList?.addEventListener('change', (event) => {
  const checkbox = event.target.closest('input[type="checkbox"]');
  if (!checkbox) {
    return;
  }

  const categoryId = String(checkbox.value);
  if (checkbox.checked) {
    selectedCategoryIds.add(categoryId);
  } else {
    selectedCategoryIds.delete(categoryId);
  }

  const language = getSelectedLanguage();
  const countryName = language === 'bg'
    ? currentCountry?.name_bg || currentCountry?.name_en || translate('unknownCountry')
    : currentCountry?.name_en || currentCountry?.name_bg || translate('unknownCountry');

  renderFilteredPosts(countryName);
});

init();