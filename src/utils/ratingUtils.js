export function formatDate(date) {
  if (!date) return 'Неизвестно'; 
  try {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return 'Неизвестно';
  } 
}

export function getTimeAgo(date) {
  if (!date) return 'только что';
  try {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
    return formatDate(date);
  } catch {
    return 'только что';
  }
}

export function sanitizeText(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function truncateText(text, maxLength = 200) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password) {
  return password && password.length >= 8;
}

/* ===== Средние по блокам критериев и лейблы ===== */

export const BLOCK_CRITERIA_LABELS = {
  scenario:   { name: 'Сценарий',  criteria: ['plot', 'ideas', 'dialogue'] },
  characters: { name: 'Персонажи', criteria: ['depth', 'chemistry', 'functionality'] },
  visual:     { name: 'Визуал',    criteria: ['composition', 'cinematography', 'pacing', 'tone'] },
  sound:      { name: 'Звук',      criteria: ['music', 'design', 'narrative'] },
  style:      { name: 'Стиль',     criteria: ['originality', 'boldness'] }
};

/**
 * Возвращает { scenario: 7.5, characters: 8.0, visual: 7.2, sound: 8.5, style: 6.8 }
 * или null, если scores нет.
 */
export function computeBlockAverages(scores) {
  if (!scores || typeof scores !== 'object') return null;
  const result = {};
  for (const [key, cfg] of Object.entries(BLOCK_CRITERIA_LABELS)) {
    const block = scores[key];
    if (!block || typeof block !== 'object') {
      result[key] = null;
      continue;
    }
    let sum = 0;
    let count = 0;
    for (const crit of cfg.criteria) {
      const v = block[crit];
      if (Number.isFinite(v)) {
        sum += v;
        count += 1;
      }
    }
    result[key] = count > 0 ? Math.round((sum / count) * 10) / 10 : null;
  }
  return result;
}

export function validateNickname(nickname) {
  return nickname && nickname.length >= 2 && nickname.length <= 20;
}
