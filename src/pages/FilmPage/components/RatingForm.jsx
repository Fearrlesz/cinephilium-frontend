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

/* ============================================================
   SELECT (жанр) — премиум + тёмная тема нативного дропдауна
   ============================================================ */

/* ============================================================
   OPTION — стилизация выпадающего списка
   ============================================================ */

/* Фон и цвет для опций (работает в Firefox, частично в Chrome/Safari) */
.genre-block select option {
  background: #0a0a12 !important;
  color: #e8e4dd !important;
  padding: 12px 16px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 400;
  border: none;
}

/* Выбранная (checked) опция */
.genre-block select option:checked,
.genre-block select option[selected] {
  background: linear-gradient(135deg, rgba(168, 133, 64, 0.25), rgba(124, 58, 237, 0.15)) !important;
  color: #c9a355 !important;
  font-weight: 600;
}

/* Ховер на опции (в Firefox) */
.genre-block select option:hover {
  background: rgba(168, 133, 64, 0.15) !important;
  color: #e8e4dd !important;
}

/* Отключённые опции */
.genre-block select option:disabled {
  color: rgba(200, 200, 200, 0.3) !important;
  background: #07070a !important;
}

/* Группировка опций (если появятся <optgroup>) */
.genre-block select optgroup {
  background: #07070a;
  color: var(--gold-bright);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 8px 12px;
}

.genre-block select optgroup option {
  padding-left: 24px;
}

/* ============================================================
   FIREFOX — специальные стили (там <option> реально стилизуется)
   ============================================================ */
@-moz-document url-prefix() {
  .genre-block select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='10' viewBox='0 0 14 10'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%23a88540' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 22px center;
  }

  .genre-block select option {
    background: #0a0a12;
    color: #e8e4dd;
  }

  .genre-block select option:checked {
    background: linear-gradient(#a88540, #c9a355) !important;
    color: #07070a !important;
    font-weight: 700;
  }
}

/* ============================================================
   АДАПТИВ
   ============================================================ */
@media (max-width: 768px) {
  .genre-block select {
    padding: 14px 18px;
    font-size: 0.95rem;
  }
}  

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
          <span>⚔️ Технический балл:</span>
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
