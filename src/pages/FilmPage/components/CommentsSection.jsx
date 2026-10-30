import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../../utils/ratingUtils';
import './CommentsSection.css';

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
 * DECISION: F2/7 — формы ответа на комментарий в CommentsSection нет,
 * поэтому не добавляем её (это F7).
 *
 * DECISION: B3/2A — weight: 0 не блокирует комментирование: гейт проверяет
 * наличие Rating (vibe или full), вес не учитывается.
 * DECISION: B3/3B — админ не exempt: правило единое, роль не проверяем.
 * DECISION: B3/4A+4C — userRating — подсказка для UI, 403 — авторитетный
 * гейт; бэкенд не доверяет клиенту и сам проверяет Rating в POST /comments.
 * DECISION: B3/5A — последовательность POST /ratings → POST /comments;
 * на 403 честно показываем гейт, без ретраев и без RATING_NOT_READY.
 * DECISION: B3 — лайк комментария не гейтится: «Полезно» работает без оценки.
 */
function CommentsSection({
  comments,
  currentUser,
  film,
  onAddComment,
  onLikeComment,
  onRate
}) {
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [rateRequired, setRateRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initial = (currentUser?.nickname || '?').charAt(0).toUpperCase();

  // F2/5A: читаем именно film.userRating — после vibe он обновляется
  // silent-перезагрузкой фильма в RatingSection.
  const userRating = film?.userRating || null;
  const canComment = Boolean(userRating);

  // Если оценка появилась (vibe/full), 403-подсказка больше не нужна.
  useEffect(() => {
    if (userRating) setRateRequired(false);
  }, [userRating]);

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
