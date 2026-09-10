import React from 'react';
import { CRITERIA_CONFIG, GENRE_LABELS, getScoreColor } from '../utils/constants';

function RatingDetailsModal({ rating, onClose }) {
  if (!rating) return null;

  const weights = rating.blockWeights || {
    scenario: 30, characters: 25, visual: 20, sound: 15, style: 10
  };
  const weightValues = [
    weights.scenario, weights.characters, weights.visual,
    weights.sound, weights.style
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <h2>{rating.film?.title || rating.filmId?.title || 'Фильм'}</h2>
          <div className="modal-scores">
            <div className="modal-score-item">
              <label>Технический балл:</label>
              <span style={{ color: getScoreColor(rating.technicalScore), fontSize: '28px', fontWeight: 'bold' }}>
                {rating.technicalScore?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="modal-score-item">
              <label>💫 Вайб:</label>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {rating.vibe || 0}
              </span>
            </div>
            <div className="modal-score-item">
              <label>Комбинированный:</label>
              <span style={{ color: getScoreColor(rating.combinedScore), fontSize: '24px', fontWeight: 'bold' }}>
                {rating.combinedScore?.toFixed(1) || '0.0'}
              </span>
            </div>
          </div>
          <p className="modal-user">👤 {rating.userId?.nickname || rating.userName || 'Пользователь'}</p>
          {rating.genrePreset && (
            <p>Жанровый пресет: <strong>{GENRE_LABELS[rating.genrePreset] || rating.genrePreset}</strong></p>
          )}
          <div className="modal-weights">
            <h4>Веса блоков:</h4>
            {['Сценарий', 'Персонажи', 'Визуал', 'Звук', 'Стиль'].map((name, i) => (
              <div key={i} className="modal-weight-item">
                <span>{name}:</span>
                <span>{weightValues[i] || 0}%</span>
              </div>
            ))}
          </div>
          {rating.textReview && (
            <div className="modal-review">
              <p><strong>Отзыв:</strong> {rating.textReview}</p>
            </div>
          )}
        </div>
        <div className="modal-criteria-blocks">
          {CRITERIA_CONFIG.map(block => (
            <div key={block.key} className="modal-criteria-block">
              <h4>{block.name}</h4>
              <div className="modal-criteria-list">
                {block.criteria.map(crit => (
                  <div key={crit.key} className="modal-criterion">
                    <span title={crit.hint}>{crit.name}</span>
                    <span className="modal-criterion-score">
                      {rating.scores?.[block.key]?.[crit.key] || 0}/10
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RatingDetailsModal;
