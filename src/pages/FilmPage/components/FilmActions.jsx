import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../../api/client';
import WatchAction from './WatchAction';
import './FilmActions.css';

const ERROR_TIMEOUT = 4000;

async function findWatchlistItemId(filmId) {
  let page = 1;
  for (;;) {
    const response = await api.get('/watchlist/user', { params: { page, limit: 100 } });
    const items = response.data?.items || [];
    const found = items.find(item => {
      const id = item?.filmId?._id || item?.filmId || item?.film?._id;
      return String(id) === String(filmId);
    });
    if (found) return found._id;

    const pages = Number(response.data?.pagination?.pages) || 1;
    if (page >= pages) return null;
    page += 1;
  }
}

/**
 * F5+F6: два независимых действия на странице фильма.
 *
 * DECISION: F5+F6/1B — в FilmPage нет title-actions, поэтому блок добавлен
 * отдельным компонентом под RatingSection, рядом с панелью оценок.
 * DECISION: F5+F6/2A — «Просмотрено» оставлена видимой, но disabled с
 * title «Скоро»: это F4, функционально не подключаем.
 * DECISION: F5+F6/3A — ошибки inline под действиями, без новой toast-системы.
 * DECISION: F5+F6/4B — неавторизованный клик ведёт на /login; кнопки видны.
 * DECISION: F5+F6/5A — inWatchlist не приходит в GET /films/:id, поэтому для
 * авторизованного делаем GET /watchlist/check/:filmId при монтировании.
 * DECISION: F5+F6/7A — лайк идёт POST/DELETE /films/:id/like по `liked`,
 * а не одним toggle: B7 разделяет намерение на два идемпотентных запроса.
 * DECISION: F5+F6/9A — watchlist удаляется по `_id` записи, а не по filmId:
 * DELETE /watchlist/:id ищет WatchlistItem.findById. Для страницы фильма
 * находим запись через /watchlist/user (страницами, до 100 на страницу).
 */
export default function FilmActions({ film, currentUser, onRequireAuth }) {
  const [liked, setLiked] = useState(Boolean(film?.liked));
  const [likesCount, setLikesCount] = useState(Number(film?.likesCount) || 0);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isWatchlistSaving, setIsWatchlistSaving] = useState(false);
  const [error, setError] = useState('');
  const errorTimer = useRef(null);

  useEffect(() => {
    setLiked(Boolean(film?.liked));
    setLikesCount(Number(film?.likesCount) || 0);
  }, [film?._id, film?.liked, film?.likesCount]);

  useEffect(() => {
    let cancelled = false;

    if (!currentUser || !film?._id) {
      setInWatchlist(false);
      return undefined;
    }

    api.get(`/watchlist/check/${film._id}`)
      .then(response => {
        if (!cancelled) setInWatchlist(Boolean(response.data?.inWatchlist));
      })
      .catch(() => {
        if (!cancelled) setInWatchlist(false);
      });

    return () => { cancelled = true; };
  }, [currentUser, film?._id]);

  useEffect(() => {
    if (!error) return undefined;
    errorTimer.current = setTimeout(() => setError(''), ERROR_TIMEOUT);
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, [error]);

  const toggleLike = useCallback(async () => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (isLiking) return;

    const previousLiked = liked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;

    setLiked(nextLiked);
    setLikesCount(Math.max(0, previousCount + (nextLiked ? 1 : -1)));
    setError('');
    setIsLiking(true);

    try {
      const response = nextLiked
        ? await api.post(`/films/${film._id}/like`)
        : await api.delete(`/films/${film._id}/like`);
      setLiked(Boolean(response.data?.liked));
      setLikesCount(Number(response.data?.likesCount) || 0);
    } catch (err) {
      setLiked(previousLiked);
      setLikesCount(previousCount);
      setError(err.response?.data?.error || 'Не удалось изменить сердечко');
    } finally {
      setIsLiking(false);
    }
  }, [currentUser, film?._id, isLiking, liked, likesCount, onRequireAuth]);

  const toggleWatchlist = useCallback(async () => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    if (isWatchlistSaving) return;

    const previous = inWatchlist;
    const next = !previous;

    setInWatchlist(next);
    setError('');
    setIsWatchlistSaving(true);

    try {
      if (next) {
        const response = await api.post('/watchlist', { filmId: film._id });
        setInWatchlist(Boolean(response.data?.inWatchlist));
      } else {
        const itemId = await findWatchlistItemId(film._id);
        if (!itemId) {
          setInWatchlist(false);
        } else {
          const response = await api.delete(`/watchlist/${itemId}`);
          setInWatchlist(Boolean(response.data?.inWatchlist));
        }
      }
    } catch (err) {
      setInWatchlist(previous);
      setError(err.response?.data?.error || 'Не удалось изменить список «Хочу посмотреть»');
    } finally {
      setIsWatchlistSaving(false);
    }
  }, [currentUser, film?._id, inWatchlist, isWatchlistSaving, onRequireAuth]);

  const authHint = !currentUser ? 'Войдите, чтобы сохранить фильм' : undefined;

  return (
    <div className="film-actions">
      <div className="film-actions-row">
        <button
          type="button"
          className={`film-action ${liked ? 'is-on' : ''}`}
          onClick={toggleLike}
          disabled={isLiking}
          title={authHint || (liked ? 'Убрать из понравившихся' : 'Нравится')}
          aria-pressed={liked}
        >
          <svg className="film-action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 20.5 4.7 13.3a4.8 4.8 0 0 1 0-6.8 4.8 4.8 0 0 1 6.8 0l.5.5.5-.5a4.8 4.8 0 0 1 6.8 0 4.8 4.8 0 0 1 0 6.8Z"
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span>Нравится</span>
          <span className="film-action-count">{likesCount}</span>
        </button>

        <button
          type="button"
          className={`film-action ${inWatchlist ? 'is-on' : ''}`}
          onClick={toggleWatchlist}
          disabled={isWatchlistSaving}
          title={authHint || (inWatchlist ? 'Убрать из списка' : 'Хочу посмотреть')}
          aria-pressed={inWatchlist}
        >
          <svg className="film-action-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 4.5h12v16l-6-4.2-6 4.2Z"
              fill={inWatchlist ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span>{inWatchlist ? 'В списке' : 'Хочу посмотреть'}</span>
        </button>

        <WatchAction
          film={film}
          currentUser={currentUser}
          onRequireAuth={onRequireAuth}
        />
      </div>

      {error && <p className="film-actions-error" role="alert">{error}</p>}
    </div>
  );
}
