import React, { useMemo, useState } from 'react';
import { CRITERIA_CONFIG, GENRE_LABELS, BLOCK_NAMES } from '../../../utils/constants';
import './RatingForm.css';

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
  const [activeHint, setActiveHint] = useState(null);   // 👈 ДОБАВЛЕНО

  const getScore = (blockKey, critKey) => {
    return scores?.[blockKey]?.[critKey] ?? 5;
  };

  const preview = useMemo(() => {
    try {
      return calculatePreview() || { tech: 0, vibe: 0, combined: 0 };
    } catch {
      return { tech: 0, vibe: 0, combined: 0 };
    }
  }, [calculatePreview]);

  const totalWeight = useMemo(() => {
    return blockWeights?.reduce((a, b) => a + b, 0) || 0;
  }, [blockWeights]);

  return (
    <>
      <div className="genre-block glass-card">
        <h3>⚙️ Жанр и веса блоков</h3>
        <select 
          value={genrePreset} 
          onChange={e => onGenreChange(e.target.value)}
        >
          <option value="">Без жанра (базовые веса 30/25/20/15/10)</option>
          {Object.entries(GENRE_LABELS).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
        
        {BLOCK_NAMES.map((name, i) => {
          const weight = blockWeights?.[i] ?? 20;
          const isDisabled = genrePreset !== 'hybrid';
          return (
            <div key={i} className="weight-slider">
              <label>{name}</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="1" 
                value={weight}
                disabled={isDisabled}
                onChange={e => onWeightChange(i, e.target.value)}
                style={{ '--fill': `${weight}%` }}
              />
              <span className="value-display">{weight}%</span>
            </div>
          );
        })}
        
        <div className={`weights-sum ${weightsValid ? 'valid' : 'invalid'}`}>
          Σ = {totalWeight}% {weightsValid ? '✓' : '— нужно 100%'}
        </div>
      </div>

      {CRITERIA_CONFIG.map(block => {
        return (
          <div key={block.key} className="criteria-block">
            <h4>{block.name}</h4>
            {block.criteria.map(crit => {
              const value = getScore(block.key, crit.key);
              const hintId = `${block.key}.${crit.key}`;   // 👈 уникальный id

              return (
                <div key={crit.key} className="criterion-slider">
                  <label>
                    {crit.name}{' '}
                    <span className="hint-wrapper">
                      <button
                        type="button"
                        className="hint-icon"
                        onClick={() => setActiveHint(activeHint === hintId ? null : hintId)}
                        aria-expanded={activeHint === hintId}
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
                    type="range" 
                    min="1" 
                    max="10" 
                    step="1"
                    value={value}
                    onChange={e => onScoreChange(block.key, crit.key, e.target.value)}
                    style={{ '--fill': `${(value - 1) * 10}%` }}
                  />
                  <span className="value-display">{value}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="vibe-block">
        <label>💫 Вайб — субъективное впечатление. Не влияет на технический балл.</label>
        <input 
          type="range" 
          min="1" 
          max="10" 
          step="1" 
          value={vibe}
          onChange={e => onVibeChange(Number(e.target.value))}
          style={{ '--fill': `${(vibe - 1) * 10}%` }}
        />
        <span className="value-display">{vibe}</span>
      </div>

      <div className="review-block glass-card">
        <label>📝 Текстовый отзыв (опционально)</label>
        <textarea
          value={textReview || ''}
          onChange={e => onTextReviewChange(e.target.value)}
          placeholder="Напишите свои впечатления о фильме..."
          rows={4}
          className="review-textarea"
        />
      </div>

      <div className="preview glass-card">
        <h4>📊 Предварительный расчет</h4>
        <div className="preview-row">
          <span>Технический балл:</span>
          <strong>{preview.tech?.toFixed(1) || '0.0'}</strong>
        </div>
        <div className="preview-row">
          <span>💫 Вайб:</span>
          <strong>{vibe?.toFixed(1) || '0.0'}</strong>
        </div>
        <div className="preview-row">
          <span>⭐ Комбинированный:</span>
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
