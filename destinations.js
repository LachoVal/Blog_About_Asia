import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { getLoginPath } from '/src/lib/auth.js';
import { translate } from '/src/lib/i18n.js';

mountHeader('#app-header');
mountFooter('#app-footer');

document.title = `${translate('exploreAsianDestinations')} | Asian Travel Blog`;

const grid = document.querySelector('#countries-container') || document.querySelector('#destinationsGrid');
const loading = document.querySelector('#destinations-loading');
const message = document.querySelector('#destinations-message');

const IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1526481280695-3c4691f5e66c?auto=format&fit=crop&w=1200&q=80';

let currentUser = null;

function showMessage(text) {
  message.textContent = text;
  message.classList.remove('d-none');
}

function hideMessage() {
  message.textContent = '';
  message.classList.add('d-none');
}

function hideLoading() {
  loading.classList.add('d-none');
}

function getSelectedLanguage() {
  return localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
}

function getLocalizedCountryValue(country, language, baseKey) {
  const localizedKey = `${baseKey}_${language}`;
  const fallbackKey = `${baseKey}_en`;

  return country[localizedKey] || country[fallbackKey] || '';
}

function toCountryFilterHref(countryId) {
  return `/country-articles.html?country_id=${encodeURIComponent(countryId)}`;
}

function createCountryCard(country) {
  const column = document.createElement('div');
  column.className = 'col';

  const card = document.createElement('article');
  card.className = 'card h-100 shadow-sm';

  const imageLink = document.createElement('a');
  imageLink.href = currentUser ? toCountryFilterHref(country.id) : getLoginPath();

  const image = document.createElement('img');
  image.className = 'card-img-top';
  image.src = country.image_url || IMAGE_PLACEHOLDER;
  image.alt = country.name || translate('postCoverImage');
  image.style.height = '250px';
  image.style.objectFit = 'cover';

  imageLink.appendChild(image);

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body d-flex flex-column';

  const title = document.createElement('h2');
  title.className = 'h5 card-title';
  title.textContent = country.name || translate('unknownCountry');

  const description = document.createElement('p');
  description.className = 'card-text text-body-secondary';
  description.textContent = country.description || translate('unknownContent');

  const button = document.createElement('a');
  button.className = 'btn btn-primary mt-auto';
  button.href = currentUser ? toCountryFilterHref(country.id) : getLoginPath();
  button.textContent = translate('read');

  cardBody.append(title, description, button);
  card.append(imageLink, cardBody);
  column.appendChild(card);

  return column;
}

function renderDestinations(countries) {
  grid.innerHTML = '';

  if (!countries.length) {
    showMessage(translate('noDestinationsFound'));
    return;
  }

  const fragment = document.createDocumentFragment();
  countries.forEach((country) => {
    fragment.appendChild(createCountryCard(country));
  });

  grid.appendChild(fragment);
}

async function fetchCountries(supabase) {
  const { data, error } = await supabase
    .from('countries')
    .select('id, name_en, description_en, name_bg, description_bg, image_url')
    .order('name_en', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

function normalizeCountriesForLanguage(countries, language) {
  return countries.map((country) => ({
    ...country,
    name: getLocalizedCountryValue(country, language, 'name'),
    description: getLocalizedCountryValue(country, language, 'description')
  }));
}

async function fetchAndRenderCountries() {
  hideMessage();

  const supabase = requireSupabase();
  if (!supabase) {
    hideLoading();
    showMessage(translate('supabaseMissing'));
    return;
  }

  const language = getSelectedLanguage();

  try {
    const countries = await fetchCountries(supabase);
    const localizedCountries = normalizeCountriesForLanguage(countries, language);
    hideLoading();
    renderDestinations(localizedCountries);
    document.title = `${translate('exploreAsianDestinations', language)} | Asian Travel Blog`;
  } catch (error) {
    hideLoading();
    showMessage(error?.message || translate('failedLoadCountryPosts'));
  }
}

async function init() {
  const supabase = requireSupabase();
  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    currentUser = sessionData?.session?.user || null;
  }

  await fetchAndRenderCountries();
}

document.addEventListener('languagechange', () => {
  fetchAndRenderCountries();
});

init();