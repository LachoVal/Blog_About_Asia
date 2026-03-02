import { Tooltip } from 'bootstrap';
import { mountFooter } from '/src/components/footer/footer.js';
import { mountHeader } from '/src/components/header/header.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';

mountHeader('#app-header', '/my-posts.html');
mountFooter('#app-footer');

const tableWrap = document.querySelector('#my-posts-table-wrap');
const tableBody = document.querySelector('#my-posts-tbody');
const message = document.querySelector('#my-posts-message');

const state = {
  supabase: null,
  currentUser: null,
  posts: []
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

function setupActions() {
  tableBody.addEventListener('click', async (event) => {
    const editButton = event.target.closest('.js-edit-post');
    if (editButton) {
      const postId = editButton.getAttribute('data-post-id');
      if (postId) {
        window.location.assign(`/create-post.html?edit=${encodeURIComponent(postId)}`);
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

  try {
    await fetchMyPosts();
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'Unable to load posts.', 'danger');
  }
}

setupActions();
init();