import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { Modal } from 'bootstrap';
import { redirectGuestFromProtectedPage } from '/src/lib/auth.js';
import { translate } from '/src/lib/i18n.js';
import { setMetaTags, applyArticleStructuredData } from '/src/lib/seo.js';

mountHeader('#app-header');
mountFooter('#app-footer');

document.title = `${translate('readPostLabel')} | Asian Travel Blog`;

const COVER_PLACEHOLDER = 'https://images.unsplash.com/photo-1526481280695-3c4691f5e66c?auto=format&fit=crop&w=1600&q=80';

const pageAlert = document.querySelector('#page-alert');
const postLoading = document.querySelector('#post-loading');
const notFound = document.querySelector('#not-found');
const postView = document.querySelector('#post-view');

const postCoverImage = document.querySelector('#post-cover-image');
const postTitle = document.querySelector('#post-title');
const postCountry = document.querySelector('#post-country');
const postCategory = document.querySelector('#post-category');
const postAuthor = document.querySelector('#post-author');
const postDate = document.querySelector('#post-date');
const postContent = document.querySelector('#post-content');

const favoriteButton = document.querySelector('#favorite-button');
const favoriteIcon = document.querySelector('#favorite-icon');
const favoriteLabel = document.querySelector('#favorite-label');
const goToFavoritesButton = document.querySelector('#go-to-favorites-button');
const favoriteMessage = document.querySelector('#favorite-message');

const commentAuthNote = document.querySelector('#comment-auth-note');
const commentForm = document.querySelector('#comment-form');
const commentContent = document.querySelector('#comment-content');
const commentSubmit = document.querySelector('#comment-submit');
const commentFormMessage = document.querySelector('#comment-form-message');
const commentsLoading = document.querySelector('#comments-loading');
const commentsEmpty = document.querySelector('#comments-empty');
const commentsList = document.querySelector('#comments-list');
const editCommentModalElement = document.querySelector('#editCommentModal');
const editCommentIdInput = document.querySelector('#edit-comment-id');
const editCommentTextArea = document.querySelector('#edit-comment-text');
const editCommentSaveButton = document.querySelector('#edit-comment-save');
const editCommentMessage = document.querySelector('#edit-comment-message');

const state = {
  supabase: null,
  postId: '',
  post: null,
  currentUser: null,
  currentProfile: null,
  isAdmin: false,
  favoriteId: null,
  comments: [],
  editCommentModalInstance: null
};

function showGlobalAlert(message, variant = 'warning') {
  pageAlert.className = `alert alert-${variant}`;
  pageAlert.textContent = message;
  pageAlert.classList.remove('d-none');
}

function hideGlobalAlert() {
  pageAlert.classList.add('d-none');
  pageAlert.textContent = '';
}

function setTextMessage(target, message, variant = 'secondary') {
  target.className = `small mt-2 mb-0 text-${variant}`;
  target.textContent = message;
}

function clearTextMessage(target) {
  target.className = 'small mt-2 mb-0';
  target.textContent = '';
}

function setEditModalMessage(message, variant = 'secondary') {
  if (!editCommentMessage) {
    return;
  }

  editCommentMessage.className = `small mt-2 mb-0 text-${variant}`;
  editCommentMessage.textContent = message;
}

function clearEditModalMessage() {
  if (!editCommentMessage) {
    return;
  }

  editCommentMessage.className = 'small mt-2 mb-0';
  editCommentMessage.textContent = '';
}

function extractPostIdFromQuery() {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('id');
}

function formatPublishedDate(value) {
  if (!value) {
    return translate('unknownDate');
  }

  const language = localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
  const locale = language === 'bg' ? 'bg-BG' : 'en-US';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(value));
}

function formatCommentDate(value) {
  if (!value) {
    return '';
  }

  const language = localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
  const locale = language === 'bg' ? 'bg-BG' : 'en-US';

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function escapeHtml(content) {
  return String(content)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toParagraphs(text) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return `<p class="text-body-secondary mb-0">${translate('unknownContent')}</p>`;
  }

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`)
    .join('');
}

function showPostNotFound() {
  postLoading.classList.add('d-none');
  postView.classList.add('d-none');
  notFound.classList.remove('d-none');
}

function renderPost(post) {
  postCoverImage.src = post.image_url || COVER_PLACEHOLDER;
  postCoverImage.alt = post.title || translate('postCoverImage');

  postTitle.textContent = post.title || translate('unknownPost');
  const language = localStorage.getItem('selectedLang') || localStorage.getItem('lang') || 'en';
  const country = Array.isArray(post?.countries) ? post.countries[0] : post?.countries;
  const category = Array.isArray(post?.categories) ? post.categories[0] : post?.categories;
  postCountry.textContent = language === 'bg'
    ? country?.name_bg || country?.name_en || translate('unknownCountry')
    : country?.name_en || country?.name_bg || translate('unknownCountry');
  if (postCategory) {
    postCategory.textContent = language === 'bg'
      ? category?.name_bg || category?.name_en || translate('unknownCategory')
      : category?.name_en || category?.name_bg || translate('unknownCategory');
  }
  postAuthor.textContent = post?.profiles?.username || translate('unknownAuthor');
  postDate.textContent = formatPublishedDate(post.created_at);
  postContent.innerHTML = toParagraphs(post.content);

  // SEO: set page meta tags and structured data for the article
  try {
    const pageUrl = `${location.origin}/post.html?id=${post.id}`;
    const titleText = post.title || translate('unknownPost');
    const rawDescription = (post.content || '').trim().split('\n')[0] || '';
    const description = rawDescription.slice(0, 160);
    const image = post.image_url || COVER_PLACEHOLDER;

    setMetaTags({
      title: `${titleText} | Asian Travel Blog`,
      description,
      canonical: pageUrl,
      image,
      type: 'article'
    });

    applyArticleStructuredData({
      title: titleText,
      description,
      url: pageUrl,
      image,
      authorName: post.profiles?.username,
      datePublished: post.created_at
    });
  } catch (e) {
    // non-fatal
    console.warn('SEO setup failed', e);
  }

  postLoading.classList.add('d-none');
  notFound.classList.add('d-none');
  postView.classList.remove('d-none');
}

async function loadCurrentUser() {
  const { data } = await state.supabase.auth.getSession();
  state.currentUser = data?.session?.user || null;

  if (!state.currentUser) {
    state.currentProfile = null;
    state.isAdmin = false;
    return;
  }

  const { data: profile, error } = await state.supabase
    .from('profiles')
    .select('id, username, role')
    .eq('id', state.currentUser.id)
    .maybeSingle();

  if (error) {
    state.currentProfile = null;
    state.isAdmin = false;
    return;
  }

  state.currentProfile = profile || null;
  state.isAdmin = profile?.role === 'admin';
}

async function fetchPostById(postId) {
  const { data, error } = await state.supabase
    .from('posts')
    .select('id, title, content, image_url, created_at, author_id, country_id, category_id, is_approved, profiles!posts_author_id_fkey(username), countries!posts_country_id_fkey(name_en, name_bg), categories!posts_category_id_fkey(name_en, name_bg)')
    .eq('id', postId)
    .single();

  if (error || !data) {
    window.location.replace('/404.html');
    return null;
  }

  return data;
}

function updateFavoriteButtonUI() {
  const isPending = Boolean(state.post && state.post.is_approved === false);
  if (isPending) {
    favoriteButton.classList.add('d-none');
    goToFavoritesButton?.classList.add('d-none');
    clearTextMessage(favoriteMessage);
    return;
  }

  favoriteButton.classList.remove('d-none');
  goToFavoritesButton?.classList.remove('d-none');

  const isLoggedIn = Boolean(state.currentUser);
  const isOwnPost = Boolean(state.currentUser && state.post && state.currentUser.id === state.post.author_id);
  const isFavorite = Boolean(state.favoriteId);
  favoriteButton.classList.toggle('d-none', isOwnPost);

  favoriteButton.disabled = !isLoggedIn;

  if (!isLoggedIn) {
    favoriteButton.className = 'btn btn-outline-danger btn-lg';
    favoriteIcon.textContent = '♡';
    favoriteLabel.textContent = translate('loginToAddFavorite');
    return;
  }

  if (isOwnPost) {
    clearTextMessage(favoriteMessage);
    return;
  }

  favoriteButton.classList.remove('d-none');

  favoriteButton.className = isFavorite ? 'btn btn-danger btn-lg' : 'btn btn-outline-danger btn-lg';
  favoriteIcon.textContent = isFavorite ? '♥' : '♡';
  favoriteLabel.textContent = isFavorite ? translate('removeFromFavorites') : translate('addToFavorites');
}

async function syncFavoriteState() {
  if (!state.currentUser || !state.post?.id || state.post.is_approved === false) {
    state.favoriteId = null;
    updateFavoriteButtonUI();
    return;
  }

  const { data, error } = await state.supabase
    .from('favorites')
    .select('id')
    .eq('user_id', state.currentUser.id)
    .eq('post_id', state.post.id)
    .maybeSingle();

  if (error) {
    state.favoriteId = null;
    updateFavoriteButtonUI();
    throw new Error(error.message);
  }

  state.favoriteId = data?.id || null;
  updateFavoriteButtonUI();
}

async function toggleFavorite() {
  if (state.post?.is_approved === false) {
    clearTextMessage(favoriteMessage);
    return;
  }

  if (!state.currentUser || !state.post?.id) {
    setTextMessage(favoriteMessage, translate('loginToManageFavorites'), 'warning');
    return;
  }

  if (state.currentUser.id === state.post.author_id) {
    clearTextMessage(favoriteMessage);
    updateFavoriteButtonUI();
    return;
  }

  clearTextMessage(favoriteMessage);
  favoriteButton.disabled = true;

  if (state.favoriteId) {
    const { error } = await state.supabase
      .from('favorites')
      .delete()
      .eq('id', state.favoriteId);

    if (error) {
      favoriteButton.disabled = false;
      setTextMessage(favoriteMessage, error.message, 'danger');
      return;
    }

    state.favoriteId = null;
    updateFavoriteButtonUI();
    favoriteButton.disabled = false;
    setTextMessage(favoriteMessage, translate('removedFromFavorites'), 'success');
    return;
  }

  const { data, error } = await state.supabase
    .from('favorites')
    .insert({ user_id: state.currentUser.id, post_id: state.post.id })
    .select('id')
    .single();

  if (error) {
    favoriteButton.disabled = false;
    setTextMessage(favoriteMessage, error.message, 'danger');
    return;
  }

  state.favoriteId = data.id;
  updateFavoriteButtonUI();
  favoriteButton.disabled = false;
  setTextMessage(favoriteMessage, translate('addedToFavorites'), 'success');
}

function canManageComment(comment) {
  if (!state.currentUser) {
    return false;
  }

  return comment.user_id === state.currentUser.id || state.isAdmin;
}

function canCurrentUserPostComment() {
  if (!state.currentUser || !state.post) {
    return false;
  }

  return state.post.is_approved === true;
}

function canCurrentUserViewComments() {
  if (!state.post) {
    return false;
  }

  if (state.post.is_approved !== false) {
    return true;
  }

  const isPostCreator = Boolean(state.currentUser && state.currentUser.id === state.post.author_id);
  return !(state.isAdmin || isPostCreator);
}

function createCommentElement(comment) {
  const card = document.createElement('article');
  card.className = 'card border-0 shadow-sm';
  card.dataset.commentId = String(comment.id);

  const body = document.createElement('div');
  body.className = 'card-body';

  const top = document.createElement('div');
  top.className = 'd-flex justify-content-between align-items-start gap-3 mb-2';

  const authorWrap = document.createElement('div');
  authorWrap.className = 'd-flex align-items-center gap-2';

  const avatar = document.createElement('img');
  avatar.src = comment?.profiles?.avatar_url || 'https://via.placeholder.com/40x40.png?text=%F0%9F%91%A4';
  avatar.alt = `${comment?.profiles?.username || 'User'} avatar`;
  avatar.width = 40;
  avatar.height = 40;
  avatar.className = 'rounded-circle border';

  const authorText = document.createElement('div');

  const username = document.createElement('strong');
  username.textContent = comment?.profiles?.username || 'Unknown User';

  const date = document.createElement('div');
  date.className = 'small text-body-secondary';
  date.textContent = formatCommentDate(comment.created_at);

  authorText.append(username, date);
  authorWrap.append(avatar, authorText);
  top.appendChild(authorWrap);

  if (canManageComment(comment)) {
    const actions = document.createElement('div');
    actions.className = 'd-flex gap-2';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1';
    editButton.setAttribute('aria-label', translate('editComment'));
    editButton.title = translate('editComment');
    editButton.innerHTML = `<span aria-hidden="true">✏️</span><span>${translate('editComment')}</span>`;
    editButton.addEventListener('click', () => openEditModal(comment.id, comment.content));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1';
    deleteButton.setAttribute('aria-label', translate('deleteComment'));
    deleteButton.title = translate('deleteComment');
    deleteButton.innerHTML = `<span aria-hidden="true">🗑️</span><span>${translate('deleteComment')}</span>`;
    deleteButton.addEventListener('click', () => handleDeleteComment(comment));

    actions.append(editButton, deleteButton);
    top.appendChild(actions);
  }

  const text = document.createElement('p');
  text.className = 'mb-0';
  text.textContent = comment.content;
  text.dataset.role = 'comment-content';

  body.append(top, text);
  card.appendChild(body);

  return card;
}

function renderComments() {
  commentsList.innerHTML = '';

  if (!state.comments.length) {
    commentsEmpty.classList.remove('d-none');
    return;
  }

  commentsEmpty.classList.add('d-none');
  state.comments.forEach((comment) => {
    commentsList.appendChild(createCommentElement(comment));
  });
}

async function fetchComments() {
  if (!canCurrentUserViewComments()) {
    commentsLoading.classList.add('d-none');
    commentsList.innerHTML = '';
    state.comments = [];
    commentsEmpty.textContent = translate('commentsUnavailablePending');
    commentsEmpty.classList.remove('d-none');
    return;
  }

  commentsEmpty.textContent = translate('noCommentsYet');
  commentsLoading.classList.remove('d-none');
  commentsEmpty.classList.add('d-none');

  const { data, error } = await state.supabase
    .from('comments')
    .select('id, content, user_id, post_id, created_at, profiles!comments_user_id_fkey(username, avatar_url)')
    .eq('post_id', state.post.id)
    .order('created_at', { ascending: false });

  commentsLoading.classList.add('d-none');

  if (error) {
    throw new Error(error.message);
  }

  state.comments = data || [];
  renderComments();
}

async function handleAddComment(event) {
  event.preventDefault();

  if (!state.currentUser) {
    setTextMessage(commentFormMessage, translate('loginToPostComments'), 'warning');
    return;
  }

  if (!canCurrentUserPostComment()) {
    const warningMessage = state.post?.is_approved === false
      ? translate('commentsDisabledPending')
      : translate('notAllowedToComment');
    setTextMessage(commentFormMessage, warningMessage, 'warning');
    return;
  }

  const content = commentContent.value.trim();
  if (!content) {
    setTextMessage(commentFormMessage, translate('commentCannotBeEmpty'), 'warning');
    return;
  }

  commentSubmit.disabled = true;
  setTextMessage(commentFormMessage, translate('postingComment'), 'secondary');

  const { error } = await state.supabase.from('comments').insert({
    content,
    post_id: state.post.id,
    user_id: state.currentUser.id
  });

  commentSubmit.disabled = false;

  if (error) {
    setTextMessage(commentFormMessage, error.message, 'danger');
    return;
  }

  commentForm.reset();
  setTextMessage(commentFormMessage, translate('commentPosted'), 'success');
  await fetchComments();
}

async function handleEditComment(comment) {
  openEditModal(comment.id, comment.content);
}

function openEditModal(commentId, currentText) {
  const comment = state.comments.find((item) => String(item.id) === String(commentId));
  if (!comment || !canManageComment(comment)) {
    showGlobalAlert(translate('youCannotEditComment'), 'warning');
    return;
  }

  editCommentIdInput.value = String(commentId);
  editCommentTextArea.value = currentText || '';
  editCommentTextArea.focus();
  clearEditModalMessage();
  hideGlobalAlert();

  if (!editCommentModalElement) {
    showGlobalAlert(translate('editModalUnavailable'), 'danger');
    return;
  }

  state.editCommentModalInstance = new Modal(editCommentModalElement);
  state.editCommentModalInstance.show();
}

function updateCommentTextInDOM(commentId, newText) {
  const commentCard = commentsList.querySelector(`[data-comment-id="${String(commentId)}"]`);
  if (!commentCard) {
    return;
  }

  const commentTextNode = commentCard.querySelector('[data-role="comment-content"]');
  if (!commentTextNode) {
    return;
  }

  commentTextNode.textContent = newText;
}

async function handleSaveEditedComment() {
  const commentId = editCommentIdInput.value;
  const newText = editCommentTextArea.value.trim();

  if (!commentId) {
    setEditModalMessage(translate('noCommentSelected'), 'warning');
    return;
  }

  if (!newText) {
    setEditModalMessage(translate('commentSelectedEmpty'), 'warning');
    return;
  }

  editCommentSaveButton.disabled = true;
  clearEditModalMessage();

  const { error } = await state.supabase
    .from('comments')
    .update({ content: newText })
    .eq('id', commentId);

  editCommentSaveButton.disabled = false;

  if (error) {
    setEditModalMessage(error.message, 'danger');
    return;
  }

  state.comments = state.comments.map((comment) => {
    if (String(comment.id) !== String(commentId)) {
      return comment;
    }

    return {
      ...comment,
      content: newText
    };
  });

  updateCommentTextInDOM(commentId, newText);
  clearEditModalMessage();
  state.editCommentModalInstance?.hide();
}

async function handleDeleteComment(comment) {
  if (!canManageComment(comment)) {
    showGlobalAlert(translate('youCannotDeleteComment'), 'warning');
    return;
  }

  const shouldDelete = window.confirm(translate('deleteCommentConfirm'));
  if (!shouldDelete) {
    return;
  }

  hideGlobalAlert();

  const { error } = await state.supabase
    .from('comments')
    .delete()
    .eq('id', comment.id);

  if (error) {
    showGlobalAlert(error.message, 'danger');
    return;
  }

  await fetchComments();
}

function setupAuthDependentUI() {
  if (canCurrentUserPostComment()) {
    commentAuthNote.classList.add('d-none');
    commentForm.classList.remove('d-none');
    clearTextMessage(commentFormMessage);
    return;
  }

  commentForm.classList.add('d-none');

  if (!state.currentUser) {
    commentAuthNote.textContent = translate('loginToPostComments');
    commentAuthNote.classList.remove('d-none');
  } else if (state.post?.is_approved === false) {
    commentAuthNote.textContent = translate('commentsDisabledPending');
    commentAuthNote.classList.remove('d-none');
  } else {
    commentAuthNote.classList.add('d-none');
  }

  updateFavoriteButtonUI();
}

async function init() {
  const redirected = await redirectGuestFromProtectedPage();
  if (redirected) {
    return;
  }

  state.supabase = requireSupabase();
  state.postId = extractPostIdFromQuery() || '';

  if (!state.supabase) {
    showGlobalAlert(translate('supabaseMissing'), 'warning');
    postLoading.classList.add('d-none');
    return;
  }

  if (!state.postId) {
    window.location.replace('/404.html');
    return;
  }

  try {
    await loadCurrentUser();
    setupAuthDependentUI();

    const post = await fetchPostById(state.postId);
    if (!post) {
      return;
    }

    state.post = post;
    renderPost(post);
    setupAuthDependentUI();

    await syncFavoriteState();
    await fetchComments();
  } catch (error) {
    postLoading.classList.add('d-none');
    commentsLoading.classList.add('d-none');
    showGlobalAlert(error.message || translate('failedLoadCountryPosts'), 'danger');
  }
}

document.addEventListener('languagechange', () => {
  if (!state.post) {
    return;
  }

  renderPost(state.post);
  renderComments();
  setupAuthDependentUI();
});

favoriteButton.addEventListener('click', toggleFavorite);
commentForm.addEventListener('submit', handleAddComment);
editCommentSaveButton?.addEventListener('click', handleSaveEditedComment);

init();
