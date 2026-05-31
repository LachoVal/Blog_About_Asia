import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { getLoginPath, redirectGuestFromProtectedPage } from '/src/lib/auth.js';
import { translate } from '/src/lib/i18n.js';

mountHeader('#app-header');
mountFooter('#app-footer');

document.title = `${translate('createNewPostTitle')} | Asian Travel Blog`;

const form = document.querySelector('#create-post-form');
const message = document.querySelector('#create-post-message');
const heading = document.querySelector('main h1');
const submitButton = form.querySelector('button[type="submit"]');
const countryGroup = form.querySelector('#post-country-group');
const countrySelect = form.querySelector('#post-country-id');

const editPostId = new URLSearchParams(window.location.search).get('edit');
const state = {
  currentRole: null,
  loadedPost: null
};

async function getAuthenticatedSession() {
  const supabase = requireSupabase();
  if (!supabase) {
    window.location.replace(getLoginPath());
    return { supabase: null, session: null };
  }

  const { data } = await supabase.auth.getSession();
  if (!data?.session) {
    window.location.replace(getLoginPath());
    return { supabase, session: null };
  }

  return { supabase, session: data.session };
}

redirectGuestFromProtectedPage();

async function getCurrentRole(supabase, userId) {
  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.role || null;
}

async function populateCountryOptions(supabase, selectedCountryId) {
  if (!countryGroup || !countrySelect) {
    return;
  }

  const language = localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
  const { data, error } = await supabase
    .from('countries')
    .select('id, name_en, name_bg')
    .order('name_en', { ascending: true });

  if (error) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error.message;
    return;
  }

  countrySelect.innerHTML = `<option value="">${translate('postCountryPlaceholder')}</option>`;
  (data || []).forEach((country) => {
    const option = document.createElement('option');
    option.value = String(country.id);
    option.textContent = language === 'bg'
      ? country.name_bg || country.name_en || ''
      : country.name_en || country.name_bg || '';
    countrySelect.appendChild(option);
  });

  if (selectedCountryId !== null && selectedCountryId !== undefined) {
    countrySelect.value = String(selectedCountryId);
  }

  countryGroup.classList.remove('d-none');
}

async function loadPostForEditing() {
  if (!editPostId) {
    return;
  }

  const { supabase, session } = await getAuthenticatedSession();
  if (!supabase || !session) {
    return;
  }

  heading.textContent = translate('editPost');
  submitButton.textContent = translate('saveChanges');
  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = translate('loadingPost');

  const { data, error } = await supabase
    .from('posts')
    .select('id, title, content, image_url, country_id')
    .eq('id', editPostId)
    .maybeSingle();

  if (error || !data) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error?.message || translate('failedLoadCountryPosts');
    return;
  }

  state.loadedPost = data;
  state.currentRole = await getCurrentRole(supabase, session.user.id);

  const titleInput = form.querySelector('#post-title');
  const contentInput = form.querySelector('#post-content');
  const imageUrlInput = form.querySelector('#post-image-url');
  titleInput.value = data.title || '';
  contentInput.value = data.content || '';
  if (imageUrlInput) {
    imageUrlInput.value = data.image_url || '';
  }
  if (state.currentRole === 'admin') {
    await populateCountryOptions(supabase, data.country_id);
  }

  message.className = 'mt-3 mb-0 text-success';
  message.textContent = translate('editModeEnabled');
}

loadPostForEditing();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.className = 'mt-3 mb-0 text-body-secondary';
  message.textContent = editPostId ? translate('editingPost') : translate('publishingPost');

  const { supabase, session } = await getAuthenticatedSession();
  if (!supabase || !session) {
    return;
  }

  const formData = new FormData(form);
  const title = String(formData.get('title') || '');
  const content = String(formData.get('content') || '');
  const imageUrlValue = formData.get('image_url');
  const countryIdValue = formData.get('country_id');
  const hasImageInput = form.querySelector('[name="image_url"]') !== null;
  const hasCountryInput = form.querySelector('[name="country_id"]') !== null && !countryGroup?.classList.contains('d-none');
  const image_url = hasImageInput
    ? (typeof imageUrlValue === 'string' && imageUrlValue.trim() ? imageUrlValue.trim() : null)
    : (state.loadedPost?.image_url ?? null);
  const parsedCountryId = Number(countryIdValue);
  const fallbackCountryId = state.loadedPost?.country_id ?? null;
  const country_id = hasCountryInput
    ? (Number.isInteger(parsedCountryId) && parsedCountryId > 0 ? parsedCountryId : fallbackCountryId)
    : fallbackCountryId;

  let error;
  if (editPostId) {
    ({ error } = await supabase
      .from('posts')
      .update({ title, content, image_url, country_id, is_approved: false })
      .eq('id', editPostId));
  } else {
    ({ error } = await supabase
      .from('posts')
      .insert({ title, content, author_id: session.user.id }));
  }

  if (error) {
    message.className = 'mt-3 mb-0 text-danger';
    message.textContent = error.message;
    return;
  }

  if (editPostId) {
    alert(translate('postUpdatedSentReview'));
    window.location.replace('/my-posts.html');
    return;
  }

  form.reset();
  message.className = 'mt-3 mb-0 text-success';
  message.textContent = translate('postPublished');
});
