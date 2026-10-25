// Постеры всегда идут через наш бэкенд: image.tmdb.org из России недоступен,
// поэтому прямые ссылки TMDB в браузере не загружаются ни с VPN, ни без него.
const API_URL = process.env.REACT_APP_API_URL || 'https://cinephilium-backend.onrender.com/api';
const API_ORIGIN = (
  process.env.REACT_APP_BACKEND_URL || API_URL.replace(/\/api\/?$/, '')
).replace(/\/$/, '');

const TMDB_PREFIX = 'https://image.tmdb.org/t/p/';
const PROXY_PATH = '/api/tmdb-image';

export const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="100%" height="100%" fill="#1a1a1a"/><text x="50%" y="50%" fill="#666" font-family="sans-serif" font-size="18" text-anchor="middle" dy=".3em">Нет постера</text></svg>`
);

function proxyUrl(size, path) {
  return `${API_ORIGIN}${PROXY_PATH}?size=${encodeURIComponent(size)}&path=${encodeURIComponent(path)}`;
}

/**
 * Приводит любой вариант постера к адресу нашего прокси.
 * Понимает: прямую ссылку TMDB, голый путь постера, готовый прокси-адрес
 * (в том числе с localhost из локального .env) и обычные картинки вроде /no-poster.jpg.
 */
export function getPosterUrl(poster, fallbackSize = 'w500') {
  if (!poster || typeof poster !== 'string') return PLACEHOLDER;

  // Уже наш прокси — относительный путь.
  if (poster.startsWith(PROXY_PATH)) return `${API_ORIGIN}${poster}`;

  // Наш прокси с чужим/локальным хостом — подменяем только origin.
  if (poster.includes(`${PROXY_PATH}?`)) {
    return poster.replace(/^https?:\/\/[^/]+/i, API_ORIGIN);
  }

  // Старый алиас бэкенда /api/poster/<size>/<path>.
  if (poster.startsWith('/api/poster/')) return `${API_ORIGIN}${poster}`;

  // Прямая ссылка TMDB: переводим на прокси.
  if (poster.startsWith(TMDB_PREFIX)) {
    const rest = poster.slice(TMDB_PREFIX.length); // например w500/abc.jpg
    const slash = rest.indexOf('/');
    const size = slash > 0 ? rest.slice(0, slash) : fallbackSize;
    const path = slash > 0 ? rest.slice(slash) : `/${rest}`;
    return proxyUrl(size, path);
  }

  // Голый путь постера TMDB (/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg),
  // но не локальная заглушка вроде /no-poster.jpg.
  if (/^\/[A-Za-z0-9]{15,}\.(jpe?g|png|webp)$/i.test(poster)) {
    return proxyUrl(fallbackSize, poster);
  }

  // Локальные адреса из dev-конфига бэкенда.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(poster)) {
    return poster.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, API_ORIGIN);
  }

  return poster;
}

export function handleImgError(e) {
  e.currentTarget.onerror = null;
  e.currentTarget.src = PLACEHOLDER;
}
