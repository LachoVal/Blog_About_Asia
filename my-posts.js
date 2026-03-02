import { Modal, Tooltip } from 'bootstrap';
import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header', '/my-posts.html');
mountFooter('#app-footer');

const tableWrap = document.querySelector('#my-posts-table-wrap');
const tableBody = document.querySelector('#my-posts-tbody');
const message = document.querySelector('#my-posts-message');
const createPostButton = document.querySelector('#create-post-button');
const postEditorModalElement = document.querySelector('#postEditorModal');
const postEditorModalLabel = document.querySelector('#postEditorModalLabel');
const postEditorForm = document.querySelector('#post-editor-form');
const editorPostId = document.querySelector('#editor-post-id');
const editorPostTitle = document.querySelector('#editor-post-title');
const editorPostContent = document.querySelector('#editor-post-content');
const editorPostPhoto = document.querySelector('#editor-post-photo');
const postEditorSubmit = document.querySelector('#post-editor-submit');
const postEditorMessage = document.querySelector('#post-editor-message');

const state = {
  supabase: null,
  currentUser: null,
  posts: [],
  editorMode: 'create',
  editorModal: null,
  fallbackCountryId: null
};

function showMessage(text, variant = 'info') {
  message.className = `alert alert-${variant}`;
  message.textContent = text;
  message.classList.remove('d-none');
}

function hideMessage() {
  message.classList.add('d-none');
  message.textContent = '';
}

function setEditorMessage(text, variant = 'secondary') {
  postEditorMessage.className = `small mt-3 mb-0 text-${variant}`;
  postEditorMessage.textContent = text;
}

function clearEditorMessage() {
  postEditorMessage.className = 'small mt-3 mb-0';
  postEditorMessage.textContent = '';
}

function resetEditorForm() {
  editorPostId.value = '';
  editorPostTitle.value = '';
  editorPostContent.value = '';
  editorPostPhoto.value = '';
  clearEditorMessage();
}

function openCreateModal() {
  state.editorMode = 'create';
  resetEditorForm();
  postEditorModalLabel.textContent = 'Create Post';
  postEditorSubmit.textContent = 'Create';
  state.editorModal.show();
}

async function openEditModal(postId) {
  state.editorMode = 'edit';
  resetEditorForm();
  postEditorModalLabel.textContent = 'Edit Post';
  postEditorSubmit.textContent = 'Save Changes';

  setEditorMessage('Loading post...', 'secondary');
  const { data, error } = await state.supabase
    .from('posts')
    .select('id, title, content')
    .eq('id', postId)
    .eq('author_id', state.currentUser.id)
    .maybeSingle();

  if (error || !data) {
    setEditorMessage(error?.message || 'Unable to load this post.', 'danger');
    return;
  }

  editorPostId.value = data.id;
  editorPostTitle.value = data.title || '';
  editorPostContent.value = data.content || '';
  clearEditorMessage();
  state.editorModal.show();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.onerror = () => reject(new Error('Unable to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function renderStatusBadge(isApproved) {
  if (isApproved) {
    return '<span class="badge bg-success">Published</span>';
  }

  return '<span class="badge bg-warning text-dark">Pending Approval</span>';
}

function initTooltips() {
  const triggerList = tableBody.querySelectorAll('[data-bs-toggle="tooltip"]');
  triggerList.forEach((element) => {
    Tooltip.getOrCreateInstance(element);
  });
}

function renderPostsTable(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    tableWrap.classList.add('d-none');
    showMessage("You haven't written any posts yet.", 'light');
    return;
  }

  hideMessage();
  tableBody.innerHTML = posts
    .map(
      (post) => `
        <tr data-post-id="${post.id}">
          <td>${post.title || 'Untitled Post'}</td>
          <td>${renderStatusBadge(Boolean(post.is_approved))}</td>
          <td class="text-end">
            <div class="d-inline-flex gap-2">
              <a
                class="btn btn-primary btn-sm"
                href="/post.html?id=${post.id}"
                aria-label="Read post"
                data-bs-toggle="tooltip"
                data-bs-title="Read"
              >
                <i class="bi bi-eye" aria-hidden="true"></i>
              </a>
              <button
                type="button"
                class="btn btn-warning btn-sm js-edit-post"
                data-post-id="${post.id}"
                aria-label="Edit post"
                data-bs-toggle="tooltip"
                data-bs-title="Edit"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="btn btn-danger btn-sm js-delete-post"
                data-post-id="${post.id}"
                aria-label="Delete post"
                data-bs-toggle="tooltip"
                data-bs-title="Delete"
              >
                <i class="bi bi-trash" aria-hidden="true"></i>
              </button>
            </div>
          </td>
        </tr>
      `
    )
    .join('');

  tableWrap.classList.remove('d-none');
  initTooltips();
}

async function requireCurrentUser() {
  const { data } = await state.supabase.auth.getSession();
  const currentUser = data?.session?.user || null;

  if (!currentUser) {
    window.location.replace('/login.html');
    return null;
  }

  state.currentUser = currentUser;
  return currentUser;
}

async function fetchMyPosts() {
  const { data, error } = await state.supabase
    .from('posts')
    .select('id, title, is_approved')
    .eq('author_id', state.currentUser.id);

  if (error) {
    throw new Error(error.message);
  }

  state.posts = data || [];
  renderPostsTable(state.posts);
}

async function loadFallbackCountryId() {
  const { data, error } = await state.supabase.from('countries').select('id').limit(1);
  if (error) {
    state.fallbackCountryId = null;
    return;
  }

  state.fallbackCountryId = data?.[0]?.id || null;
}

function removeRowFromDom(postId) {
  const row = tableBody.querySelector(`tr[data-post-id="${postId}"]`);
  if (row) {
    row.remove();
  }

  if (!tableBody.querySelector('tr')) {
    tableWrap.classList.add('d-none');
    showMessage("You haven't written any posts yet.", 'light');
  }
}

async function handleDelete(postId) {
  const shouldDelete = window.confirm('Are you sure you want to delete this post?');
  if (!shouldDelete) {
    return;
  }

  const { error } = await state.supabase.from('posts').delete().eq('id', postId);
  if (error) {
    showMessage(error.message, 'danger');
    return;
  }

  state.posts = state.posts.filter((post) => String(post.id) !== String(postId));
  removeRowFromDom(postId);
}

async function handleEditorSubmit(event) {
  event.preventDefault();

  const title = editorPostTitle.value.trim();
  const content = editorPostContent.value.trim();
  const selectedFile = editorPostPhoto.files?.[0] || null;

  if (!title || !content) {
    setEditorMessage('Title and content are required.', 'danger');
    return;
  }

  postEditorSubmit.disabled = true;
  setEditorMessage(state.editorMode === 'edit' ? 'Saving changes...' : 'Creating post...', 'secondary');

  let imageUrl;
  if (selectedFile) {
    try {
      imageUrl = await fileToDataUrl(selectedFile);
    } catch (error) {
      postEditorSubmit.disabled = false;
      setEditorMessage(error instanceof Error ? error.message : 'Unable to read selected file.', 'danger');
      return;
    }
  }

  if (state.editorMode === 'edit') {
    const postId = editorPostId.value;
    if (!postId) {
      postEditorSubmit.disabled = false;
      setEditorMessage('Missing post id.', 'danger');
      return;
    }

    const updatePayload = {
      title,
      content
    };

    if (imageUrl) {
      updatePayload.image_url = imageUrl;
    }

    const { error } = await state.supabase
      .from('posts')
      .update(updatePayload)
      .eq('id', postId)
      .eq('author_id', state.currentUser.id);

    if (error) {
      postEditorSubmit.disabled = false;
      setEditorMessage(error.message, 'danger');
      return;
    }

    await fetchMyPosts();
    state.editorModal.hide();
    showMessage('Post updated successfully.', 'success');
    postEditorSubmit.disabled = false;
    return;
  }

  const insertPayload = {
    title,
    content,
    author_id: state.currentUser.id
  };

  if (imageUrl) {
    insertPayload.image_url = imageUrl;
  }

  if (state.fallbackCountryId) {
    insertPayload.country_id = state.fallbackCountryId;
  }

  const { error } = await state.supabase.from('posts').insert(insertPayload);
  if (error) {
    postEditorSubmit.disabled = false;
    setEditorMessage(error.message, 'danger');
    return;
  }

  await fetchMyPosts();
  state.editorModal.hide();
  showMessage('Post created successfully.', 'success');
  postEditorSubmit.disabled = false;
}

function setupActions() {
  if (createPostButton) {
    createPostButton.addEventListener('click', () => {
      openCreateModal();
    });
  }

  tableBody.addEventListener('click', async (event) => {
    const editButton = event.target.closest('.js-edit-post');
    if (editButton) {
      const postId = editButton.getAttribute('data-post-id');
      if (postId) {
        await openEditModal(postId);
      }
      return;
    }

    const deleteButton = event.target.closest('.js-delete-post');
    if (deleteButton) {
      const postId = deleteButton.getAttribute('data-post-id');
      if (postId) {
        await handleDelete(postId);
      }
    }
  });

  postEditorForm.addEventListener('submit', handleEditorSubmit);
}

async function init() {
  state.supabase = requireSupabase();
  if (!state.supabase) {
    showMessage('Supabase is not configured. Please set your environment variables.', 'danger');
    return;
  }

  showMessage('Loading your posts...', 'secondary');
  const currentUser = await requireCurrentUser();
  if (!currentUser) {
    return;
  }

  state.editorModal = new Modal(postEditorModalElement);

  try {
    await loadFallbackCountryId();
    await fetchMyPosts();
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'Unable to load posts.', 'danger');
  }
}

setupActions();
init();