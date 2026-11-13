// Рендер share-карточки оценки в canvas.
//
// DECISION: карточка рисуется в canvas, а не через html2canvas: в проекте нет
// библиотек для DOM→PNG, а canvas даёт точный контроль над экспортом 2× без
// новых зависимостей. Превью — тот же data URL, поэтому скачанный PNG
// пиксель-в-пиксель совпадает с тем, что видит пользователь.
//
// DECISION: шрифты — только три семейства проекта. Instrument Serif не имеет
// кириллицы (Google Fonts отдаёт latin/latin-ext), поэтому русское название
// фильма падает в Georgia — ровно так же, как заголовок h1 на странице фильма.
import {
  BLOCK_COLORS,
  BLOCK_KEYS,
  DEFAULT_WEIGHTS,
  blockAverages,
  calculateCombined,
  calculateTechnical,
  formatScore,
  getGrade,
  getInitialWeights
} from '../../../../utils/scoring';
import { BLOCK_NAMES } from '../../../../utils/constants';
import { getPosterUrl } from '../../../../utils/posterUrl';

export const CARD_WIDTH = 560;
export const CARD_HEIGHT = 700;
const CARD_SCALE = 2;

const PAD_X = 34;
const CONTENT_RIGHT = CARD_WIDTH - PAD_X;

const FONTS = {
  serif: '"Instrument Serif", Georgia, "Times New Roman", serif',
  sans: 'Inter, system-ui, "Segoe UI", sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SFMono-Regular", monospace'
};

const INK = '#f0ebe4';
const INK_SOFT = '#cfc6c6';
const INK_MUTED = '#a89aa0';
const INK_FAINT = '#8f8289';
const VOID = '#0a0709';

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean;
  const int = parseInt(full, 16);
  if (!Number.isFinite(int)) return `rgba(240, 235, 228, ${alpha})`;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildShareCardModel({ film, rating, payload, user }) {
  const scores = rating?.scores || {};
  const weights = getInitialWeights(rating?.blockWeights || DEFAULT_WEIGHTS);

  const technical = num(payload?.technicalScore) ?? num(rating?.technicalScore) ?? calculateTechnical(scores, weights);
  const vibe = num(payload?.vibe) ?? num(rating?.vibe);
  const combined =
    num(payload?.combinedScore) ??
    num(rating?.combinedScore) ??
    num(payload?.finalScore) ??
    calculateCombined(technical, vibe);

  const averages = blockAverages(scores) || {};
  const blocks = BLOCK_KEYS.map((key, index) => ({
    key,
    name: BLOCK_NAMES[index],
    value: num(averages[key]),
    color: BLOCK_COLORS[key].solid
  }));

  const createdAt = rating?.createdAt ? new Date(rating.createdAt) : new Date();
  const year = Number.isNaN(createdAt.getTime()) ? new Date().getFullYear() : createdAt.getFullYear();

  const bylineParts = [];
  if (film?.director) bylineParts.push(film.director);
  if (film?.year) bylineParts.push(String(film.year));

  const backdropSource = film?.backdrop || film?.poster || '';

  return {
    title: film?.title || 'Без названия',
    byline: bylineParts.join(' · '),
    eyebrow: `ОЦЕНКА · ${year}`,
    nickname: String(user?.nickname || '').trim(),
    grade: getGrade(combined) || { letter: '—', label: '', color: INK_MUTED },
    combined: num(combined),
    technical: num(technical),
    vibe: num(vibe),
    blocks,
    backdropUrl: backdropSource ? getPosterUrl(backdropSource, 'w780') : ''
  };
}

function setFont(ctx, weight, size, family) {
  ctx.font = `${weight} ${size}px ${family}`;
}

function measureTracked(ctx, text, tracking) {
  let width = 0;
  for (let i = 0; i < text.length; i += 1) {
    width += ctx.measureText(text[i]).width;
    if (i < text.length - 1) width += tracking;
  }
  return width;
}

function drawTracked(ctx, text, x, y, tracking, align = 'left') {
  const width = measureTracked(ctx, text, tracking);
  let cursor = align === 'right' ? x - width : x;
  for (let i = 0; i < text.length; i += 1) {
    ctx.fillText(text[i], cursor, y);
    cursor += ctx.measureText(text[i]).width + tracking;
  }
  return width;
}

function wrapText(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;

    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = '';
    }
    if (lines.length >= maxLines) break;
    current = word;
  }

  if (current && lines.length < maxLines) lines.push(current);

  const truncated = lines.join(' ') !== words.join(' ');
  if (lines.length === maxLines && truncated) {
    const lastIndex = lines.length - 1;
    let last = lines[lastIndex].replace(/…$/, '').trimEnd();
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lastIndex] = `${last}…`;
  }

  return lines;
}

function fitTitle(ctx, title, maxWidth) {
  const sizes = [38, 34, 30];

  // Сначала ищем размер, при котором название влезает в одну строку:
  // одинокая вторая строка («…нельзя») выглядит хуже, чем чуть меньший кегль.
  for (const size of sizes) {
    setFont(ctx, 400, size, FONTS.serif);
    const lines = wrapText(ctx, title, maxWidth, 2);
    if (lines.length === 1) return { size, lines };
  }

  setFont(ctx, 400, 38, FONTS.serif);
  return { size: 38, lines: wrapText(ctx, title, maxWidth, 2) };
}

function roundRectPath(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function loadImage(src, timeoutMs = 4500) {
  return new Promise(resolve => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    image.onload = () => {
      clearTimeout(timer);
      finish(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    image.src = src;
  });
}

function drawCover(ctx, image) {
  const targetRatio = CARD_WIDTH / CARD_HEIGHT;
  const imageRatio = image.width / image.height;
  let sourceWidth;
  let sourceHeight;
  let sourceX;
  let sourceY;

  if (imageRatio > targetRatio) {
    sourceHeight = image.height;
    sourceWidth = sourceHeight * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
    sourceY = 0;
  } else {
    sourceWidth = image.width;
    sourceHeight = sourceWidth / targetRatio;
    sourceX = 0;
    sourceY = (image.height - sourceHeight) * 0.28;
  }

  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    CARD_WIDTH,
    CARD_HEIGHT
  );
}

function paintBackground(ctx, image, gradeColor) {
  ctx.fillStyle = VOID;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  if (image) {
    ctx.save();
    if ('filter' in ctx) {
      ctx.filter = 'saturate(0.6) brightness(0.7) contrast(1.03)';
    }
    drawCover(ctx, image);
    ctx.restore();
  } else {
    const base = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    base.addColorStop(0, '#1b1419');
    base.addColorStop(0.55, '#120c10');
    base.addColorStop(1, VOID);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  }

  // Основной затемняющий градиент: верх фото виден, низ уходит в void.
  const scrim = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  scrim.addColorStop(0, 'rgba(10, 7, 9, 0.42)');
  scrim.addColorStop(0.12, 'rgba(10, 7, 9, 0.18)');
  scrim.addColorStop(0.34, 'rgba(10, 7, 9, 0.42)');
  scrim.addColorStop(0.52, 'rgba(10, 7, 9, 0.74)');
  scrim.addColorStop(0.64, 'rgba(10, 7, 9, 0.92)');
  scrim.addColorStop(0.78, 'rgba(10, 7, 9, 0.98)');
  scrim.addColorStop(1, VOID);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Верхняя полоса под бренд.
  const top = ctx.createLinearGradient(0, 0, 0, 150);
  top.addColorStop(0, 'rgba(10, 7, 9, 0.45)');
  top.addColorStop(1, 'rgba(10, 7, 9, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, CARD_WIDTH, 150);

  // Тёплое свечение грейда за строкой оценки.
  const glow = ctx.createRadialGradient(286, 430, 20, 286, 430, 300);
  glow.addColorStop(0, hexToRgba(gradeColor, 0.16));
  glow.addColorStop(0.55, hexToRgba(gradeColor, 0.05));
  glow.addColorStop(1, hexToRgba(gradeColor, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 250, CARD_WIDTH, 360);

  // Виньетка по краям.
  const vignette = ctx.createRadialGradient(280, 360, 200, 280, 360, 460);
  vignette.addColorStop(0, 'rgba(10, 7, 9, 0)');
  vignette.addColorStop(1, 'rgba(10, 7, 9, 0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
}

function paintCard(ctx, model, image) {
  const grade = model.grade;
  paintBackground(ctx, image, grade.color);

  // ── Шапка ────────────────────────────────────────────────
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  setFont(ctx, 400, 24, FONTS.serif);
  ctx.fillStyle = INK;
  ctx.fillText('Cinephilium', PAD_X, 54);

  setFont(ctx, 500, 9, FONTS.mono);
  ctx.fillStyle = INK_FAINT;
  drawTracked(ctx, model.eyebrow, CONTENT_RIGHT, 52, 1.7, 'right');

  // ── Название и byline ───────────────────────────────────
  const titleMaxWidth = CONTENT_RIGHT - PAD_X;
  const fitted = fitTitle(ctx, model.title, titleMaxWidth);
  const lineHeight = Math.round(fitted.size * 1.06);
  const lastBaseline = 334;
  setFont(ctx, 400, fitted.size, FONTS.serif);
  ctx.fillStyle = INK;
  fitted.lines.forEach((line, index) => {
    const baseline = lastBaseline - (fitted.lines.length - 1 - index) * lineHeight;
    ctx.fillText(line, PAD_X, baseline);
  });

  if (model.byline) {
    setFont(ctx, 400, 12.5, FONTS.sans);
    ctx.fillStyle = INK_MUTED;
    ctx.fillText(model.byline, PAD_X, 358);
  }

  // ── Оценка ──────────────────────────────────────────────
  const tileSize = 72;
  const tileX = PAD_X;
  const tileY = 382;
  const tileRadius = 16;

  ctx.save();
  ctx.shadowColor = hexToRgba(grade.color, 0.34);
  ctx.shadowBlur = 28;
  ctx.fillStyle = hexToRgba(grade.color, 0.1);
  roundRectPath(ctx, tileX, tileY, tileSize, tileSize, tileRadius);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = hexToRgba(grade.color, 0.42);
  ctx.lineWidth = 1;
  roundRectPath(ctx, tileX + 0.5, tileY + 0.5, tileSize - 1, tileSize - 1, tileRadius - 0.5);
  ctx.stroke();

  setFont(ctx, 400, 42, FONTS.serif);
  ctx.fillStyle = grade.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(grade.letter, tileX + tileSize / 2, tileY + tileSize / 2 + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const scoreText = model.combined === null ? '—' : formatScore(model.combined);
  const scoreX = tileX + tileSize + 20;
  const scoreBaseline = 444;
  setFont(ctx, 500, 54, FONTS.mono);
  ctx.fillStyle = INK;
  ctx.fillText(scoreText, scoreX, scoreBaseline);
  const scoreWidth = ctx.measureText(scoreText).width;

  setFont(ctx, 400, 13, FONTS.mono);
  ctx.fillStyle = INK_FAINT;
  ctx.fillText('/ 100', scoreX + scoreWidth + 9, scoreBaseline);

  if (grade.label) {
    setFont(ctx, 500, 10, FONTS.mono);
    ctx.fillStyle = grade.color;
    drawTracked(ctx, grade.label.toUpperCase(), scoreX, 470, 2.2, 'left');
  }

  // ── Блоки ───────────────────────────────────────────────
  const blockStart = 514;
  const blockStep = 30;
  const trackX = 182;
  const trackWidth = 288;

  model.blocks.forEach((block, index) => {
    const baseline = blockStart + index * blockStep;

    setFont(ctx, 500, 9, FONTS.mono);
    ctx.fillStyle = INK_FAINT;
    drawTracked(ctx, block.name.toUpperCase(), PAD_X, baseline, 1.4, 'left');

    const trackY = baseline - 4.5;
    ctx.fillStyle = 'rgba(240, 235, 228, 0.12)';
    roundRectPath(ctx, trackX, trackY, trackWidth, 3, 1.5);
    ctx.fill();

    const ratio = block.value === null ? 0 : Math.max(0, Math.min(1, block.value / 10));
    if (ratio > 0) {
      ctx.fillStyle = block.color;
      roundRectPath(ctx, trackX, trackY, Math.max(3, trackWidth * ratio), 3, 1.5);
      ctx.fill();
    }

    setFont(ctx, 500, 11.5, FONTS.mono);
    ctx.fillStyle = block.value === null ? INK_FAINT : INK_SOFT;
    ctx.textAlign = 'right';
    ctx.fillText(block.value === null ? '—' : block.value.toFixed(1), CONTENT_RIGHT, baseline);
    ctx.textAlign = 'left';
  });

  // ── Футер ───────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(240, 235, 228, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_X, 656.5);
  ctx.lineTo(CONTENT_RIGHT, 656.5);
  ctx.stroke();

  const footerBaseline = 680;
  let statX = PAD_X;

  const drawStat = (label, value) => {
    setFont(ctx, 500, 8.5, FONTS.mono);
    ctx.fillStyle = INK_FAINT;
    const labelWidth = drawTracked(ctx, label, statX, footerBaseline, 1.4, 'left');
    setFont(ctx, 500, 11.5, FONTS.mono);
    ctx.fillStyle = INK_SOFT;
    ctx.fillText(value, statX + labelWidth + 7, footerBaseline);
    const valueWidth = ctx.measureText(value).width;
    statX += labelWidth + 7 + valueWidth + 18;
  };

  if (model.vibe !== null) {
    drawStat('ВАЙБ', `${formatScore(model.vibe)} / 10`);
  }
  if (model.technical !== null) {
    drawStat('ТЕХ', `${formatScore(model.technical)} / 100`);
  }

  if (model.nickname) {
    // Ник — единственная правая метка футера; под него отдаём всё место,
    // которое осталось после статистики, но не меньше 140px.
    const maxNicknameWidth = Math.max(140, CONTENT_RIGHT - statX - 14);
    let nickname = `@${model.nickname}`;
    setFont(ctx, 500, 14.5, FONTS.sans);
    while (nickname.length > 2 && ctx.measureText(nickname).width > maxNicknameWidth) {
      nickname = `${nickname.slice(0, -1).trimEnd()}…`;
    }
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(nickname, CONTENT_RIGHT, footerBaseline);
    ctx.textAlign = 'left';
  }

  // Тонкая рамка по краю — карточка не «растворяется» в тёмной ленте.
  ctx.strokeStyle = 'rgba(240, 235, 228, 0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, CARD_WIDTH - 1, CARD_HEIGHT - 1);
}

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH * CARD_SCALE;
  canvas.height = CARD_HEIGHT * CARD_SCALE;
  return canvas;
}

async function ensureFonts() {
  if (!document.fonts?.load) return;
  const specs = [
    '400 38px "Instrument Serif"',
    '500 54px "IBM Plex Mono"',
    '400 12.5px "Inter"',
    '500 13.5px "Inter"'
  ];
  await Promise.all(specs.map(spec => document.fonts.load(spec).catch(() => null)));
  if (document.fonts.ready) await document.fonts.ready;
}

export async function renderShareCard(model) {
  await ensureFonts();
  const image = await loadImage(model.backdropUrl);

  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  ctx.scale(CARD_SCALE, CARD_SCALE);
  paintCard(ctx, model, image);

  try {
    return canvas.toDataURL('image/png');
  } catch (error) {
    // Картинка с чужого origin без CORS «пачкает» canvas и ломает экспорт.
    // Тогда перерисовываем без фото — карточка остаётся, просто без кадра.
    const fallback = createCanvas();
    const fallbackCtx = fallback.getContext('2d');
    fallbackCtx.scale(CARD_SCALE, CARD_SCALE);
    paintCard(fallbackCtx, model, null);
    return fallback.toDataURL('image/png');
  }
}
