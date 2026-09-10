import React, { useEffect, useMemo, useState } from 'react';
import { CRITERIA_CONFIG, GENRE_LABELS, BLOCK_NAMES } from '../../../utils/constants';

// Хелпер: безопасно приводит значение к числу
const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function RatingForm({
  scores = {},
  vibe = 5,
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

  // Закрытие тултипа по Escape
  useEffect(() => {
    if (!activeHint) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setActiveHint(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeHint]);

  const getScore = (blockKey, critKey) => {
    const raw = scores?.[blockKey]?.[critKey];
    return toNum(raw, 5);
  };

  // Мемоизируем по реальным входным данным, а не по функции
  const preview = useMemo(() => {
    try {
      return calculatePreview() || { tech: 0, vibe: 0, combined: 0 };
    } catch {
      return { tech: 0, vibe: 0, combined: 0 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, vibe, blockWeights, genrePreset]);

  const totalWeight = useMemo(() => {
    return (blockWeights || []).reduce((a, b) => a + toNum(b, 0), 0);
  }, [blockWeights]);

  // Допуск для сравнения суммы весов
  const totalWeightRounded = Math.round(totalWeight * 100) / 100;
  const weightsOk = Math.abs(totalWeightRounded - 100) < 0.01;
  // Если родитель не передал валидность — используем локальную проверку
  const canSave = weightsValid || weightsOk;

  const vibeNum = toNum(vibe, 0);
  const techNum = toNum(preview?.tech, 0);
  const combinedNum = toNum(preview?.combined, 0);

  return (
    <>
      <div className="genre-block glass-card">
        <h3>⚙️ Жанр и веса блоков</h3>
        <select
          value={genrePreset}
          onChange={(e) => onGenreChange(e.target.value)}
        >
          <option value="">Без жанра (базовые веса 30/25/20/15/10)</option>
          {Object.entries(GENRE_LABELS).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>

        {BLOCK_NAMES.map((name, i) => {
          const weight = toNum(blockWeights?.[i], 0);
          const isDisabled = genrePreset !== 'hybrid';
          const inputId = `weight-${i}`;
          return (
            <div key={i} className="weight-slider">
              <label htmlFor={inputId}>{name}</label>
              <input
                id={inputId}
                type="range"
                min="0"
                max="100"
                step="1"
                value={weight}
                disabled={isDisabled}
                onChange={(e) => onWeightChange(i, Number(e.target.value))}
                style={{ '--fill': `${weight}%` }}
              />
              <span className="value-display">{weight}%</span>
            </div>
          );
        })}

        <div className={`weights-sum ${canSave ? 'valid' : 'invalid'}`}>
          Σ = {totalWeightRounded}% {canSave ? '✓' : '— нужно 100%'}
        </div>
      </div>

      {CRITERIA_CONFIG.map((block) => (
        <div key={block.key} className="criteria-block">
          <h4>{block.name}</h4>
          {block.criteria.map((crit) => {
            const value = getScore(block.key, crit.key);
            const hintId = `${block.key}.${crit.key}`;
            const inputId = `score-${block.key}-${crit.key}`;

            return (
              <div key={crit.key} className="criterion-slider">
                <label htmlFor={inputId}>
                  {crit.name}{' '}
                  <span className="hint-wrapper">
                    <button
                      type="button"
                      className="hint-icon"
                      onClick={() =>
                        setActiveHint(activeHint === hintId ? null : hintId)
                      }
                      aria-label={`Подсказка: ${crit.name}`}
                      aria-expanded={activeHint === hintId}
                      aria-controls={`hint-${hintId}`}
                    >
                      ⓘ
                    </button>
                    {activeHint === hintId && (
                      <span
                        className="hint-popup"
                        role="tooltip"
                        id={`hint-${hintId}`}
                      >
                        {crit.hint}
                      </span>
                    )}
                  </span>
                </label>
                <input
                  id={inputId}
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={value}
                  onChange={(e) =>
                    onScoreChange(block.key, crit.key, Number(e.target.value))
                  }
                  style={{ '--fill': `${(value - 1) * 10}%` }}
                />
                <span className="value-display">{value}</span>
              </div>
            );
          })}
        </div>
      ))}

      <div className="vibe-block">
        <label htmlFor="vibe-slider">
          💫 Вайб — субъективное впечатление. Не влияет на технический балл.
        </label>
        <input
          id="vibe-slider"
          type="range"
          min="1"
          max="10"
          step="1"
          value={vibeNum}
          onChange={(e) => onVibeChange(Number(e.target.value))}
          style={{ '--fill': `${(vibeNum - 1) * 10}%` }}
        />
        <span className="value-display">{vibeNum}</span>
      </div>

      <div className="review-block glass-card">
        <label htmlFor="text-review">📝 Текстовый отзыв (опционально)</label>
        <textarea
          id="text-review"
          value={textReview || ''}
          onChange={(e) => onTextReviewChange(e.target.value)}
          placeholder="Напишите свои впечатления о фильме..."
          rows={4}
          className="review-textarea"
        />
      </div>

      <div className="preview glass-card">
        <h4>📊 Предварительный расчет</h4>
        <div className="preview-row">
          <span>Технический балл:</span>
          <strong>{techNum.toFixed(1)}</strong>
        </div>
        <div className="preview-row">
          <span>💫 Вайб:</span>
          <strong>{vibeNum.toFixed(1)}</strong>
        </div>
        <div className="preview-row">
          <span>⭐ Комбинированный:</span>
          <strong>{combinedNum.toFixed(1)}</strong>
        </div>
      </div>

      <button
        className="btn-save-rating"
        disabled={isSaving || !canSave}
        onClick={onSave}
      >
        {isSaving ? '⏳ Сохранение...' : '💾 Сохранить оценку'}
      </button>
    </>
  );
}

export default RatingForm;
