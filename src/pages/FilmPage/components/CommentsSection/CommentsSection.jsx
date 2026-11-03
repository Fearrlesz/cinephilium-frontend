import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../../api/client';
import { formatDate } from '../../../../utils/ratingUtils';
import './CommentsSection.css';

// F7: комментарии к рецензии — отдельный слой обсуждения текста. Оценка
// фильма здесь не нужна: B8 разрешает отвечать автору рецензии без Rating.
const REVIEW_PAGE_SIZE = 5;
const MAX_COMMENT = 1000;

function likeCount(comment) {
  if (typeof comment.likesCount === 'number') return comment.likesCount;
  return Array.isArray(comment.likes) ? comment.likes.length : 0;
}

function setLikeCount(items, commentId, likes) {
  return items.map(item => {
    let next = item;
    if (String(item._id) === String(commentId)) {
      next = {
        ...item,
        likesCount: typeof likes === 'number' ? likes : likeCount(item) + 1
      };
    }
    if (Array.isArray(next.replies) && next.replies.length > 0) {
      next = { ...next, replies: setLikeCount(next.replies, commentId, likes) };
    }
    return next;
  });
}

function ReviewCommentItem({ comment, currentUser, onLike, onReply, isReply = false }) {
  const author = comment.userId || {};
  const nickname = author.nickname || 'Пользователь';
  const initial = nickname.charAt(0).toUpperCase();
  const isPending = comment.status === 'pending';
  const likes = likeCount(comment);

  return (
    <li className={`citem ${isReply ? 'citem--reply' : ''}`} id={comment._id}>
      <span className="c-av" aria-hidden="true">{initial}</span>
      <div className="cmain">
        <div className="cname">
          {nickname}
          {author.isAdmin && <span className="badge-admin">админ</span>}
        </div>
        <div className="cmeta">
          <span>@{nickname}</span>
          {comment.createdAt && (
            <>
              <span className="dot">·</span>
              <span className="c-time">{formatDate(comment.createdAt)}</span>
            </>
          )}
        </div>

        {isPending && (
          <p className="c-pending">На модерации — видно только вам</p>
        )}

        <p className="ctext">{comment.text}</p>

        <div className="c-actions">
          {currentUser ? (
            <button
              className="c-like" type="button" onClick={() => onLike(comment._id)}
              aria-label="Полезный комментарий"
            >
              Полезно <span>{likes}</span>
            </button>
          ) : (
            <span className="c-like">Полезно <span>{likes}</span></span>
          )}

          {!isReply && currentUser && comment.status === 'approved' && (
            <button className="c-like" type="button" onClick={() => onReply(comment)}>
              Ответить
            </button>
          )}
        </div>

        {Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <ul className="creplies">
            {comment.replies.map(reply => (
              <ReviewCommentItem
                key={reply._id}
                comment={reply}
                currentUser={currentUser}
                onLike={onLike}
                onReply={onReply}
                isReply
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

/**
 * F2: гейтинг комментариев к фильму.
 *
 * DECISION: F2/1A — без оценки вместо формы показываем inline-сообщение
 * «Чтобы комментировать, оцените фильм» и CTA «Оценить». Disabled-форма
 * выглядела бы сломанной, модалка по клику — неожиданной.
 * DECISION: F2/2A — CTA «Оценить» скроллит к RatingSection на этой же
 * странице (колбэк onRate из FilmPage), без новой мини-модалки и без
 * дублирования vibe-трека.
 * DECISION: F2/3B — 403 RATING_REQUIRED_FOR_COMMENT показываем inline над
 * формой, форму не прячем, введённый текст не теряем.
 * DECISION: F2/4A — неавторизованному — «Войдите, чтобы комментировать»
 * и ссылка на /login.
 * DECISION: F2/5A — источник состояния гейта — film.userRating. После
 * сохранения vibe RatingSection вызывает reloadFilm({ silent: true }),
 * film.userRating обновляется, и форма разблокируется без перезагрузки
 * страницы. F1 (RatingSection/useVibeRating/useRatingForm) не менялся.
 * DECISION: F2/6A — текст при 403 остаётся в state и очищается только
 * успешной отправкой.
 * DECISION: F2/7 — формы ответа на комментарий в F2 не было. F7 добавляет
 * ответы только в режиме рецензии, чтобы не менять поведение фильма.
 *
 * DECISION: B3/2A — weight: 0 не блокирует комментирование: гейт проверяет
 * наличие Rating (vibe или full), вес не учитывается.
 * DECISION: B3/3B — админ не exempt: правило единое, роль не проверяем.
 * DECISION: B3/4A+4C — userRating — подсказка для UI, 403 — авторитетный
 * гейт; бэкенд не доверяет клиенту и сам проверяет Rating в POST /comments.
 * DECISION: B3/5A — последовательность POST /ratings → POST /comments;
 * на 403 честно показываем гейт, без ретраев и без RATING_NOT_READY.
 * DECISION: B3 — лайк комментария не гейтится: «Полезно» работает без оценки.
 *
 * F7: один компонент и два режима.
 * DECISION: F7/1 — inline-блок под каждой рецензией. Отдельной ReviewPage в
 * коде нет, поэтому новый маршрут не создаём.
 * DECISION: F7/2 — в режиме рецензии блок свёрнут до кнопки «N комментариев»
 * и загружает список только после клика; в режиме фильма поведение F2
 * остаётся прежним (родитель передаёт comments и колбэки).
 * DECISION: F7/3 — GET /api/comments?targetType=review&targetId=... с
 * пагинацией; POST /api/comments с targetType/targetId/parentId. Старый
 * GET /api/comments/:filmId и режим film не трогаем.
 * DECISION: F7/4 — ответы только один уровень: форма отвечает на корневой
 * комментарий, вложенные ответы не получают кнопку «Ответить».
 * DECISION: F7/5 — pending показывает только сервер (approved для чужих,
 * плюс свои pending и всё для админа); фронт ничего не фильтрует.
 * DECISION: F7/6 — комментарий к рецензии не гейтится userRating: это
 * обсуждение текста, а не фильма (B8).
 */
function CommentsSection({
  comments = [],
  currentUser,
  film,
  onAddComment,
  onLikeComment,
  onRate,
  targetType = 'film',
  targetId = null
}) {
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [rateRequired, setRateRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reviewExpanded, setReviewExpanded] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewPagination, setReviewPagination] = useState(null);
  const [reviewCount, setReviewCount] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewThreadError, setReviewThreadError] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const isReviewMode = targetType === 'review' && Boolean(targetId);
  const initial = (currentUser?.nickname || '?').charAt(0).toUpperCase();

  // F2/5A: читаем именно film.userRating — после vibe он обновляется
  // silent-перезагрузкой фильма в RatingSection.
  const userRating = film?.userRating || null;
  const canComment = Boolean(userRating);

  // Если оценка появилась (vibe/full), 403-подсказка больше не нужна.
  useEffect(() => {
    if (userRating) setRateRequired(false);
  }, [userRating]);

  // F7: счётчик нужен до раскрытия, поэтому первый запрос берёт limit=1.
  // Отдельного commentsCount у рецензии нет; pagination.total — авторитетный
  // источник, уже отфильтрованный сервером по видимости.
  useEffect(() => {
    if (!isReviewMode) return undefined;

    let active = true;
    setReviewCount(null);
    api.get('/comments', {
      params: { targetType, targetId, page: 1, limit: 1 }
    }).then(response => {
      if (!active) return;
      const total = response.data?.pagination?.total;
      setReviewCount(typeof total === 'number' ? total : (response.data?.items?.length || 0));
    }).catch(() => {
      if (active) setReviewCount(0);
    });

    return () => { active = false; };
  }, [isReviewMode, targetId, targetType]);

  const loadReviewPage = async (page, { replace = false, limit = REVIEW_PAGE_SIZE } = {}) => {
    setReviewLoading(true);
    setReviewThreadError('');
    try {
      const response = await api.get('/comments', {
        params: { targetType, targetId, page, limit }
      });
      const data = response.data || {};
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setReviewItems(prev => (replace ? nextItems : [...prev, ...nextItems]));
      setReviewPagination(data.pagination || null);
      if (typeof data.pagination?.total === 'number') setReviewCount(data.pagination.total);
    } catch (err) {
      setReviewThreadError(err.response?.data?.error || 'Не удалось загрузить комментарии');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleToggleReview = () => {
    if (reviewExpanded) {
      setReviewExpanded(false);
      return;
    }
    setReviewExpanded(true);
    if (reviewItems.length === 0 && !reviewLoading) {
      loadReviewPage(1, { replace: true });
    }
  };

  const handleLoadMore = () => {
    if (reviewLoading) return;
    const nextPage = (reviewPagination?.page || 1) + 1;
    loadReviewPage(nextPage);
  };

  const handleReviewLike = async commentId => {
    if (!currentUser) return;
    try {
      const response = await api.post(`/comments/${commentId}/like`);
      setReviewItems(prev => setLikeCount(prev, commentId, response.data?.likes));
    } catch (err) {
      setReviewThreadError(err.response?.data?.error || 'Не удалось поставить лайк');
    }
  };

  const handleReviewSubmit = async event => {
    event.preventDefault();
    if (reviewSubmitting) return;

    const trimmed = reviewText.trim();
    if (!trimmed) {
      setReviewError('Введите текст комментария');
      return;
    }
    if (trimmed.length < 2) {
      setReviewError('Комментарий должен содержать минимум 2 символа');
      return;
    }
    if (trimmed.length > MAX_COMMENT) {
      setReviewError(`Комментарий не длиннее ${MAX_COMMENT} символов`);
      return;
    }

    setReviewError('');
    setReviewSubmitting(true);

    try {
      const payload = { targetType: 'review', targetId, text: trimmed };
      if (replyTo?._id) payload.parentId = replyTo._id;

      await api.post('/comments', payload);
      setReviewText('');
      setReplyTo(null);

      // Перезагружаем столько же корневых комментариев, сколько уже открыто,
      // чтобы новый комментарий не сдвинул загруженные страницы.
      const limit = Math.min(100, Math.max(REVIEW_PAGE_SIZE, reviewItems.length + 1));
      await loadReviewPage(1, { replace: true, limit });
    } catch (err) {
      setReviewError(err.response?.data?.error || 'Не удалось добавить комментарий');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // F7: это не комментарии к фильму, а ответы на текст рецензии.
  const countLabel = reviewCount === null
    ? 'Ответы на рецензию'
    : `Ответы на рецензию · ${reviewCount}`;

  const reviewThread = isReviewMode ? (
    <section className="film-comments film-comments--review">
      {!reviewExpanded ? (
        <button
          type="button"
          className="link-btn c-toggle"
          onClick={handleToggleReview}
          aria-expanded="false"
        >
          {countLabel}
        </button>
      ) : (
        <div className="c-thread">
          <div className="c-thread-head">
            <span className="lbl">{countLabel}</span>
            <button type="button" className="link-btn" onClick={handleToggleReview}>
              Свернуть
            </button>
          </div>

          {reviewThreadError && (
            <p className="c-error" role="alert">{reviewThreadError}</p>
          )}

          {reviewLoading && reviewItems.length === 0 && (
            <p className="c-login">Загрузка ответов…</p>
          )}

          {!reviewLoading && reviewItems.length === 0 && (
            <p className="c-empty">Пока нет ответов на рецензию</p>
          )}

          {!currentUser && (
            <p className="c-login">
              <Link to="/login">Войдите</Link>, чтобы ответить на рецензию.
            </p>
          )}

          {reviewItems.length > 0 && (
            <ul className="clist">
              {reviewItems.map(comment => (
                <ReviewCommentItem
                  key={comment._id}
                  comment={comment}
                  currentUser={currentUser}
                  onLike={handleReviewLike}
                  onReply={setReplyTo}
                />
              ))}
            </ul>
          )}

          {reviewPagination && reviewPagination.page < reviewPagination.pages && (
            <button
              type="button" className="link-btn c-more"
              onClick={handleLoadMore} disabled={reviewLoading}
            >
              {reviewLoading ? 'Загрузка…' : 'Загрузить ещё'}
            </button>
          )}

          {currentUser && (
            <>
              {replyTo && (
                <div className="c-reply-note">
                  <span>Ответ на @{replyTo.userId?.nickname || 'Пользователь'}</span>
                  <button
                    type="button" className="link-btn"
                    onClick={() => setReplyTo(null)}
                  >
                    Отмена
                  </button>
                </div>
              )}

              <form className="cform" onSubmit={handleReviewSubmit}>
                <span className="c-av" aria-hidden="true">{initial}</span>
                <input
                  className="c-input" type="text"
                  placeholder={replyTo ? 'Написать ответ…' : 'Написать ответ на рецензию…'}
                  value={reviewText}
                  maxLength={MAX_COMMENT}
                  onChange={event => {
                    setReviewText(event.target.value);
                    setReviewError('');
                  }}
                  aria-label="Текст ответа на рецензию"
                />
                <button
                  className="c-send" type="submit"
                  disabled={reviewSubmitting || !reviewText.trim()}
                >
                  Отправить
                </button>
              </form>

              {reviewError && <p className="c-error" role="alert">{reviewError}</p>}
            </>
          )}
        </div>
      )}
    </section>
  ) : null;

  const handleAddComment = async () => {
    if (isSubmitting) return;

    const trimmed = commentText.trim();
    if (!trimmed) {
      setCommentError('Введите текст комментария');
      return;
    }
    if (trimmed.length < 2) {
      setCommentError('Комментарий должен содержать минимум 2 символа');
      return;
    }

    setCommentError('');
    setIsSubmitting(true);

    try {
      const result = await onAddComment(trimmed);

      if (result?.ok !== true) {
        if (result?.code === 'RATING_REQUIRED_FOR_COMMENT') {
          // F2/3B: ловим именно errorCode, не текст; текст комментария остаётся.
          setRateRequired(true);
        } else {
          setCommentError(result?.message || 'Не удалось добавить комментарий');
        }
        return;
      }

      // F2/6A: очищаем ввод только после успешной отправки.
      setCommentText('');
      setRateRequired(false);
    } catch (err) {
      setCommentError('Не удалось добавить комментарий');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = event => {
    event.preventDefault();
    handleAddComment();
  };

  const rateGate = (
    <div className="c-gate">
      <p className="c-gate-text">Чтобы комментировать, оцените фильм</p>
      <button className="btn-primary c-gate-cta" type="button" onClick={() => onRate?.()}>
        Оценить
      </button>
    </div>
  );

  if (isReviewMode) return reviewThread;

  return (
    <section className="film-comments">
      <h2 className="sec-title">
        Комментарии <span className="sec-count">{comments.length}</span>
      </h2>

      {currentUser ? (
        <>
          {!canComment && rateGate}

          {canComment && (
            <>
              {rateRequired && (
                <div className="c-gate c-gate-inline" role="alert">
                  <p className="c-gate-text">Чтобы комментировать, оцените фильм</p>
                  <button
                    className="btn-primary c-gate-cta" type="button" onClick={() => onRate?.()}
                  >
                    Оценить
                  </button>
                </div>
              )}

              <form className="cform" onSubmit={handleSubmit}>
                <span className="c-av" aria-hidden="true">{initial}</span>
                <input
                  className="c-input" type="text" placeholder="Написать комментарий…" value={commentText}
                  onChange={event => {
                    setCommentText(event.target.value);
                    setCommentError('');
                  }}
                  aria-label="Текст комментария"
                />
                <button className="c-send" type="submit" disabled={isSubmitting}>
                  Отправить
                </button>
              </form>
            </>
          )}
        </>
      ) : (
        <p className="c-login">
          <Link to="/login">Войдите</Link>, чтобы комментировать.
        </p>
      )}

      {commentError && <p className="c-error" role="alert">{commentError}</p>}

      <ul className="clist">
        {comments.map(comment => {
          const author = comment.userId || {};
          const nickname = author.nickname || 'Пользователь';
          const authorInitial = nickname.charAt(0).toUpperCase();

          return (
            <li className="citem" key={comment._id} id={comment._id}>
              <span className="c-av" aria-hidden="true">{authorInitial}</span>
              <div className="cmain">
                <div className="cname">
                  {nickname}
                  {author.isAdmin && <span className="badge-admin">админ</span>}
                </div>
                <div className="cmeta">
                  <span>@{nickname}</span>
                  {comment.createdAt && (
                    <>
                      <span className="dot">·</span>
                      <span className="c-time">{formatDate(comment.createdAt)}</span>
                    </>
                  )}
                </div>
                <p className="ctext">{comment.text}</p>
                {/* DECISION: B3 — лайк не гейтится оценкой, кнопка доступна всем авторизованным. */}
                <button
                  className="c-like" type="button" onClick={() => onLikeComment(comment._id)}
                >
                  Полезно <span>{comment.likes?.length || 0}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default CommentsSection;
