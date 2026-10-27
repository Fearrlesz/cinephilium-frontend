import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CRITERIA_CONFIG,
  GENRE_LABELS,
  PRESET_WEIGHTS,
  getScoreColor
} from '../../../utils/constants';
import {
  formatDate,
  computeBlockAverages,
  BLOCK_CRITERIA_LABELS
} from '../../../utils/ratingUtils';
import './ReviewsSection.css';

const MAX_TITLE = 100;
const MAX_TEXT = 5000;

/* ---------- утилиты ---------- */

function getWeightsArray(rating) {
  if (!rating) return [30, 25, 20, 15, 10];

  if (rating.genrePreset && PRESET_WEIGHTS?.[rating.genrePreset]) {
    return PRESET_WEIGHTS[rating.genrePreset];
  }
  if (rating.blockWeights) {
    const w = rating.blockWeights;
    return [
      w.scenario   ?? 30,
      w.characters ?? 25,
      w.visual     ?? 20,
      w.sound      ?? 15,
      w.style      ?? 10
    ];
  }
  return [30, 25, 20, 15, 10];
}

/* ---------- сводка оценки (как в профиле) ---------- */

function RatingCriteriaSummary({ rating }) {
  if (!rating || typeof rating !== 'object') return null;

  const blockAvgs = computeBlockAverages(rating.scores);
  const technical = rating.technicalScore;
  const vibe      = rating.vibe;
  const combined  = rating.combinedScore ?? rating.finalScore;

  return (
    <div className="review-criteria-summary">
      <div className="criteria-summary-row">
        {technical != null && (
          <div className="summary-pill">
            <span className="summary-pill-label">Технический</span>
            <span
              className="summary-pill-value"
              style={{ color: getScoreColor(technical) }}
            >
              {technical}
            </span>
          </div>
        )}

        <div className="summary-pill">
          <span className="summary-pill-label">Вайб</span>
          <span className="summary-pill-value">
            {vibe ?? '—'}
            {vibe != null && <span className="summary-pill-suffix">/10</span>}
          </span>
        </div>

        {combined != null && (
          <div className="summary-pill">
            <span className="summary-pill-label">Комбо</span>
            <span
              className="summary-pill-value"
              style={{ color: getScoreColor(combined) }}
            >
              {combined}
            </span>
          </div>
        )}
      </div>

      {blockAvgs && Object.keys(blockAvgs).length > 0 && (
        <div className="criteria-blocks-row">
          {Object.entries(blockAvgs).map(([key, avg]) =>
            avg != null ? (
              <div key={key} className="criteria-block-chip">
                <span className="chip-label">
                  {BLOCK_CRITERIA_LABELS[key]?.name || key}
                </span>
                <span className="chip-value">{avg}</span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- блок деталей оценки (раскрывающийся) ---------- */

function RatingDetailsBlock({ rating }) {
  if (!rating) return null;
  const weights = getWeightsArray(rating);

  return (
    <div className="review-rating-details">
      {rating.genrePreset && GENRE_LABELS[rating.genrePreset] && (
        <div className="review-rating-summary">
          <div className="summary-item summary-item-wide">
            <span className="summary-label">Жанровые веса</span>
            <span className="summary-value summary-genre">
              {GENRE_LABELS[rating.genrePreset]}
            </span>
          </div>
        </div>
      )}

      <div className="review-blocks">
        {CRITERIA_CONFIG.map((block, i) => {
          const blockScores = rating.scores?.[block.key];
          if (!blockScores) return null;
          return (
            <div key={block.key} className="review-block">
              <div className="review-block-header">
                <span className="review-block-name">{block.name}</span>
                <span className="review-block-weight">{weights[i]}%</span>
              </div>
              <ul className="review-criteria-list">
                {block.criteria.map((crit) => (
                  <li key={crit.key} className="review-criterion">
                    <span className="criterion-name">{crit.name}</span>
                    <span className="criterion-score">
                      {blockScores[crit.key] ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- основной компонент ---------- */

function ReviewsSection({
  reviews,
  currentUser,
  film,
  userRating,
  onAddReview,
  onLikeReview
}) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ title: '', text: '' });
  const [expanded, setExpanded] = useState({});

  const canPublish =
    newReview.title.trim().length > 0 && newReview.text.trim().length > 0;

  const handleAddReview = () => {
    if (!canPublish) return;
    onAddReview(newReview.title.trim(), newReview.text.trim());
    setNewReview({ title: '', text: '' });
    setShowReviewForm(false);
  };

  const handleCancel = () => {
    setNewReview({ title: '', text: '' });
    setShowReviewForm(false);
  };

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="reviews-section glass-card">
      <div className="reviews-header">
        <h3>
          📝 Рецензии
          <span className="reviews-count">{reviews.length}</span>
        </h3>
        {currentUser && (
          <button
            className={`btn-add-review ${showReviewForm ? 'active' : ''}`}
            onClick={() => setShowReviewForm((p) => !p)}
          >
            {showReviewForm ? '✕ Отменить' : '✎ Написать рецензию'}
          </button>
        )}
      </div>

      {showReviewForm && (
        <div className="review-form">
          <div className="review-form-header">
            <span className="review-form-title">Новая рецензия</span>
            {!userRating && (
              <span className="review-form-hint">
                ⚠ Чтобы опубликовать, сначала оцените фильм
              </span>
            )}
          </div>

          <input
            type="text"
            className="review-input"
            placeholder="Заголовок рецензии"
            value={newReview.title}
            maxLength={MAX_TITLE}
            onChange={(e) =>
              setNewReview({ ...newReview, title: e.target.value })
            }
          />

          <div className="review-textarea-wrapper">
            <textarea
              className="review-textarea"
              placeholder="Поделитесь впечатлениями о фильме..."
              value={newReview.text}
              maxLength={MAX_TEXT}
              onChange={(e) =>
                setNewReview({ ...newReview, text: e.target.value })
              }
            />
            <span className="char-counter">
              {newReview.text.length} / {MAX_TEXT}
            </span>
          </div>

          <div className="review-form-footer">
            <button className="btn-cancel" onClick={handleCancel}>
              Отмена
            </button>
            <button
              className="btn-publish"
              onClick={handleAddReview}
              disabled={!canPublish}
            >
              Опубликовать рецензию
            </button>
          </div>
        </div>
      )}

      <div className="reviews-list">
        {reviews.length === 0 && (
          <div className="reviews-empty">
            Пока нет рецензий. Будьте первым!
          </div>
        )}

        {reviews.map((review) => {
          const author = review.userId || {};
          const nickname = author.nickname || 'Пользователь';
          const initial = nickname.charAt(0).toUpperCase();
          const authorId = author._id;
          const rating = review.ratingId;
          const isPending = review.status === 'pending';
          // У старых рецензий ratingId может быть null: рейтинг удалили или
          // документ создан до появления этого поля. typeof null === 'object',
          // поэтому одной проверки typeof недостаточно — иначе чтение
          // rating.combinedScore роняет всю страницу фильма.
          const hasRating = rating !== null && typeof rating === 'object';

          // итоговый балл для бейджа: комбо → техника → ничего
          const badgeScore = hasRating
            ? (rating.combinedScore ?? rating.finalScore ?? rating.technicalScore)
            : null;

          return (
            <article
              key={review._id}
              id={review._id}
              className="review-card"
            >
              {isPending && (
                <div className="review-pending-badge">
                  ⏳ На модерации — видно только вам
                </div>
              )}

              <header className="review-header">
                <div className="review-author">
                  <span className="review-avatar">{initial}</span>
                  <div className="review-author-info">
                    {authorId ? (
                      <Link
                        to={`/user/${authorId}`}
                        className="review-nickname review-nickname-link"
                        title="Открыть профиль"
                      >
                        {nickname}
                        {author.isAdmin && (
                          <span className="admin-badge" title="Администратор">👑</span>
                        )}
                      </Link>
                    ) : (
                      <span className="review-nickname">
                        {nickname}
                        {author.isAdmin && (
                          <span className="admin-badge">👑</span>
                        )}
                      </span>
                    )}
                    {review.createdAt && (
                      <span className="review-date">
                        {formatDate(review.createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                {badgeScore != null && (
                  <div
                    className="review-rating-badge"
                    style={{ color: getScoreColor(badgeScore) }}
                    title="Комбинированная оценка автора"
                  >
                    <span className="review-rating-star">★</span>
                    <span className="review-rating-value">{badgeScore}</span>
                  </div>
                )}
              </header>

              <h4 className="review-title">{review.title}</h4>
              <div className="review-text">{review.text}</div>

              {/* === Сводка оценки в стиле профиля === */}
              {hasRating && (
                <RatingCriteriaSummary rating={rating} />
              )}

              <footer className="review-actions">
                {hasRating && (
                  <button
                    className="details-toggle-btn"
                    onClick={() => toggleExpand(review._id)}
                  >
                    {expanded[review._id]
                      ? '▲ Скрыть детали'
                      : '▼ Детали оценки'}
                  </button>
                )}

                <button
                  className="like-btn"
                  onClick={() => onLikeReview(review._id)}
                  title="Полезная рецензия"
                >
                  ❤️ <span>{review.likes?.length || 0}</span>
                </button>
              </footer>

              {expanded[review._id] &&
                hasRating && (
                  <RatingDetailsBlock rating={rating} />
                )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default ReviewsSection;
