import React, { useMemo, useState } from 'react';
import { CRITERIA_CONFIG, GENRE_LABELS, BLOCK_NAMES } from '../../../utils/constants';
import './RatingForm.css';

/* === Диапазон оценок критериев и вайба — 1–10 === */
const MIN_SCORE = 1;
const MAX_SCORE = 10;
const DEFAULT_SCORE = 5;          // середина шкалы 1–10
const SCORE_STEP = 1;
const RANGE = MAX_SCORE - MIN_SCORE; // 9

/* процент заливки слайдера для значения в диапазоне 1–10 */
const fillPercent = (value) => ((value - MIN_SCORE) / RANGE) * 100;

/* === Цвета и иконки блоков (ключи соответствуют CRITERIA_CONFIG) === */
const BLOCK_META = {
  scenario:   { icon: '📋', color: 'oklch(0.72 0.14 40)'  }, // коралл
  characters: { icon: '👥', color: 'oklch(0.78 0.14 320)' }, // маджента
  visual:     { icon: '🎥', color: 'oklch(0.72 0.13 300)' }, // фиолет
  sound:      { icon: '🔊', color: 'oklch(0.75 0.11 200)' }, // бирюза
  style:      { icon: '✍️', color: 'oklch(0.75 0.15 145)' }, // зелёный
};

/* === Буквенная шкала оценок (по ТБ, диапазон 10–100) === */
const getGrade = (score) => {
  if (score >= 90) return { letter: 'S', label: 'Шедевр',  color: 'oklch(0.78 0.14 320)' };
  if (score >= 80) return { letter: 'A', label: 'Отлично', color: 'oklch(0.78 0.14 150)' };
  if (score >= 65) return { letter: 'B', label: 'Хорошо',  color: 'oklch(0.80 0.13 100)' };
  if (score >= 50) return { letter: 'C', label: 'Средне',  color: 'oklch(0.80 0.145 72)' };
  if (score >= 35) return { letter: 'D', label: 'Слабо',   color: 'oklch(0.72 0.15 40)'  };
  return                  { letter: 'E', label: 'Провал',  color: 'oklch(0.63 0.20 30)'  };
};

/* === Пропорциональное приведение весов к 100% === */
const normalizeWeightsArray = (weights) => {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return [30, 25, 20, 15, 10];

  const raw  = weights.map(w => (w / total) * 100);
  const ints = raw.map(v => Math.floor(v));
  const remainder = 100 - ints.reduce((a, b) => a + b, 0);

  const fractions = raw
    .map((v, i) => ({ i, f: v - Math.floor(v) }))
    .sort((a, b) => b.f - a.f);

  for (let k = 0; k < remainder; k++) ints[fractions[k % ints.length].i] += 1;
  return ints;
};

function RatingForm({
  scores = {},
  vibe = DEFAULT_SCORE,
  genrePreset = '',
  blockWeights = [30, 25, 20, 15, 10],
  textReview = '',
  weightsValid = false,
  isSaving = false,
  onScoreChange = () => {},
  onVibeChange = () => {},
  onGenreChange = () => {},
  onWeightChange = () => {},
  onTextReviewChange = () => {},
  onSave = () => {},
  calculatePreview = () => ({ tech: 0, vibe: 0, combined: 0 })
}) {
  const [activeHint, setActiveHint] = useState(null);

{/* Вместо <select> */}
<div className="custom-dropdown">
  <div 
    className="custom-dropdown__trigger" 
    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
  >
    {genreLabel}
    <span className={`custom-dropdown__arrow ${isDropdownOpen ? 'open' : ''}`}>
      ▼
    </span>
  </div>

  {isDropdownOpen && (
    <ul className="custom-dropdown__menu">
      <li 
        className={`custom-dropdown__item ${!genrePreset ? 'active' : ''}`}
        onClick={() => {
          onGenreChange('');
          setIsDropdownOpen(false);
        }}
      >
        Без жанра (базовые веса 30/25/20/15/10)
      </li>
      {Object.entries(GENRE_LABELS).map(([k, l]) => (
        <li 
          key={k} 
          className={`custom-dropdown__item ${genrePreset === k ? 'active' : ''}`}
          onClick={() => {
            onGenreChange(k);
            setIsDropdownOpen(false);
          }}
        >
          {l}
        </li>
      ))}
    </ul>
  )}
</div>

  
  /* === Средние по блокам (1–10) — для полосок превью === */
  const blockScores = useMemo(() => {
    return CRITERIA_CONFIG.map((cfg, i) => {
      const vals = cfg.criteria.map(c => scores?.[cfg.key]?.[c.key] ?? DEFAULT_SCORE);
      const avg  = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      const meta = BLOCK_META[cfg.key] || {};
      return {
        key: cfg.key,
        name: cfg.name,
        avg,                                        // 1–10
        fillPct: (avg / MAX_SCORE) * 100,           // для ширины полоски
        color: meta.color || 'oklch(0.80 0.145 72)',
        weight: blockWeights?.[i] ?? 0,
      };
    });
  }, [scores, blockWeights]);

  const grade = useMemo(
    () => getGrade(preview.combined || 0),
    [preview.combined]
  );

  const handleNormalize = () => {
    const next = normalizeWeightsArray(blockWeights);
    next.forEach((v, i) => onWeightChange(i, v));
  };

  const isHybrid = genrePreset === 'hybrid';

  return (
    <>
      {/* ================= ЖАНР И ВЕСА ================= */}
      <div className="genre-block glass-card">
        <h3>⚙️ Жанр и веса блоков</h3>

{/* Вместо <select> */}
<div className="custom-dropdown">
  <div 
    className="custom-dropdown__trigger" 
    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
  >
    {genreLabel}
    <span className={`custom-dropdown__arrow ${isDropdownOpen ? 'open' : ''}`}>
      ▼
    </span>
  </div>

  {isDropdownOpen && (
    <ul className="custom-dropdown__menu">
      <li 
        className={`custom-dropdown__item ${!genrePreset ? 'active' : ''}`}
        onClick={() => {
          onGenreChange('');
          setIsDropdownOpen(false);
        }}
      >
        Без жанра (базовые веса 30/25/20/15/10)
      </li>
      {Object.entries(GENRE_LABELS).map(([k, l]) => (
        <li 
          key={k} 
          className={`custom-dropdown__item ${genrePreset === k ? 'active' : ''}`}
          onClick={() => {
            onGenreChange(k);
            setIsDropdownOpen(false);
          }}
        >
          {l}
        </li>
      ))}
    </ul>
  )}
</div>

        {/* Цветовая визуализация распределения весов */}
        <div className="weights-viz" role="img" aria-label="Распределение весов по блокам">
          {BLOCK_NAMES.map((name, i) => {
            const w     = blockWeights?.[i] ?? 0;
            const key   = CRITERIA_CONFIG[i]?.key;
            const color = BLOCK_META[key]?.color || 'oklch(0.80 0.145 72)';
            const empty = w < 6;
            return (
              <div
                key={i}
                className="weights-viz__seg"
                data-empty={empty}
                style={{ flexGrow: w || 0.0001, background: color }}
                title={`${name}: ${w}%`}
              >
                {w}%
              </div>
            );
          })}
        </div>

        {BLOCK_NAMES.map((name, i) => {
          const weight     = blockWeights?.[i] ?? 20;
          const isDisabled = !isHybrid;
          const key        = CRITERIA_CONFIG[i]?.key;
          const meta       = BLOCK_META[key] || {};
          const color      = meta.color || 'oklch(0.80 0.145 72)';
          const icon       = meta.icon  || '';

          return (
            <div key={i} className="weight-slider">
              <label htmlFor={`weight-${i}`}>
                <span
                  className="weight-dot"
                  style={{ background: color, color }}
                  aria-hidden="true"
                />
                {icon} {name}
              </label>
              <input
                id={`weight-${i}`}
                type="range"
                min="0"
                max="100"
                step="1"
                value={weight}
                disabled={isDisabled}
                onChange={e => onWeightChange(i, Number(e.target.value))}
                style={{ '--fill': `${weight}%`, '--slider-color': color }}
                aria-label={`Вес блока ${name}`}
              />
              <span className="value-display" style={{ color }}>
                {weight}%
              </span>
            </div>
          );
        })}

        <div className={`weights-sum ${weightsValid ? 'valid' : 'invalid'}`}>
          <span>
            Σ = <span className="weights-sum__total">{totalWeight}</span>%{' '}
            {weightsValid ? '✓ Соответствует' : '— нужно 100%'}
          </span>

          {!weightsValid && isHybrid && (
            <button
              type="button"
              className="normalize-btn"
              onClick={handleNormalize}
            >
              Уровнять
            </button>
          )}
        </div>
      </div>

      {/* ================= КРИТЕРИИ (1–10) ================= */}
      {CRITERIA_CONFIG.map(block => {
        const meta = BLOCK_META[block.key] || {};
        return (
          <div
            key={block.key}
            className="criteria-block"
            style={{ '--block-color': meta.color || 'oklch(0.80 0.145 72)' }}
          >
            <h4>{meta.icon} {block.name}</h4>

            {block.criteria.map(crit => {
              const value  = getScore(block.key, crit.key);
              const hintId = `${block.key}.${crit.key}`;

              return (
                <div key={crit.key} className="criterion-slider">
                  <label htmlFor={`crit-${hintId}`}>
                    {crit.name}{' '}
                    <span className="hint-wrapper">
                      <button
                        type="button"
                        className="hint-icon"
                        onClick={() =>
                          setActiveHint(activeHint === hintId ? null : hintId)
                        }
                        aria-expanded={activeHint === hintId}
                        aria-label={`Подсказка: ${crit.name}`}
                      >
                        ⓘ
                      </button>
                      {activeHint === hintId && (
                        <span className="hint-popup" role="tooltip">
                          {crit.hint}
                        </span>
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
                    onChange={e =>
                      onScoreChange(block.key, crit.key, Number(e.target.value))
                    }
                    style={{ '--fill': `${fillPercent(value)}%` }}
                  />
                  <span className="value-display">{value}</span>
                </div>
              );
            })}
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
          onChange={e => onVibeChange(Number(e.target.value))}
          style={{ '--fill': `${fillPercent(vibe)}%` }}
        />
        <span className="value-display">{vibe}</span>
      </div>

      {/* ================= ОТЗЫВ ================= */}
      <div className="review-block glass-card">
        <label htmlFor="reviewText">📝 Текстовый отзыв (опционально)</label>
        <textarea
          id="reviewText"
          value={textReview || ''}
          onChange={e => onTextReviewChange(e.target.value)}
          placeholder="Напишите свои впечатления о фильме..."
          rows={4}
          maxLength={2000}
          className="review-textarea"
        />
        <div className="review-meta">
          <span>Помогает запомнить детали</span>
          <span>{(textReview || '').length} / 2000</span>
        </div>
      </div>

      {/* ================= ПРЕВЬЮ ================= */}
      <div className="preview glass-card">
        <div className="preview-head">
          <h4>📊 Предварительный расчет</h4>
          <div
            className="grade-badge"
            style={{ '--grade-color': grade.color }}
            aria-label={`Оценка ${grade.letter} — ${grade.label}`}
          >
            <span className="grade-badge__letter">{grade.letter}</span>
            <span className="grade-badge__label">{grade.label}</span>
          </div>
        </div>

        <div className="block-bars">
          {blockScores.map(b => (
            <div key={b.key} className="block-bar">
              <span className="block-bar__label">
                <span
                  className="block-bar__dot"
                  style={{ background: b.color, color: b.color }}
                  aria-hidden="true"
                />
                {BLOCK_META[b.key]?.icon} {b.name}
              </span>
              <div className="block-bar__track">
                <div
                  className="block-bar__fill"
                  style={{ width: `${b.fillPct}%`, background: b.color }}
                />
              </div>
              <span className="block-bar__value">{b.avg.toFixed(1)}</span>
            </div>
          ))}
        </div>

        <div className="preview-row">
          <span>
            ⚔️ Технический балл
            <small>Взвешенное среднее по блокам (10–100)</small>
          </span>
          <strong>{preview.tech?.toFixed(1) || '0.0'}</strong>
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
          <strong>{preview.combined?.toFixed(1) || '0.0'}</strong>
        </div>
      </div>

      <button
        className="btn-save-rating"
        disabled={isSaving || !weightsValid}
        onClick={onSave}
      >
        {isSaving ? '⏳ Сохранение...' : '💾 Сохранить оценку'}
      </button>
    </>
  );
}

export default RatingForm;
