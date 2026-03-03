import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Modal } from 'bootstrap';

import headerTemplate from './header.html?raw';
import './header.css';
import { getCurrentRouteBase, isRouteActive } from '/src/router/router.js';
import { requireSupabase } from '/src/lib/supabaseClient.js';
import { getLoginPath, redirectGuestFromProtectedPage } from '/src/lib/auth.js';

const DEFAULT_AVATAR_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e4e6eb'/%3E%3Ccircle cx='20' cy='15' r='7' fill='white'/%3E%3Cpath d='M7 35c2.6-6.5 8-10 13-10s10.4 3.5 13 10' fill='white'/%3E%3C/svg%3E";

function toggleAuthNav(target, isAuthenticated) {
  target.querySelectorAll('[data-auth="guest"]').forEach((element) => {
    element.classList.toggle('d-none', isAuthenticated);
  });

  target.querySelectorAll('[data-auth="user"]').forEach((element) => {
    element.classList.toggle('d-none', !isAuthenticated);
  });
}

async function syncAuthNav(target) {
  const supabase = requireSupabase();
  const navAvatar = target.querySelector('#navAvatar');
  if (!supabase) {
    toggleAuthNav(target, false);
    target.querySelectorAll('[data-auth="admin"]').forEach((element) => {
      element.classList.add('d-none');
    });
    if (navAvatar) {
      navAvatar.src = DEFAULT_AVATAR_URL;
    }
    return;
  }

  const { data } = await supabase.auth.getSession();
  const currentUser = data?.session?.user || null;
  toggleAuthNav(target, Boolean(currentUser));

  if (!currentUser) {
    target.querySelectorAll('[data-auth="admin"]').forEach((element) => {
      element.classList.add('d-none');
    });
    if (navAvatar) {
      navAvatar.src = DEFAULT_AVATAR_URL;
    }
    return;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, avatar_url')
    .eq('id', currentUser.id)
    .maybeSingle();

  const isAdmin = !error && profile?.role === 'admin';
  target.querySelectorAll('[data-auth="admin"]').forEach((element) => {
    element.classList.toggle('d-none', !isAdmin);
  });

  if (navAvatar) {
    navAvatar.src = profile?.avatar_url || DEFAULT_AVATAR_URL;
  }
}

function setAvatarFeedback(target, message, type = 'muted') {
  const feedbackElement = target.querySelector('#avatarFeedback');
  if (!feedbackElement) {
    return;
  }

  feedbackElement.className = `mt-2 small text-${type}`;
  feedbackElement.textContent = message;
}

function setupAvatarUpload(target) {
  const saveAvatarBtn = target.querySelector('#saveAvatarBtn');
  const avatarInput = target.querySelector('#avatarInput');
  const profileModalElement = target.querySelector('#profileModal');
  const navAvatar = target.querySelector('#navAvatar');

  if (!saveAvatarBtn || !avatarInput || !profileModalElement || !navAvatar) {
    return;
  }

  const profileModalInstance = Modal.getOrCreateInstance(profileModalElement);

  navAvatar.addEventListener('click', () => {
    profileModalInstance.show();
  });

  profileModalElement.addEventListener('show.bs.modal', () => {
    avatarInput.value = '';
    setAvatarFeedback(target, '');
  });

  saveAvatarBtn.addEventListener('click', async () => {
    const selectedFile = avatarInput.files?.[0];
    if (!selectedFile) {
      setAvatarFeedback(target, 'Please choose an image file first.', 'danger');
      return;
    }

    const supabase = requireSupabase();
    if (!supabase) {
      setAvatarFeedback(target, 'Supabase is not configured.', 'danger');
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;
    if (!currentUser) {
      setAvatarFeedback(target, 'You must be logged in to upload an avatar.', 'danger');
      return;
    }

    saveAvatarBtn.disabled = true;
    setAvatarFeedback(target, 'Uploading avatar...', 'secondary');

    try {
      const extension = selectedFile.name.includes('.')
        ? selectedFile.name.split('.').pop().toLowerCase()
        : 'jpg';
      const filePath = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(filePath);
      const avatarUrl = publicUrlData?.publicUrl;

      if (!avatarUrl) {
        throw new Error('Failed to retrieve avatar URL.');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentUser.id);

      if (updateError) {
        throw updateError;
      }

      navAvatar.src = avatarUrl;
      setAvatarFeedback(target, 'Avatar updated successfully.', 'success');

      profileModalInstance.hide();
      window.alert('Avatar updated successfully.');
    } catch (error) {
      const errorMessage = error?.message || 'Failed to upload avatar.';
      if (/bucket.*not found/i.test(errorMessage)) {
        setAvatarFeedback(target, 'Avatar bucket is missing. Please apply the latest Supabase migration.', 'danger');
      } else {
        setAvatarFeedback(target, errorMessage, 'danger');
      }
    } finally {
      saveAvatarBtn.disabled = false;
    }
  });
}

export function mountHeader(targetSelector, currentRoute) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    return;
  }

  redirectGuestFromProtectedPage();

  target.innerHTML = headerTemplate;
  const links = target.querySelectorAll('[data-route]');
  const routeToUse = currentRoute || getCurrentRouteBase();

  links.forEach((link) => {
    const route = link.getAttribute('data-route');
    const isActive = isRouteActive(route, routeToUse);
    link.classList.toggle('active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  const logoutLink = target.querySelector('[data-action="logout"]');
  if (logoutLink) {
    logoutLink.addEventListener('click', async (event) => {
      event.preventDefault();
      const supabase = requireSupabase();
      if (!supabase) {
        window.location.assign(getLoginPath());
        return;
      }

      await supabase.auth.signOut();
      window.location.assign(getLoginPath());
    });
  }

  setupAvatarUpload(target);
  syncAuthNav(target);

  const supabase = requireSupabase();
  if (supabase) {
    supabase.auth.onAuthStateChange(() => {
      syncAuthNav(target);
    });
  }
}
