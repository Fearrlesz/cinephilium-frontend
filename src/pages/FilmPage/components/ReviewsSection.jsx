import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CRITERIA_CONFIG, GENRE_LABELS, PRESET_WEIGHTS } from '../../../utils/constants';
import { formatDate } from '../../../utils/ratingUtils';
import './ReviewsSection.css';

const MAX_TITLE = 100;
const MAX_TEXT = 5000;

function getWeightsArray(rating) {
  if (!rating) return [30, 25, 20, 15, 10];

  if (rating.genrePreset && PRESET_WEIGHTS?.[rating.genrePreset]) {
    return PRESET_WEIGHTS[rating.genrePreset];
  }
  if (rating.blockWeights) {
    const w = rating.blockWeights;
    return [
      w.scenario ?? 30,
      w.characters ?? 25,
      w.visual ?? 20,
      w.sound ?? 15,
      w.style ?? 10
    ];
  }
  return [30, 25, 20, 15, 10];
}

function RatingDetailsBlock({ rating }) {
  if (!rating) return null;
  const weights = getWeightsArray(rating);

  return (
    <div className="rev-details">
      {rating.genrePreset && GENRE_LABELS[rating.genrePreset] && (
        <div className="rev-details-genre">
          <span className="lbl">Жанровые веса</span>
          <span>{GENRE_LABELS[rating.genrePreset]}</span>
        </div>
      )}

      <div className="rev-blocks">
        {CRITERIA_CONFIG.map((block, i) => {
          const blockScores = rating.scores?.[block.key];
          if (!blockScores) return null;
          return (
            <div key={block.key} className="rev-block">
              <div className="rev-block-head">
                <span>{block.name}</span>
                <span>{weights[i]}%</span>
              </div>
              <ul>
                {block.criteria.map(crit => (
                  <li key={crit.key}>
                    <span>{crit.name}</span>
                    <b>{blockScores[crit.key] ?? '—'}</b>
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
  const [expandedText, setExpandedText] = useState({});
  const [expandedDetails, setExpandedDetails] = useState({});

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

  const toggleText = id =>
    setExpandedText(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleDetails = id =>
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="film-reviews">
      <div className="sec-head">
        <h2 className="sec-title">
          Рецензии <span className="sec-count">{reviews.length}</span>
        </h2>
        {currentUser && (
          <button
            type="button" className="link-btn" onClick={() => setShowReviewForm(value => !value)}
          >
            {showReviewForm ? 'Отменить' : 'Написать рецензию'}
          </button>
        )}
      </div>

      {showReviewForm && (
        <div className="review-form">
          <div className="review-form-head">
            <span className="lbl">Новая рецензия</span>
            {!userRating && (
              <span className="review-form-hint">Сначала оцените фильм</span>
            )}
          </div>

          <input
            type="text" className="review-input" placeholder="Заголовок рецензии" value={newReview.title}
            maxLength={MAX_TITLE}
            onChange={event => setNewReview({ ...newReview, title: event.target.value })}
          />

          <div className="review-textarea-wrap">
            <textarea
              className="review-textarea" placeholder="Поделитесь впечатлениями о фильме…" value={newReview.text}
              maxLength={MAX_TEXT}
              onChange={event => setNewReview({ ...newReview, text: event.target.value })}
            />
            <span className="char-counter">{newReview.text.length} / {MAX_TEXT}</span>
          </div>

          <div className="review-form-foot">
            <button type="button" className="btn-ghost" onClick={handleCancel}>
              Отмена
            </button>
            <button
              type="button" className="btn-primary" onClick={handleAddReview}
              disabled={!canPublish}
            >
              Опубликовать
            </button>
          </div>
        </div>
      )}

      <div className="rev-list">
        {reviews.length === 0 && (
          <p className="empty-line">Пока нет рецензий. Будьте первым.</p>
        )}

        {reviews.map(review => {
          const author = review.userId || {};
          const nickname = author.nickname || 'Пользователь';
          const initial = nickname.charAt(0).toUpperCase();
          const authorId = author._id;
          const rating = review.ratingId;
          const isPending = review.status === 'pending';
          const isTextOpen = Boolean(expandedText[review._id]);
          const isDetailsOpen = Boolean(expandedDetails[review._id]);

          const badgeScore = typeof rating === 'object'
            ? (rating.combinedScore ?? rating.finalScore ?? rating.technicalScore)
            : null;

          return (
            <article className="rev" key={review._id} id={review._id}>
              {isPending && <p className="rev-pending">На модерации — видно только вам</p>}

              <header className="rev-head">
                <span className="rev-av" aria-hidden="true">{initial}</span>

                <div className="rev-id">
                  {authorId ? (
                    <Link to={`/user/${authorId}`} className="rev-author">
                      {nickname}
                      {author.isAdmin && <span className="badge-admin">админ</span>}
                    </Link>
                  ) : (
                    <span className="rev-author">
                      {nickname}
                      {author.isAdmin && <span className="badge-admin">админ</span>}
                    </span>
                  )}
                  <span className="rev-sub">
                    <span className="rev-handle">@{nickname}</span>
                    {review.createdAt && (
                      <span className="rev-date">{formatDate(review.createdAt)}</span>
                    )}
                  </span>
                </div>

                {badgeScore != null && (
                  <div className="rev-score">
                    {badgeScore}<span>/100</span>
                  </div>
                )}
              </header>

              <p className="rev-key">{review.title}</p>
              <p className={`rev-body ${isTextOpen ? 'is-open' : ''}`}>{review.text}</p>

              {review.text && review.text.length > 260 && (
                <button type="button" className="rev-more" onClick={() => toggleText(review._id)}>
                  Показать полностью {isTextOpen ? '−' : '+'}
                </button>
              )}

              <div className="rev-actions">
                <button
                  type="button" className="rev-action" onClick={() => onLikeReview(review._id)}
                  title="Полезная рецензия"
                >
                  Полезно <span>{review.likes?.length || 0}</span>
                </button>

                {rating && typeof rating === 'object' && (
                  <button
                    type="button" className="rev-action" onClick={() => toggleDetails(review._id)}
                  >
                    {isDetailsOpen ? 'Скрыть детали' : 'Детали оценки'}
                  </button>
                )}
              </div>

              {isDetailsOpen && rating && typeof rating === 'object' && (
                <RatingDetailsBlock rating={rating} />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ReviewsSection;
