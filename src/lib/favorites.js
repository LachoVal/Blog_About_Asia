const FAVORITES_KEY = 'asian-travel-blog:favorites';

export function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addFavorite(post) {
  const favorites = getFavorites();
  const alreadyExists = favorites.some((entry) => entry.id === post.id);
  if (alreadyExists) {
    return;
  }

  favorites.push(post);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}
