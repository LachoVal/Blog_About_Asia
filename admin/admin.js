import { Modal, Tooltip } from 'bootstrap';
import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { redirectGuestFromProtectedPage } from '/src/lib/auth.js';
import { translate } from '/src/lib/i18n.js';

mountHeader('#app-header', '/admin');
mountFooter('#app-footer');

const dashboard = document.querySelector('#admin-dashboard');

const pendingPostsMessage = document.querySelector('#pending-posts-message');
const pendingPostsTableWrap = document.querySelector('#pending-posts-table-wrap');
const pendingPostsTbody = document.querySelector('#pending-posts-tbody');

const countriesMessage = document.querySelector('#countries-message');
const countriesTableWrap = document.querySelector('#countries-table-wrap');
const countriesTbody = document.querySelector('#countries-tbody');

const addCountryButton = document.querySelector('#add-country-button');
const countryModalElement = document.querySelector('#countryModal');
const countryModalLabel = document.querySelector('#countryModalLabel');
const countryForm = document.querySelector('#country-form');
const countryFormSubmit = document.querySelector('#country-form-submit');
const countryFormMessage = document.querySelector('#country-form-message');
const countryIdInput = document.querySelector('#country-id');
const inputLanguageSelect = document.querySelector('#input-language');
const countryNameInput = document.querySelector('#admin-country-name');
const countryDescriptionInput = document.querySelector('#admin-country-desc');
const countryImageUrlInput = document.querySelector('#country-image-url');

const countryFieldCopy = {
  en: {
    nameLabel: 'Country Name',
    namePlaceholder: 'Enter the country name in English',
    descriptionLabel: 'Country Description',
    descriptionPlaceholder: 'Enter the country description in English'
  },
  bg: {
    nameLabel: 'Име на държавата',
    namePlaceholder: 'Въведете името на държавата на български',
    descriptionLabel: 'Описание на държавата',
    descriptionPlaceholder: 'Въведете описанието на държавата на български'
  }
};

const state = {
  supabase: null,
  countries: [],
  pendingPosts: [],
  countryModal: null,
  countryMode: 'create',
  countryDraftLanguage: 'en',
  countryDrafts: {
    en: { name: '', description: '' },
    bg: { name: '', description: '' }
  }
};

function redirectToHome() {
  window.location.replace('/index.html');
}

function showAlert(target, text, variant = 'info') {
  target.className = `alert alert-${variant}`;
  target.textContent = text;
  target.classList.remove('d-none');
}

function hideAlert(target) {
  target.classList.add('d-none');
  target.textContent = '';
}

function setCountryFormMessage(text, variant = 'secondary') {
  countryFormMessage.className = `small mt-3 mb-0 text-${variant}`;
  countryFormMessage.textContent = text;
}

function clearCountryFormMessage() {
  countryFormMessage.className = 'small mt-3 mb-0';
  countryFormMessage.textContent = '';
}

function getCountryFormLanguage() {
  return inputLanguageSelect.value === 'bg' ? 'bg' : 'en';
}

function readCountryDraft(language) {
  const selectedLanguage = language === 'bg' ? 'bg' : 'en';
  return state.countryDrafts[selectedLanguage] || { name: '', description: '' };
}

function writeCountryDraft(language, name, description) {
  const selectedLanguage = language === 'bg' ? 'bg' : 'en';
  state.countryDrafts[selectedLanguage] = {
    name: String(name || ''),
    description: String(description || '')
  };
}

function getCountryFormDataForLanguage(country, language) {
  const selectedLanguage = language === 'bg' ? 'bg' : 'en';
  return {
    name: country?.[`name_${selectedLanguage}`] || '',
    description: country?.[`description_${selectedLanguage}`] || ''
  };
}

function syncCountryFormFieldsForLanguage(language, country = null) {
  const selectedLanguage = language === 'bg' ? 'bg' : 'en';
  state.countryDraftLanguage = selectedLanguage;
  inputLanguageSelect.value = selectedLanguage;

  const copy = countryFieldCopy[selectedLanguage];
  document.querySelector('label[for="admin-country-name"]').textContent = copy.nameLabel;
  document.querySelector('label[for="admin-country-desc"]').textContent = copy.descriptionLabel;
  countryNameInput.placeholder = copy.namePlaceholder;
  countryDescriptionInput.placeholder = copy.descriptionPlaceholder;

  if (country) {
    const values = getCountryFormDataForLanguage(country, selectedLanguage);
    countryNameInput.value = values.name;
    countryDescriptionInput.value = values.description;
    return;
  }

  const draft = readCountryDraft(selectedLanguage);
  countryNameInput.value = draft.name;
  countryDescriptionInput.value = draft.description;
}

function updateCurrentCountryDraft() {
  writeCountryDraft(state.countryDraftLanguage, countryNameInput.value, countryDescriptionInput.value);
}

async function translateText(value, sourceLanguage, targetLanguage) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(sourceLanguage)}|${encodeURIComponent(targetLanguage)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Translation service is unavailable right now.');
  }

  const data = await response.json();
  const translatedText = data?.responseData?.translatedText || data?.matches?.[0]?.translation;

  if (!translatedText) {
    throw new Error('Unable to translate the provided text.');
  }

  return String(translatedText).trim();
}

function normalizeCountryName(value) {
  return String(value || '').trim().toLowerCase();
}

function getSelectedLanguage() {
  return localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
}

function getCountryLocalizedValue(country, baseKey) {
  const language = getSelectedLanguage();
  if (language === 'bg') {
    return country?.[`${baseKey}_bg`] || country?.[`${baseKey}_en`] || '';
  }

  return country?.[`${baseKey}_en`] || country?.[`${baseKey}_bg`] || '';
}

function isDuplicateCountryName(name, excludeCountryId = null) {
  const normalized = normalizeCountryName(name);
  if (!normalized) {
    return false;
  }

  return state.countries.some((country) => {
    if (excludeCountryId && String(country.id) === String(excludeCountryId)) {
      return false;
    }

    return normalizeCountryName(getCountryLocalizedValue(country, 'name')) === normalized;
  });
}

function toSafeImageUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: 'Image URL must start with http:// or https://.' };
    }

    return { value: parsed.toString() };
  } catch {
    return { error: 'Please provide a valid image URL.' };
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(dateString) {
  if (!dateString) {
    return '—';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const language = localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
  const locale = language === 'bg' ? 'bg-BG' : 'en-US';

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function initTooltips(container) {
  const triggers = container.querySelectorAll('[data-bs-toggle="tooltip"]');
  triggers.forEach((element) => {
    Tooltip.getOrCreateInstance(element);
  });
}

function renderPendingPosts() {
  if (!Array.isArray(state.pendingPosts) || state.pendingPosts.length === 0) {
    pendingPostsTableWrap.classList.add('d-none');
    showAlert(pendingPostsMessage, 'No pending posts at the moment.', 'light');
    return;
  }

  hideAlert(pendingPostsMessage);
  pendingPostsTbody.innerHTML = state.pendingPosts
    .map((post) => {
      const authorName = post.profiles?.username || 'Unknown';
      const countryName = getCountryLocalizedValue(post.countries, 'name') || 'Unknown';

      return `
        <tr data-post-id="${post.id}">
          <td>${escapeHtml(post.title || 'Untitled Post')}</td>
          <td>${escapeHtml(authorName)}</td>
          <td>${escapeHtml(countryName)}</td>
          <td>${formatDate(post.created_at)}</td>
          <td class="text-end">
            <div class="d-inline-flex gap-2">
              <a
                class="btn btn-primary btn-sm"
                href="/post.html?id=${encodeURIComponent(post.id)}"
                aria-label="${translate('viewLabel')}"
                data-bs-toggle="tooltip"
                data-bs-title="${translate('viewLabel')}"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </a>
              <button
                type="button"
                class="btn btn-success btn-sm js-approve-post"
                data-post-id="${post.id}"
                aria-label="${translate('approveLabel')}"
                data-bs-toggle="tooltip"
                data-bs-title="${translate('approveLabel')}"
              >
                <i class="bi bi-check-lg" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="btn btn-warning btn-sm js-edit-post"
                data-post-id="${post.id}"
                aria-label="${translate('editLabel')}"
                data-bs-toggle="tooltip"
                data-bs-title="${translate('editLabel')}"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="btn btn-danger btn-sm js-delete-post"
                data-post-id="${post.id}"
                aria-label="${translate('deleteLabel')}"
                data-bs-toggle="tooltip"
                data-bs-title="${translate('deleteLabel')}"
              >
                <i class="bi bi-trash" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  pendingPostsTableWrap.classList.remove('d-none');
  initTooltips(pendingPostsTbody);
}

function renderCountries() {
  if (!Array.isArray(state.countries) || state.countries.length === 0) {
    countriesTableWrap.classList.add('d-none');
    showAlert(countriesMessage, 'No countries added yet.', 'light');
    return;
  }

  hideAlert(countriesMessage);
  countriesTbody.innerHTML = state.countries
    .map((country) => `
      <tr data-country-id="${country.id}">
        <td>${escapeHtml(getCountryLocalizedValue(country, 'name') || '—')}</td>
        <td>${escapeHtml(getCountryLocalizedValue(country, 'description') || '—')}</td>
        <td>
          ${country.image_url ? `<a href="${escapeHtml(country.image_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(country.image_url)}</a>` : '—'}
        </td>
        <td class="text-end">
          <div class="d-inline-flex gap-2">
            <button
              type="button"
              class="btn btn-warning btn-sm js-edit-country"
              data-country-id="${country.id}"
              aria-label="${translate('editLabel')}"
              data-bs-toggle="tooltip"
              data-bs-title="${translate('editLabel')}"
            >
              <i class="bi bi-pencil" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="btn btn-danger btn-sm js-delete-country"
              data-country-id="${country.id}"
              aria-label="${translate('deleteLabel')}"
              data-bs-toggle="tooltip"
              data-bs-title="${translate('deleteLabel')}"
            >
              <i class="bi bi-trash" aria-hidden="true"></i>
            </button>
          </div>
        </td>
      </tr>
    `)
    .join('');

  countriesTableWrap.classList.remove('d-none');
  initTooltips(countriesTbody);
}

async function fetchPendingPosts() {
  const { data, error } = await state.supabase
    .from('posts')
    .select('id, title, created_at, is_approved, profiles(username), countries(name_en, name_bg)')
    .eq('is_approved', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  state.pendingPosts = data || [];
  renderPendingPosts();
}

async function fetchCountries() {
  const { data, error } = await state.supabase
    .from('countries')
    .select('id, name_en, name_bg, description_en, description_bg, image_url')
    .order('name_en', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  state.countries = data || [];
  renderCountries();
}

function resetCountryForm(language = getSelectedLanguage()) {
  countryIdInput.value = '';
  inputLanguageSelect.value = 'en';
  countryNameInput.value = '';
  countryDescriptionInput.value = '';
  countryImageUrlInput.value = '';
  clearCountryFormMessage();
}

function openCountryCreateModal() {
  state.countryMode = 'create';
  resetCountryForm(getSelectedLanguage());
  countryModalLabel.textContent = 'Add New Country';
  countryFormSubmit.textContent = 'Save Country';
  syncCountryFormFieldsForLanguage('en');
  state.countryModal.show();
}

function openCountryEditModal(countryId) {
  const country = state.countries.find((item) => String(item.id) === String(countryId));
  if (!country) {
    showAlert(countriesMessage, 'Country not found.', 'danger');
    return;
  }

  state.countryMode = 'edit';
  resetCountryForm(getSelectedLanguage());
  countryModalLabel.textContent = 'Edit Country';
  countryFormSubmit.textContent = 'Save Changes';

  countryIdInput.value = country.id;
  syncCountryFormFieldsForLanguage('en', country);
  countryImageUrlInput.value = country.image_url || '';
  state.countryModal.show();
}

async function approvePost(postId) {
  const { error } = await state.supabase
    .from('posts')
    .update({ is_approved: true })
    .eq('id', postId);

  if (error) {
    showAlert(pendingPostsMessage, error.message, 'danger');
    return;
  }

  state.pendingPosts = state.pendingPosts.filter((post) => String(post.id) !== String(postId));
  renderPendingPosts();
}

function editPost(postId) {
  window.location.assign(`/create-post/index.html?edit=${encodeURIComponent(postId)}`);
}

async function deletePost(postId) {
  const shouldDelete = window.confirm(translate('confirmDeletePost'));
  if (!shouldDelete) {
    return;
  }

  const { error } = await state.supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    showAlert(pendingPostsMessage, error.message, 'danger');
    return;
  }

  state.pendingPosts = state.pendingPosts.filter((post) => String(post.id) !== String(postId));
  renderPendingPosts();
}

async function deleteCountry(countryId) {
  const shouldDelete = window.confirm(translate('confirmDeleteCountry'));
  if (!shouldDelete) {
    return;
  }

  const { error } = await state.supabase
    .from('countries')
    .delete()
    .eq('id', countryId);

  if (error) {
    showAlert(countriesMessage, error.message, 'danger');
    return;
  }

  state.countries = state.countries.filter((country) => String(country.id) !== String(countryId));
  renderCountries();
}

async function handleCountryFormSubmit(event) {
  return addNewCountry(event);
}

async function addNewCountry(event) {
  event.preventDefault();

  const submitButton = countryFormSubmit;
  const inputLanguage = getCountryFormLanguage();
  const name = countryNameInput.value.trim();
  const description = countryDescriptionInput.value.trim();
  const imageUrl = countryImageUrlInput.value.trim();
  const isEditMode = state.countryMode === 'edit';
  const countryId = countryIdInput.value;

  writeCountryDraft(inputLanguage, name, description);

  if (!name) {
    setCountryFormMessage('Country name is required.', 'danger');
    return;
  }

  if (isDuplicateCountryName(name, isEditMode ? countryId : null)) {
    setCountryFormMessage('A country with this name already exists.', 'danger');
    return;
  }

  const parsedImage = toSafeImageUrl(imageUrl);
  if (parsedImage?.error) {
    setCountryFormMessage(parsedImage.error, 'danger');
    return;
  }

  const submitLabel = isEditMode ? 'Save Changes' : 'Save Country';
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';
  setCountryFormMessage(isEditMode ? 'Saving changes...' : 'Creating country...', 'secondary');

  const sourceLanguage = inputLanguage === 'bg' ? 'bg' : 'en';
  const targetLanguage = sourceLanguage === 'bg' ? 'en' : 'bg';
  const translatedName = await translateText(name, sourceLanguage, targetLanguage);
  const translatedDescription = await translateText(description, sourceLanguage, targetLanguage);

  const payload = sourceLanguage === 'bg'
    ? {
        name_bg: name,
        description_bg: description || null,
        name_en: translatedName,
        description_en: translatedDescription || null,
        image_url: parsedImage?.value ?? null
      }
    : {
        name_en: name,
        description_en: description || null,
        name_bg: translatedName,
        description_bg: translatedDescription || null,
        image_url: parsedImage?.value ?? null
      };

  try {
    if (isEditMode) {
      const { data, error } = await state.supabase
        .from('countries')
        .update(payload)
        .eq('id', countryId)
        .select('id, name_en, name_bg, description_en, description_bg, image_url')
        .maybeSingle();

      if (error || !data) {
        setCountryFormMessage(error?.message || 'Unable to update country.', 'danger');
        return;
      }

      state.countries = state.countries.map((country) => {
        if (String(country.id) !== String(countryId)) {
          return country;
        }

        return data;
      });
    } else {
      const { data, error } = await state.supabase
        .from('countries')
        .insert(payload)
        .select('id, name_en, name_bg, description_en, description_bg, image_url')
        .maybeSingle();

      if (error || !data) {
        setCountryFormMessage(error?.message || 'Unable to create country.', 'danger');
        return;
      }

      state.countries = [data, ...state.countries];
    }

    state.countries.sort((a, b) => {
      const aName = getCountryLocalizedValue(a, 'name').toLowerCase();
      const bName = getCountryLocalizedValue(b, 'name').toLowerCase();
      return aName.localeCompare(bName);
    });

    renderCountries();
    state.countryModal.hide();
    hideAlert(countriesMessage);
    clearCountryFormMessage();
    state.countryDrafts = {
      en: { name: '', description: '' },
      bg: { name: '', description: '' }
    };
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = submitLabel;
  }
}

function wireEvents() {
  addCountryButton.addEventListener('click', () => {
    openCountryCreateModal();
  });

  countryModalElement.addEventListener('hidden.bs.modal', () => {
    countryFormSubmit.disabled = false;
    resetCountryForm();
  });

  countryForm.addEventListener('submit', handleCountryFormSubmit);

  inputLanguageSelect.addEventListener('change', () => {
    const countryId = countryIdInput.value;
    const country = state.countries.find((item) => String(item.id) === String(countryId)) || null;

    inputLanguageSelect.value = 'en';
    const selectedLanguage = 'en';

    updateCurrentCountryDraft();

    if (countryId && country) {
      syncCountryFormFieldsForLanguage(selectedLanguage, country);
      return;
    }

    syncCountryFormFieldsForLanguage(selectedLanguage);
  });

  countryNameInput.addEventListener('input', updateCurrentCountryDraft);
  countryDescriptionInput.addEventListener('input', updateCurrentCountryDraft);

  pendingPostsTbody.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button');
    if (!actionButton) {
      return;
    }

    const postId = actionButton.getAttribute('data-post-id');
    if (!postId) {
      return;
    }

    if (actionButton.classList.contains('js-approve-post')) {
      await approvePost(postId);
      return;
    }

    if (actionButton.classList.contains('js-edit-post')) {
      editPost(postId);
      return;
    }

    if (actionButton.classList.contains('js-delete-post')) {
      await deletePost(postId);
    }
  });

  countriesTbody.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button');
    if (!actionButton) {
      return;
    }

    const countryId = actionButton.getAttribute('data-country-id');
    if (!countryId) {
      return;
    }

    if (actionButton.classList.contains('js-edit-country')) {
      openCountryEditModal(countryId);
      return;
    }

    if (actionButton.classList.contains('js-delete-country')) {
      await deleteCountry(countryId);
    }
  });
}

async function ensureAdmin() {
  const redirected = await redirectGuestFromProtectedPage();
  if (redirected) {
    return;
  }

  const supabase = requireSupabase();
  if (!supabase) {
    redirectToHome();
    return;
  }

  state.supabase = supabase;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.user?.id) {
    redirectToHome();
    return;
  }

  const userId = sessionData.session.user.id;
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') {
    redirectToHome();
    return;
  }

  dashboard.classList.remove('d-none');

  try {
    showAlert(pendingPostsMessage, 'Loading pending posts...', 'secondary');
    showAlert(countriesMessage, 'Loading countries...', 'secondary');

    await Promise.all([fetchPendingPosts(), fetchCountries()]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load admin data.';
    showAlert(pendingPostsMessage, message, 'danger');
    showAlert(countriesMessage, message, 'danger');
  }
}

function initAdminDashboard() {
  state.countryModal = Modal.getOrCreateInstance(countryModalElement);
  wireEvents();
  ensureAdmin();
}

document.addEventListener('languagechange', () => {
  if (state.pendingPosts.length) {
    renderPendingPosts();
  }

  if (state.countries.length) {
    renderCountries();
  }

  if (countryIdInput.value) {
    const country = state.countries.find((item) => String(item.id) === String(countryIdInput.value)) || null;
    if (country) {
      syncCountryFormFieldsForLanguage(getSelectedLanguage(), country);
    }
  }
});

initAdminDashboard();
