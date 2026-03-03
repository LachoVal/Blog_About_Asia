import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header');
mountFooter('#app-footer');

const grid = document.querySelector('#destinationsGrid');
const loading = document.querySelector('#destinations-loading');
const message = document.querySelector('#destinations-message');

const IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1526481280695-3c4691f5e66c?auto=format&fit=crop&w=1200&q=80';

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

function toCountryFilterHref(countryId) {
  return `/country-articles.html?country_id=${encodeURIComponent(countryId)}`;
}

function createCountryCard(country) {
  const column = document.createElement('div');
  column.className = 'col';

  const card = document.createElement('article');
  card.className = 'card h-100 shadow-sm';

  const imageLink = document.createElement('a');
  imageLink.href = toCountryFilterHref(country.id);

  const image = document.createElement('img');
  image.className = 'card-img-top';
  image.src = country.image_url || IMAGE_PLACEHOLDER;
  image.alt = country.name || 'Country image';
  image.style.height = '250px';
  image.style.objectFit = 'cover';

  imageLink.appendChild(image);

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body d-flex flex-column';

  const title = document.createElement('h2');
  title.className = 'h5 card-title';
  title.textContent = country.name || 'Unnamed Destination';

  const description = document.createElement('p');
  description.className = 'card-text text-body-secondary';
  description.textContent = country.description || 'No description available yet.';

  const button = document.createElement('a');
  button.className = 'btn btn-primary mt-auto';
  button.href = toCountryFilterHref(country.id);
  button.textContent = 'See Posts';

  cardBody.append(title, description, button);
  card.append(imageLink, cardBody);
  column.appendChild(card);

  return column;
}

function renderDestinations(countries) {
  grid.innerHTML = '';

  if (!countries.length) {
    showMessage('No destinations found.');
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
    .select('id, name, description, image_url')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function init() {
  hideMessage();

  const supabase = requireSupabase();
  if (!supabase) {
    hideLoading();
    showMessage('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.');
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    window.location.assign('/login/index.html');
    return;
  }

  try {
    const countries = await fetchCountries(supabase);
    hideLoading();
    renderDestinations(countries);
  } catch (error) {
    hideLoading();
    showMessage(error?.message || 'Failed to load destinations.');
  }
}

init();