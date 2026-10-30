import React, { useMemo, useState } from 'react';
import { CRITERIA_CONFIG, GENRE_LABELS, BLOCK_NAMES } from '../../../utils/constants';
import {
  BLOCK_COLORS,
  WEIGHT_SLIDER_MAX,
  formatScore,
  getGrade
} from '../../../utils/scoring';
import './RatingForm.css';

/* === Диапазон оценок критериев и вайба — 1–10 === */
const MIN_SCORE = 1;
const MAX_SCORE = 10;
const DEFAULT_SCORE = 5;
const SCORE_STEP = 1;
const RANGE = MAX_SCORE - MIN_SCORE;

const fillPercent = value => ((value - MIN_SCORE) / RANGE) * 100;

const BLOCK_ICONS = {
  scenario: '📋',
  characters: '👥',
  visual: '🎥',
  sound: '🔊',
  style: '✍️'
};

const normalizeWeightsArray = weights => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) return [30, 25, 20, 15, 10];

  const raw = weights.map(weight => (weight / total) * 100);
  const ints = raw.map(value => Math.floor(value));
  const remainder = 100 - ints.reduce((sum, value) => sum + value, 0);

  const fractions = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let k = 0; k < remainder; k += 1) ints[fractions[k % ints.length].index] += 1;
  return ints;
};

/**
 * F1: содержимое модалки критериев. Компонент остаётся презентационным:
 * состояние, confirm по весам и отправка живут в useRatingForm.
 */
function RatingForm({
  scores = {},
  vibe = DEFAULT_SCORE,
  genrePreset = '',
  blockWeights = [30, 25, 20, 15, 10],
  weightsValid = false,
  isSaving = false,
  error = '',
  fieldErrors = {},
  onScoreChange = () => {},
  onVibeChange = () => {},
  onGenreChange = () => {},
  onWeightChange = () => {},
  onSave = () => {},
  calculatePreview = () => ({ tech: null, vibe: 0, combined: null })
}) {
  const [activeHint, setActiveHint] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [openBlocks, setOpenBlocks] = useState({ scenario: true });

  const totalWeight = useMemo(
    () => (blockWeights || []).reduce((sum, weight) => sum + (Number(weight) || 0), 0),
    [blockWeights]
  );

  const getScore = (blockKey, criterionKey) =>
    scores?.[blockKey]?.[criterionKey] ?? DEFAULT_SCORE;

  const preview = useMemo(
    () => calculatePreview(scores, vibe, blockWeights, genrePreset),
    [scores, vibe, blockWeights, genrePreset, calculatePreview]
  );

  const grade = useMemo(() => getGrade(preview?.combined), [preview]);

  const blockScores = useMemo(() => CRITERIA_CONFIG.map((config, index) => {
    const values = config.criteria.map(criterion => scores?.[config.key]?.[criterion.key] ?? DEFAULT_SCORE);
    const average = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
    const color = BLOCK_COLORS[config.key] || BLOCK_COLORS.scenario;
    return {
      key: config.key,
      name: config.name,
      average,
      fillPct: (average / MAX_SCORE) * 100,
      color,
      weight: blockWeights?.[index] ?? 0
    };
  }), [scores, blockWeights]);

  const handleNormalize = () => {
    const next = normalizeWeightsArray(blockWeights);
    next.forEach((value, index) => onWeightChange(index, value));
  };

  const isHybrid = genrePreset === 'hybrid';

  const genreLabel = genrePreset
    ? (GENRE_LABELS?.[genrePreset] ?? genrePreset)
    : 'Без жанра (базовые веса 30/25/20/15/10)';

  const handleSelectGenre = key => {
    onGenreChange(key);
    setIsDropdownOpen(false);
  };

  const toggleBlock = key => {
    setOpenBlocks(previous => ({ ...previous, [key]: !previous[key] }));
  };

  const fieldError = (blockKey, criterionKey) => (
    fieldErrors?.[`${blockKey}.${criterionKey}`]
    || fieldErrors?.[`scores.${blockKey}.${criterionKey}`]
    || fieldErrors?.[criterionKey]
    || ''
  );

  return (
    <div className="rating-form rating-form--modal">
      {error && (
        <div className="rating-form__error" role="alert">{error}</div>
      )}

      {/* ================= ЖАНР И ВЕСА ================= */}
      <div className="genre-block glass-card">
        <h3>⚙️ Жанр и веса блоков</h3>

        <div className="custom-dropdown">
          <button
            type="button"
            className={`custom-dropdown__trigger ${isDropdownOpen ? 'is-open' : ''}`}
            onClick={() => setIsDropdownOpen(value => !value)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <span className="custom-dropdown__label">{genreLabel}</span>
            <span className={`custom-dropdown__arrow ${isDropdownOpen ? 'open' : ''}`} aria-hidden="true">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <path
                  d="M1 1l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </button>

          {isDropdownOpen && (
            <ul className="custom-dropdown__menu" role="listbox">
              <li
                role="option"
                aria-selected={!genrePreset}
                className={`custom-dropdown__item ${!genrePreset ? 'active' : ''}`}
                onClick={() => handleSelectGenre('')}
              >
                <span className="custom-dropdown__item-text">
                  Без жанра
                  <small>базовые веса 30/25/20/15/10</small>
                </span>
              </li>

              {Object.entries(GENRE_LABELS).map(([key, label]) => (
                <li
                  key={key}
                  role="option"
                  aria-selected={genrePreset === key}
                  className={`custom-dropdown__item ${genrePreset === key ? 'active' : ''}`}
                  onClick={() => handleSelectGenre(key)}
                >
                  <span className="custom-dropdown__item-text">{label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="weights-viz" role="img" aria-label="Распределение весов по блокам">
          {BLOCK_NAMES.map((name, index) => {
            const weight = blockWeights?.[index] ?? 0;
            const key = CRITERIA_CONFIG[index]?.key;
            const color = BLOCK_COLORS[key] || BLOCK_COLORS.scenario;
            return (
              <div
                key={key}
                className="weights-viz__seg"
                data-empty={weight < 6}
                style={{
                  flexGrow: weight || 0.0001,
                  '--c-from': color.from,
                  '--c-to': color.to
                }}
                title={`${name}: ${weight}%`}
              >
                {weight}%
              </div>
            );
          })}
        </div>

        <div className={`weights-sum ${weightsValid ? 'valid' : 'invalid'}`}>
          <span>
            Σ = <span className="weights-sum__total">{totalWeight}</span>%{' '}
            {weightsValid ? '✓ Соответствует' : '— нужно 100%'}
          </span>

          {!weightsValid && isHybrid && (
            <button type="button" className="normalize-btn" onClick={handleNormalize}>
              Уровнять
            </button>
          )}
        </div>

        {!isHybrid ? (
          <button
            type="button"
            className="weights-manual-btn"
            onClick={() => onGenreChange('hybrid')}
            aria-expanded={false}
          >
            Веса вручную
          </button>
        ) : (
          <div className="weight-sliders">
            {BLOCK_NAMES.map((name, index) => {
              const key = CRITERIA_CONFIG[index]?.key;
              const color = BLOCK_COLORS[key] || BLOCK_COLORS.scenario;
              const weight = blockWeights?.[index] ?? 0;
              // F1: слайдер 0–50, но старые ручные веса могли быть больше 50
              // (бэкенд разрешает 0–100). Не даём браузеру молча срезать значение.
              const sliderMax = Math.max(WEIGHT_SLIDER_MAX, weight);
              return (
                <div
                  key={key}
                  className="weight-slider"
                  style={{ '--c-from': color.from, '--c-to': color.to }}
                >
                  <label htmlFor={`weight-${index}`}>
                    <span className="weight-dot" aria-hidden="true" />
                    {BLOCK_ICONS[key]} {name}
                  </label>
                  <input
                    id={`weight-${index}`}
                    type="range"
                    min="0"
                    max={sliderMax}
                    step="1"
                    value={weight}
                    onChange={event => onWeightChange(index, Number(event.target.value))}
                    style={{ '--fill': `${Math.min(100, (weight / sliderMax) * 100)}%` }}
                    aria-label={`Вес блока ${name}`}
                  />
                  <span className="value-display">{weight}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= КРИТЕРИИ (1–10), АККОРДЕОН ================= */}
      {CRITERIA_CONFIG.map(block => {
        const color = BLOCK_COLORS[block.key] || BLOCK_COLORS.scenario;
        const isOpen = Boolean(openBlocks[block.key]);
        const average = blockScores.find(item => item.key === block.key)?.average ?? DEFAULT_SCORE;

        return (
          <div
            key={block.key}
            className="criteria-block"
            style={{
              '--block-color': color.solid,
              '--c-from': color.from,
              '--c-to': color.to
            }}
          >
            <button
              type="button"
              className="criteria-block__head"
              onClick={() => toggleBlock(block.key)}
              aria-expanded={isOpen}
            >
              <span className="criteria-block__title">
                {BLOCK_ICONS[block.key]} {block.name}
              </span>
              <span className="criteria-block__avg">{average.toFixed(1)}</span>
              <span className={`criteria-block__chevron ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
                ⌄
              </span>
            </button>

            {isOpen && (
              <div className="criteria-block__body">
                {block.criteria.map(criterion => {
                  const value = getScore(block.key, criterion.key);
                  const hintId = `${block.key}.${criterion.key}`;
                  const currentError = fieldError(block.key, criterion.key);

                  return (
                    <React.Fragment key={criterion.key}>
                      <div className="criterion-slider">
                        <label htmlFor={`crit-${hintId}`}>
                          {criterion.name}{' '}
                          <span className="hint-wrapper">
                            <button
                              type="button"
                              className="hint-icon"
                              onClick={() => setActiveHint(activeHint === hintId ? null : hintId)}
                              aria-expanded={activeHint === hintId}
                              aria-label={`Подсказка: ${criterion.name}`}
                            >
                              ⓘ
                            </button>
                            {activeHint === hintId && (
                              <span className="hint-popup" role="tooltip">{criterion.hint}</span>
                            )}
                          </span>
                        </label>

                        <input
                          id={`crit-${hintId}`}
                          type="range"
                          min={MIN_SCORE}
                          max={MAX_SCORE}
                          step={SCORE_STEP}
                          value={value}
                          onChange={event => onScoreChange(
                            block.key,
                            criterion.key,
                            Number(event.target.value)
                          )}
                          style={{ '--fill': `${fillPercent(value)}%` }}
                        />
                        <span className="value-display">{value}</span>
                      </div>

                      {currentError && (
                        <span className="field-error" role="alert">{currentError}</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ================= ВАЙБ (1–10) ================= */}
      <div className="vibe-block">
        <label htmlFor="vibeSlider">
          💫 Вайб — субъективное впечатление (1–10). Не влияет на технический балл.
        </label>
        <input
          id="vibeSlider"
          type="range"
          min={MIN_SCORE}
          max={MAX_SCORE}
          step={SCORE_STEP}
          value={vibe}
          onChange={event => onVibeChange(Number(event.target.value))}
          style={{ '--fill': `${fillPercent(vibe)}%` }}
        />
        <span className="value-display">{vibe}</span>
      </div>

      {/* ================= ПРЕВЬЮ ================= */}
      <div className="preview glass-card">
        <div className="preview-head">
          <h4>📊 Предварительный расчёт</h4>
          {grade && (
            <div
              className="grade-badge"
              style={{ '--grade-color': grade.color }}
              aria-label={`Оценка ${grade.letter} — ${grade.label}`}
            >
              <span className="grade-badge__letter">{grade.letter}</span>
              <span className="grade-badge__label">{grade.label}</span>
            </div>
          )}
        </div>

        <div className="block-bars">
          {blockScores.map(block => (
            <div key={block.key} className="block-bar">
              <span className="block-bar__label">
                <span
                  className="block-bar__dot"
                  style={{ background: block.color.solid, color: block.color.solid }}
                  aria-hidden="true"
                />
                {BLOCK_ICONS[block.key]} {block.name}
              </span>
              <div className="block-bar__track">
                <div
                  className="block-bar__fill"
                  style={{ width: `${block.fillPct}%`, background: block.color.solid }}
                />
              </div>
              <span className="block-bar__value">{block.average.toFixed(1)}</span>
            </div>
          ))}
        </div>

        <div className="preview-row">
          <span>
            ⚔️ Технический балл
            <small>Взвешенное среднее по блокам (10–100)</small>
          </span>
          <strong>{Number.isFinite(Number(preview?.tech)) ? formatScore(preview.tech) : '—'}</strong>
        </div>

        <div className="preview-row">
          <span>
            🚬 Вайб
            <small>Субъективное впечатление (1–10)</small>
          </span>
          <strong>{vibe}</strong>
        </div>

        <div className="preview-row primary">
          <span>
            ⭐ Комбинированный
            <small>70% техника + 30% вайб</small>
          </span>
          <strong>{Number.isFinite(Number(preview?.combined)) ? formatScore(preview.combined) : '—'}</strong>
        </div>
      </div>

      <button
        className="btn-save-rating"
        disabled={isSaving || !weightsValid}
        onClick={onSave}
      >
        {isSaving ? '⏳ Сохранение...' : '💾 Сохранить оценку'}
      </button>
    </div>
  );
}

export default RatingForm;
