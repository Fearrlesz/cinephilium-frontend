import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CRITERIA_CONFIG, GENRE_LABELS, PRESET_WEIGHTS } from '../../../../utils/constants';
import { formatDate } from '../../../../utils/ratingUtils';
import CriteriaModal from '../CriteriaModal/CriteriaModal';
import './ReviewsSection.css';

const MAX_TITLE = 100;
// DECISION: F3/max — максимум текста рецензии 15000 везде, как в
// Review.text и POST /api/reviews; форма раньше резала на 5000.
const MAX_TEXT = 15000;
// F3/min: порог не менялся — он уже 350 на бэкенде. По решению заказчика
// дублируем его в форме, чтобы не гонять заведомо короткий текст на сервер.
const MIN_TEXT = 350;

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

/**
 * F3: рецензии — гейтинг по полной оценке и спойлер.
 *
 * DECISION: F3/1A — без полной оценки вместо кнопки «Написать рецензию»
 * показываем inline-гейт с CTA «Оценить подробно». Неавторизованному —
 * «Войдите, чтобы написать рецензию» + ссылка на /login.
 * DECISION: F3/2A — CTA открывает CriteriaModal. RatingSection (F1) не
 * трогаем, поэтому в ReviewsSection живёт второй экземпляр того же
 * CriteriaModal; после сохранения onRatingSaved обновляет film.userRating.
 * DECISION: F3/3A — 403 FULL_RATING_REQUIRED_FOR_REVIEW ловим по errorCode:
 * inline-сообщение над формой, введённый текст остаётся в state.
 * DECISION: F3/4A — у спойлерной рецензии скрываем только тело. Заголовок,
 * автор, дата, оценка и лайки остаются видимыми.
 * DECISION: F3/5B — плашка спойлера работает как toggle: показать/скрыть,
 * состояние локальное и не персистится.
 * DECISION: F3/6A — счётчик символов уже есть в форме, оставляем его.
 * DECISION: F3/7 — ratingId больше не отправляется: по B4 сервер сам берёт
 * Rating пользователя. Убран из тела POST /api/reviews.
 * DECISION: F3/min — минимум 350 не менялся; добавлена только клиентская
 * проверка того же порога, чтобы не терять короткий текст на 400 от сервера.
 */
function ReviewsSection({
  reviews,
  currentUser,
  film,
  userRating,
  onAddReview,
  onLikeReview,
  onRatingSaved,
  showNotification
}) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ title: '', text: '', isSpoiler: false });
  const [reviewError, setReviewError] = useState('');
  const [fullRatingRequired, setFullRatingRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [expandedText, setExpandedText] = useState({});
  const [expandedDetails, setExpandedDetails] = useState({});
  const [expandedSpoilers, setExpandedSpoilers] = useState({});

  const filmRating = film?.userRating || null;
  // F3: full важнее vibe. Если film.userRating ещё не перезагрузился после
  // CriteriaModal, берём свежий userRating из состояния страницы.
  const effectiveRating =
    [userRating, filmRating].find(item => item?.completeness === 'full')
    || filmRating
    || userRating;
  const hasFullRating = effectiveRating?.completeness === 'full';

  // После полной оценки подсказка о 403 больше не нужна. Зависим от объекта
  // оценки: он меняется и после сохранения в RatingSection, и после нашего CTA.
  useEffect(() => {
    if (hasFullRating) setFullRatingRequired(false);
  }, [effectiveRating, hasFullRating]);

  const textLength = newReview.text.trim().length;
  const canPublish =
    newReview.title.trim().length > 0 && textLength >= MIN_TEXT;

  const clearForm = () => {
    setNewReview({ title: '', text: '', isSpoiler: false });
    setReviewError('');
    setFullRatingRequired(false);
    setShowReviewForm(false);
  };

  const handleCancel = () => clearForm();

  const handleToggleForm = () => {
    if (showReviewForm) {
      handleCancel();
      return;
    }
    setReviewError('');
    setFullRatingRequired(false);
    setShowReviewForm(true);
  };

  const handleAddReview = async () => {
    if (!canPublish || isSubmitting) return;

    setReviewError('');
    setIsSubmitting(true);

    try {
      const result = await onAddReview(
        newReview.title.trim(),
        newReview.text.trim(),
        newReview.isSpoiler
      );

      if (result?.ok !== true) {
        if (result?.code === 'FULL_RATING_REQUIRED_FOR_REVIEW') {
          setFullRatingRequired(true);
        } else {
          setReviewError(result?.message || 'Не удалось добавить рецензию');
        }
        // F3/3A: текст и чекбокс остаются, форма не закрывается.
        return;
      }

      clearForm();
    } catch (err) {
      setReviewError('Не удалось добавить рецензию');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingSaved = rating => {
    setFullRatingRequired(false);
    onRatingSaved?.(rating);
  };

  const openFullRating = () => setRatingModalOpen(true);

  const toggleText = id =>
    setExpandedText(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleDetails = id =>
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleSpoiler = id =>
    setExpandedSpoilers(prev => ({ ...prev, [id]: !prev[id] }));

  const loginGate = !currentUser ? (
    <div className="rev-gate rev-gate-login">
      <p className="rev-gate-text">
        <Link to="/login">Войдите</Link>, чтобы написать рецензию.
      </p>
    </div>
  ) : null;

  const fullRatingGate = currentUser && !hasFullRating ? (
    <div className="rev-gate">
      <p className="rev-gate-text">Рецензия доступна после полной оценки — 15 критериев</p>
      <button type="button" className="btn-primary rev-gate-cta" onClick={openFullRating}>
        Оценить подробно
      </button>
    </div>
  ) : null;

  const fullRatingNotice = currentUser && hasFullRating && fullRatingRequired && showReviewForm ? (
    <div className="rev-gate rev-gate-inline" role="alert">
      <p className="rev-gate-text">Рецензия доступна после полной оценки — 15 критериев</p>
      <button type="button" className="btn-primary rev-gate-cta" onClick={openFullRating}>
        Оценить подробно
      </button>
    </div>
  ) : null;

  return (
    <section className="film-reviews">
      <div className="sec-head">
        <h2 className="sec-title">
          Рецензии <span className="sec-count">{reviews.length}</span>
        </h2>
        {currentUser && hasFullRating && (
          <button
            type="button" className="link-btn" onClick={handleToggleForm}
          >
            {showReviewForm ? 'Отменить' : 'Написать рецензию'}
          </button>
        )}
      </div>

      {loginGate}
      {fullRatingGate}
      {fullRatingNotice}

      {currentUser && hasFullRating && showReviewForm && (
        <>
          {reviewError && <p className="review-error" role="alert">{reviewError}</p>}

          <div className="review-form">
            <div className="review-form-head">
              <span className="lbl">Новая рецензия</span>
            </div>

            <input
              type="text" className="review-input" placeholder="Заголовок рецензии" value={newReview.title}
              maxLength={MAX_TITLE}
              onChange={event => {
                setNewReview(prev => ({ ...prev, title: event.target.value }));
                setReviewError('');
              }}
            />

            <div className="review-textarea-wrap">
              <textarea
                className="review-textarea" placeholder="Поделитесь впечатлениями о фильме…" value={newReview.text}
                maxLength={MAX_TEXT}
                aria-describedby="review-min-hint"
                onChange={event => {
                  setNewReview(prev => ({ ...prev, text: event.target.value }));
                  setReviewError('');
                }}
              />
              <div className="review-meta">
                <span
                  className={`review-min ${textLength < MIN_TEXT ? 'is-short' : ''}`}
                  id="review-min-hint"
                >
                  Минимум 350 символов
                </span>
                <span className="char-counter">{newReview.text.length} / {MAX_TEXT}</span>
              </div>
            </div>

            <label className="review-spoiler" htmlFor="review-spoiler">
              <input
                id="review-spoiler" type="checkbox" checked={newReview.isSpoiler}
                onChange={event => {
                  setNewReview(prev => ({ ...prev, isSpoiler: event.target.checked }));
                  setReviewError('');
                }}
              />
              <span>Содержит спойлеры</span>
            </label>

            <div className="review-form-foot">
              <button type="button" className="btn-ghost" onClick={handleCancel}>
                Отмена
              </button>
              <button
                type="button" className="btn-primary" onClick={handleAddReview}
                disabled={!canPublish || isSubmitting}
              >
                Опубликовать
              </button>
            </div>
          </div>
        </>
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
          const isSpoiler = review.isSpoiler === true;
          const isSpoilerOpen = Boolean(expandedSpoilers[review._id]);

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

              {isSpoiler && (
                <button
                  type="button" className="rev-spoiler"
                  onClick={() => toggleSpoiler(review._id)}
                  aria-expanded={isSpoilerOpen}
                  aria-label={isSpoilerOpen ? 'Скрыть спойлер' : 'Показать спойлер'}
                >
                  <span className="rev-spoiler-label">Спойлер</span>
                  <span className="rev-spoiler-action">
                    {isSpoilerOpen ? 'Скрыть' : 'Показать'}
                  </span>
                </button>
              )}

              {(!isSpoiler || isSpoilerOpen) && (
                <>
                  <p className={`rev-body ${isTextOpen ? 'is-open' : ''}`}>{review.text}</p>

                  {review.text && review.text.length > 260 && (
                    <button type="button" className="rev-more" onClick={() => toggleText(review._id)}>
                      Показать полностью {isTextOpen ? '−' : '+'}
                    </button>
                  )}
                </>
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

      {ratingModalOpen && (
        <CriteriaModal
          film={film}
          userRating={effectiveRating}
          onClose={() => setRatingModalOpen(false)}
          onSaved={handleRatingSaved}
          showNotification={showNotification}
        />
      )}
    </section>
  );
}

export default ReviewsSection;
