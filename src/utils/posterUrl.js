const BACKEND = process.env.REACT_APP_BACKEND_URL || 'https://cinephilium-backend.onrender.com';
const TMDB_PREFIX = 'https://image.tmdb.org/t/p/';
const PROXY_PREFIX = `${BACKEND}/api/poster/`;

export const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="100%" height="100%" fill="#1a1a1a"/><text x="50%" y="50%" fill="#666" font-family="sans-serif" font-size="18" text-anchor="middle" dy=".3em">Нет постера</text></svg>`
);

export function getPosterUrl(poster) {
  if (!poster) return PLACEHOLDER;
  return poster.startsWith(TMDB_PREFIX)
    ? poster.replace(TMDB_PREFIX, PROXY_PREFIX)
    : poster;
}

export function handleImgError(e) {
  e.currentTarget.onerror = null;
  e.currentTarget.src = PLACEHOLDER;
}
