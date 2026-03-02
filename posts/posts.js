import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { getPostIdFromRoute } from '/src/router/router.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { Modal } from 'bootstrap';

mountHeader('#app-header');
mountFooter('#app-footer');

const COVER_PLACEHOLDER = 'https://images.unsplash.com/photo-1526481280695-3c4691f5e66c?auto=format&fit=crop&w=1600&q=80';

const pageAlert = document.querySelector('#page-alert');
const postLoading = document.querySelector('#post-loading');
const notFound = document.querySelector('#not-found');
const postView = document.querySelector('#post-view');

const postCoverImage = document.querySelector('#post-cover-image');
const postTitle = document.querySelector('#post-title');
const postCountry = document.querySelector('#post-country');
const postAuthor = document.querySelector('#post-author');
const postDate = document.querySelector('#post-date');
const postContent = document.querySelector('#post-content');

const favoriteButton = document.querySelector('#favorite-button');
const favoriteIcon = document.querySelector('#favorite-icon');
const favoriteLabel = document.querySelector('#favorite-label');
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
  postId: getPostIdFromRoute(''),
  post: null,
  currentUser: null,
  currentProfile: null,
  isAdmin: false,
  favoriteId: null,
  comments: [],
  editCommentModalInstance: null
};

function canonicalizePostUrlIfNeeded() {
  const currentPath = window.location.pathname || '';
  const currentSearch = window.location.search || '';

  const pathMatch = currentPath.match(/^\/posts\/([^/?#]+)\/?$/);
  if (pathMatch) {
    const rawId = decodeURIComponent(pathMatch[1] || '');
    if (rawId && rawId !== state.postId) {
      window.location.replace(`/posts/${encodeURIComponent(state.postId)}${currentSearch}`);
      return true;
    }
    return false;
  }

  const params = new URLSearchParams(currentSearch);
  const rawQueryId = params.get('id') || '';
  if (rawQueryId && rawQueryId !== state.postId) {
    params.set('id', state.postId);
    const nextSearch = params.toString();
    window.location.replace(`/posts/index.html?${nextSearch}`);
    return true;
  }

  return false;
}

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

function formatPublishedDate(value) {
  if (!value) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(value));
}

function formatCommentDate(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
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
    return '<p class="text-body-secondary mb-0">No content available.</p>';
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
  postCoverImage.alt = post.title || 'Travel post cover image';
  postTitle.textContent = post.title || 'Untitled Post';
  postCountry.textContent = post?.countries?.name || 'Unknown Country';
  postAuthor.textContent = post?.profiles?.username || 'Unknown Author';
  postDate.textContent = formatPublishedDate(post.created_at);
  postContent.innerHTML = toParagraphs(post.content);

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

  const { data: profile } = await state.supabase
    .from('profiles')
    .select('id, username, role')
    .eq('id', state.currentUser.id)
    .maybeSingle();

  state.currentProfile = profile || null;
  state.isAdmin = profile?.role === 'admin';
}

async function fetchPostById(postId) {
  const { data, error } = await state.supabase
    .from('posts')
    .select('id, title, content, image_url, created_at, author_id, country_id, profiles!posts_author_id_fkey(username), countries!posts_country_id_fkey(name)')
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function updateFavoriteButtonUI() {
  const isLoggedIn = Boolean(state.currentUser);
  const isFavorite = Boolean(state.favoriteId);
  favoriteButton.disabled = !isLoggedIn;

  if (!isLoggedIn) {
    favoriteButton.className = 'btn btn-outline-danger btn-lg';
    favoriteIcon.textContent = '♡';
    favoriteLabel.textContent = 'Login to Add Favorite';
    return;
  }

  favoriteButton.className = isFavorite ? 'btn btn-danger btn-lg' : 'btn btn-outline-danger btn-lg';
  favoriteIcon.textContent = isFavorite ? '♥' : '♡';
  favoriteLabel.textContent = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
}

async function syncFavoriteState() {
  if (!state.currentUser || !state.post?.id) {
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
  if (!state.currentUser || !state.post?.id) {
    setTextMessage(favoriteMessage, 'Please log in to manage favorites.', 'warning');
    return;
  }

  clearTextMessage(favoriteMessage);
  favoriteButton.disabled = true;

  if (state.favoriteId) {
    const { error } = await state.supabase.from('favorites').delete().eq('id', state.favoriteId);
    if (error) {
      favoriteButton.disabled = false;
      setTextMessage(favoriteMessage, error.message, 'danger');
      return;
    }

    state.favoriteId = null;
    updateFavoriteButtonUI();
    favoriteButton.disabled = false;
    setTextMessage(favoriteMessage, 'Removed from favorites.', 'success');
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
  setTextMessage(favoriteMessage, 'Added to favorites.', 'success');
}

function canManageComment(comment) {
  if (!state.currentUser) {
    return false;
  }

  return comment.user_id === state.currentUser.id || state.isAdmin;
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
    editButton.setAttribute('aria-label', 'Edit comment');
    editButton.title = 'Edit comment';
    editButton.innerHTML = '<span aria-hidden="true">✏️</span><span>Edit</span>';
    editButton.addEventListener('click', () => openEditModal(comment.id, comment.content));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1';
    deleteButton.setAttribute('aria-label', 'Delete comment');
    deleteButton.title = 'Delete comment';
    deleteButton.innerHTML = '<span aria-hidden="true">🗑️</span><span>Delete</span>';
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
    setTextMessage(commentFormMessage, 'Please log in to post comments.', 'warning');
    return;
  }

  const content = commentContent.value.trim();
  if (!content) {
    setTextMessage(commentFormMessage, 'Comment cannot be empty.', 'warning');
    return;
  }

  commentSubmit.disabled = true;
  setTextMessage(commentFormMessage, 'Posting comment...', 'secondary');

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
  setTextMessage(commentFormMessage, 'Comment posted.', 'success');
  await fetchComments();
}

async function handleEditComment(comment) {
  openEditModal(comment.id, comment.content);
}

function openEditModal(commentId, currentText) {
  const comment = state.comments.find((item) => String(item.id) === String(commentId));
  if (!comment || !canManageComment(comment)) {
    showGlobalAlert('You are not allowed to edit this comment.', 'warning');
    return;
  }

  if (!editCommentModalElement) {
    showGlobalAlert('Edit modal is unavailable on this page.', 'danger');
    return;
  }

  editCommentIdInput.value = String(commentId);
  editCommentTextArea.value = currentText || '';
  clearEditModalMessage();

  state.editCommentModalInstance = new Modal(editCommentModalElement);
  state.editCommentModalInstance.show();
  editCommentTextArea.focus();
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
    setEditModalMessage('No comment selected for editing.', 'warning');
    return;
  }

  if (!newText) {
    setEditModalMessage('Comment cannot be empty.', 'warning');
    return;
  }

  editCommentSaveButton.disabled = true;
  clearEditModalMessage();

  const { error } = await state.supabase.from('comments').update({ content: newText }).eq('id', commentId);

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
    showGlobalAlert('You are not allowed to delete this comment.', 'warning');
    return;
  }

  const shouldDelete = window.confirm('Delete this comment?');
  if (!shouldDelete) {
    return;
  }

  hideGlobalAlert();

  const { error } = await state.supabase.from('comments').delete().eq('id', comment.id);
  if (error) {
    showGlobalAlert(error.message, 'danger');
    return;
  }

  await fetchComments();
}

function setupAuthDependentUI() {
  if (state.currentUser) {
    commentAuthNote.classList.add('d-none');
    commentForm.classList.remove('d-none');
  } else {
    commentAuthNote.classList.remove('d-none');
    commentForm.classList.add('d-none');
  }

  updateFavoriteButtonUI();
}

async function init() {
  state.supabase = requireSupabase();

  if (!state.supabase) {
    showGlobalAlert('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.', 'warning');
    postLoading.classList.add('d-none');
    return;
  }

  if (!state.postId) {
    showPostNotFound();
    return;
  }

  const wasCanonicalized = canonicalizePostUrlIfNeeded();
  if (wasCanonicalized) {
    return;
  }

  try {
    await loadCurrentUser();
    setupAuthDependentUI();

    const post = await fetchPostById(state.postId);
    if (!post) {
      showPostNotFound();
      return;
    }

    state.post = post;
    renderPost(post);

    await syncFavoriteState();
    await fetchComments();
  } catch (error) {
    postLoading.classList.add('d-none');
    commentsLoading.classList.add('d-none');
    showGlobalAlert(error.message || 'Something went wrong while loading the post.', 'danger');
  }
}

favoriteButton.addEventListener('click', toggleFavorite);
commentForm.addEventListener('submit', handleAddComment);
editCommentSaveButton?.addEventListener('click', handleSaveEditedComment);

init();
