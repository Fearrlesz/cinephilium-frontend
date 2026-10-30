// Расчёты и константы блока оценки (F1).
//
// Источник истины — бэкенд: src/config/scoring.js. Здесь те же ключи критериев
// и та же формула технического балла: среднее по критериям внутри блока,
// затем взвешенная сумма блоков, затем ×10. Внутриблочные веса (0.35/0.35/0.30)
// из старого useRatingForm не используются — бэкенд их не знает.
import { CRITERIA_CONFIG } from './constants';

export const BLOCK_KEYS = ['scenario', 'characters', 'visual', 'sound', 'style'];

// Цвета блоков из спецификации F1. Они же — цвета спектра и полосок в модалке.
export const BLOCK_COLORS = {
  scenario:   { from: '#7dd9e3', to: '#4fb8c4', solid: '#7dd9e3' },
  characters: { from: '#5fc9d4', to: '#3fa5b2', solid: '#5fc9d4' },
  visual:     { from: '#5b9bd5', to: '#3a7ab8', solid: '#5b9bd5' },
  sound:      { from: '#8b88d4', to: '#6a66b8', solid: '#8b88d4' },
  style:      { from: '#d68aa6', to: '#b86c88', solid: '#d68aa6' }
};

export const DEFAULT_WEIGHTS = [30, 25, 20, 15, 10];
export const WEIGHTS_SUM = 100;
export const WEIGHT_SLIDER_MAX = 50;

export const VIBE_WORDS = {
  0: 'не оценено',
  1: 'провал',
  2: 'провал',
  3: 'не зашло',
  4: 'не зашло',
  5: 'нормально',
  6: 'крепко, но не зацепило',
  7: 'крепко, но не зацепило',
  8: 'сильно',
  9: 'восторг',
  10: 'идеально'
};

export function getVibeWord(vibe) {
  const value = Math.round(Number(vibe) || 0);
  return VIBE_WORDS[Math.min(10, Math.max(0, value))];
}

// Пороги и цвета — из спецификации F1.
export function getGrade(score) {
  if (score === null || score === undefined || score === '') return null;
  const value = Number(score);
  if (!Number.isFinite(value)) return null;
  if (value >= 90) return { letter: 'S', label: 'Шедевр',  color: '#d68aa6' };
  if (value >= 80) return { letter: 'A', label: 'Отлично', color: '#7dd9e3' };
  if (value >= 65) return { letter: 'B', label: 'Хорошо',  color: '#5fc9d4' };
  if (value >= 50) return { letter: 'C', label: 'Средне',  color: '#5b9bd5' };
  if (value >= 35) return { letter: 'D', label: 'Слабо',   color: '#8f8289' };
  return { letter: 'E', label: 'Провал', color: '#a86a72' };
}

export function roundTenth(value) {
  return Math.round(Number(value) * 10) / 10;
}

export function formatScore(value) {
  if (!Number.isFinite(Number(value))) return '—';
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

export function formatDelta(value) {
  if (!Number.isFinite(Number(value))) return '';
  const number = roundTenth(value);
  if (number === 0) return '±0';
  return `${number > 0 ? '+' : '−'}${formatScore(Math.abs(number))}`;
}

/**
 * Средние по блокам — простым средним по критериям, как на бэкенде.
 * Возвращает { scenario: 7.5, ... } или null, если scores нет.
 */
export function blockAverages(scores) {
  if (!scores || typeof scores !== 'object') return null;

  const result = {};
  for (const { key, criteria } of CRITERIA_CONFIG) {
    const block = scores[key];
    if (!block || typeof block !== 'object') {
      result[key] = null;
      continue;
    }
    const values = criteria
      .map(criterion => Number(block[criterion.key]))
      .filter(Number.isFinite);
    result[key] = values.length
      ? roundTenth(values.reduce((sum, value) => sum + value, 0) / values.length)
      : null;
  }
  return result;
}

/**
 * Технический балл 10–100: средние по блокам × веса блоков × 10.
 * Если сумма весов не 100, считаем по фактической сумме (делим на 100),
 * чтобы preview честно показывал последствия, а сохранение блокировалось.
 */
export function calculateTechnical(scores, weights = DEFAULT_WEIGHTS) {
  const averages = blockAverages(scores);
  if (!averages) return null;

  let weighted = 0;
  BLOCK_KEYS.forEach((key, index) => {
    weighted += (averages[key] || 0) * (Number(weights[index]) || 0);
  });

  return roundTenth((weighted / WEIGHTS_SUM) * 10);
}

/**
 * Комбинированный балл: 70% техника + 30% вайб (вайб 1–10 → ×10).
 *
 * DECISION: F1-fix — combined существует только для full. Vibe-only даёт
 * technicalScore = 0 и combinedScore = 0 на бэкенде; это маркеры «не вычислено»,
 * а не результат. Фронт не доизобретает `vibe × 10`: для vibe-only combined = null
 * (в панели — прочерк, в соцдоказательстве «Ваша» — прочерк).
 * Ветка «только техника» — мёртвая после B1, тоже null.
 */
export function calculateCombined(technical, vibe) {
  const hasVibe = Number.isFinite(Number(vibe)) && Number(vibe) > 0;
  const hasTechnical = Number.isFinite(Number(technical)) && Number(technical) > 0;

  if (!hasVibe || !hasTechnical) return null;
  return roundTenth(Number(technical) * 0.7 + Number(vibe) * 3);
}

/**
 * Значение «Ваша» для карточки: только full, сохранённый combinedScore из БД.
 *
 * DECISION: F1-fix — vibe-only не даёт «Ваша»: combinedScore = 0 на бэке.
 * UI-вычисления vibe × 10 больше нет.
 */
export function yourCombined(userRating) {
  if (!userRating) return null;
  if ((userRating.completeness || 'full') !== 'full') return null;

  const score = Number(userRating.combinedScore);
  return Number.isFinite(score) && score > 0 ? score : null;
}

/**
 * Среднее сообщества имеет смысл только если по этой оси есть голоса.
 * На странице фильма отсутствующее среднее приходит нулём (B2/6.1),
 * поэтому ноль сам по себе не признак «нет данных» — смотрим на счётчик.
 */
export function communityValue(average, count) {
  if (!Number.isFinite(Number(count)) || Number(count) <= 0) return null;
  const value = Number(average);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function getInitialWeights(blockWeights) {
  if (Array.isArray(blockWeights) && blockWeights.length === 5) {
    return blockWeights.map(value => Number(value) || 0);
  }
  if (blockWeights && typeof blockWeights === 'object') {
    return [
      blockWeights.scenario,
      blockWeights.characters,
      blockWeights.visual,
      blockWeights.sound,
      blockWeights.style
    ].map(value => Number(value) || 0);
  }
  return [...DEFAULT_WEIGHTS];
}

export function formatRetryAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'позже';

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;

  return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${time}`;
}
