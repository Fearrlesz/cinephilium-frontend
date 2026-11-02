import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { getPosterUrl, handleImgError } from '../../utils/posterUrl';
import './ProfileGalleries.css';

const PAGE_SIZE = 12;

function useGallery(endpoint, { enabled = true, removable = false } = {}) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled || !endpoint) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    api.get(endpoint, { params: { page, limit: PAGE_SIZE } })
      .then(response => {
        if (cancelled) return;
        setItems(response.data?.items || []);
        setPagination(response.data?.pagination || null);
        setHidden(false);
      })
      .catch(err => {
        if (cancelled) return;
        if (err.response?.status === 404) {
          // B6/B7: скрытый профиль отдаёт 404 на личные разделы. Секции не показываем.
          setHidden(true);
          setItems([]);
          setPagination(null);
        } else {
          setError(err.response?.data?.error || 'Не удалось загрузить список');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [endpoint, enabled, page]);

  const removeItem = useCallback(async item => {
    if (!removable || !item?._id) return false;

    const previousItems = items;
    const previousPagination = pagination;
    const wasLastOnPage = items.length === 1 && page > 1;

    setItems(current => current.filter(entry => entry._id !== item._id));
    setPagination(current => {
      if (!current) return current;
      const total = Math.max(0, current.total - 1);
      return {
        ...current,
        total,
        pages: Math.max(1, Math.ceil(total / (current.limit || PAGE_SIZE)))
      };
    });
    setError('');

    try {
      await api.delete(`/watchlist/${item._id}`);
      if (wasLastOnPage) setPage(current => Math.max(1, current - 1));
      return true;
    } catch (err) {
      setItems(previousItems);
      setPagination(previousPagination);
      setError(err.response?.data?.error || 'Не удалось убрать фильм из списка');
      return false;
    }
  }, [items, pagination, page, removable]);

  return {
    items,
    pagination,
    page,
    setPage,
    loading,
    error,
    hidden,
    removeItem
  };
}

function filmFromItem(item) {
  const film = item?.filmId && typeof item.filmId === 'object'
    ? item.filmId
    : item?.film;
  if (!film || typeof film !== 'object') return null;
  return film;
}

function PosterGallerySection({
  title,
  items,
  count,
  loading,
  error,
  emptyText,
  pagination,
  page,
  onPageChange,
  removable = false,
  onRemove
}) {
  const pages = Number(pagination?.pages) || 1;
  const showEmpty = !loading && !error && items.length === 0;

  return (
    <section className="pg-section" aria-label={title}>
      <div className="pg-head">
        <h2 className="h-section pg-title">{title}</h2>
        <span className="pg-count">{count}</span>
      </div>

      {loading && items.length === 0 && (
        <p className="pg-loading">Загрузка…</p>
      )}

      {error && !loading && (
        <p className="pg-error" role="alert">{error}</p>
      )}

      {showEmpty && (
        <div className="pg-empty">
          <p className="pg-empty-text">{emptyText}</p>
          <Link to="/" className="pg-empty-cta">Найти фильмы</Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="pg-grid">
          {items.map(item => {
            const film = filmFromItem(item);
            if (!film) return null;

            const filmId = film._id || film.id;
            const filmTitle = film.title || 'Фильм';
            const year = film.year;
            const poster = getPosterUrl(film.poster || film.posterUrl);

            return (
              <div className="pg-cell" key={item._id || filmId}>
                <Link className="pg-link" to={`/film/${filmId}`} title={filmTitle}>
                  <img
                    className="pg-poster"
                    src={poster}
                    alt={filmTitle}
                    loading="lazy"
                    onError={handleImgError}
                  />
                  <span className="pg-overlay" aria-hidden="true">
                    <span className="pg-overlay-title">{filmTitle}</span>
                    {year && <span className="pg-overlay-year">{year}</span>}
                  </span>
                  <span className="pg-mobile-title">
                    {filmTitle}
                    {year && <span className="pg-mobile-year">{year}</span>}
                  </span>
                </Link>

                {removable && (
                  <button
                    type="button"
                    className="pg-remove"
                    onClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRemove?.(item);
                    }}
                    aria-label={`Убрать «${filmTitle}» из списка «Хочу посмотреть»`}
                    title="Убрать из списка"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="pg-pagination">
          <button
            type="button" className="pg-page-btn"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Назад
          </button>
          <span className="pg-page-label">{page} / {pages}</span>
          <button
            type="button" className="pg-page-btn"
            disabled={page >= pages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Вперёд
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * F5+F6: две секции-галереи в профиле.
 *
 * DECISION: F5+F6/6A — секции стоят сразу под шапкой профиля, над старыми
 * блоками; вкладки не трогаем, это F8.
 * DECISION: F5+F6/7A — плотная сетка 6/5/4/3/2 по брейкпоинтам; на десктопе
 * названия только в hover-оверлее, на мобиле — под постером.
 * DECISION: F5+F6/8A — пустое состояние с текстом и CTA «Найти фильмы».
 * DECISION: F5+F6/9A — крестик удаления watchlist только в своём профиле,
 * на hover в десктопе и всегда на мобиле; удаление оптимистичное.
 * DECISION: F5+F6/10A — на мобиле название под постером всегда.
 * DECISION: F5+F6/11A — hover-оверлей снизу, градиент void → transparent,
 * mono 11px ink.
 * Источники: свой профиль — GET /users/me/likes и GET /watchlist/user;
 * чужой — GET /users/:id/likes и GET /users/:id/watchlist.
 */
export default function ProfileGalleries({
  userId,
  isOwnProfile,
  counters,
  hidden,
  onWatchlistRemoved
}) {
  const likesEndpoint = isOwnProfile ? '/users/me/likes' : `/users/${userId}/likes`;
  const watchlistEndpoint = isOwnProfile ? '/watchlist/user' : `/users/${userId}/watchlist`;
  const enabled = !hidden && Boolean(userId);

  const likes = useGallery(likesEndpoint, { enabled });
  const watchlist = useGallery(watchlistEndpoint, {
    enabled,
    removable: isOwnProfile
  });

  const [removedWatchlist, setRemovedWatchlist] = useState(0);

  useEffect(() => {
    setRemovedWatchlist(0);
  }, [counters?.watchlist]);

  if (hidden || likes.hidden || watchlist.hidden) return null;

  const likesCount = counters?.filmLikes ?? likes.pagination?.total ?? 0;
  const watchlistCount = counters?.watchlist != null
    ? Math.max(0, counters.watchlist - removedWatchlist)
    : (watchlist.pagination?.total ?? 0);

  const handleRemoveWatchlist = async item => {
    setRemovedWatchlist(value => value + 1);
    const removed = await watchlist.removeItem(item);
    if (removed) {
      onWatchlistRemoved?.();
    } else {
      setRemovedWatchlist(value => Math.max(0, value - 1));
    }
  };

  const likesEmpty = isOwnProfile
    ? 'Вы пока ничего не лайкнули'
    : 'Пользователь пока ничего не лайкнул';
  const watchlistEmpty = isOwnProfile
    ? 'Вы пока ничего не добавили в «Хочу посмотреть»'
    : 'Пользователь пока ничего не добавил в «Хочу посмотреть»';

  return (
    <div className="profile-galleries">
      <PosterGallerySection
        title="Понравившиеся"
        items={likes.items}
        count={likesCount}
        loading={likes.loading}
        error={likes.error}
        emptyText={likesEmpty}
        pagination={likes.pagination}
        page={likes.page}
        onPageChange={likes.setPage}
      />

      <PosterGallerySection
        title="Хочу посмотреть"
        items={watchlist.items}
        count={watchlistCount}
        loading={watchlist.loading}
        error={watchlist.error}
        emptyText={watchlistEmpty}
        pagination={watchlist.pagination}
        page={watchlist.page}
        onPageChange={watchlist.setPage}
        removable={isOwnProfile}
        onRemove={handleRemoveWatchlist}
      />
    </div>
  );
}
