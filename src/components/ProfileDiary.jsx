import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getPosterUrl, handleImgError } from '../utils/posterUrl';
import './ProfileDiary.css';

const PAGE_SIZE = 10;
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

function dateParts(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: match[1], month: Number(match[2]), day: match[3] };
}

function monthLabel(value) {
  const parts = dateParts(value);
  if (!parts) return 'Без даты';
  return `${MONTHS[parts.month - 1]} ${parts.year}`;
}

function shortDate(value) {
  const parts = dateParts(value);
  if (!parts) return '';
  return `${parts.day}.${String(parts.month).padStart(2, '0')}.${parts.year}`;
}

function groupByMonth(items) {
  const groups = [];
  const byKey = new Map();

  items.forEach(item => {
    const label = monthLabel(item.watchedAt);
    if (!byKey.has(label)) {
      const group = { label, items: [] };
      byKey.set(label, group);
      groups.push(group);
    }
    byKey.get(label).items.push(item);
  });

  return groups;
}

/**
 * F4: дневник просмотров в профиле.
 *
 * DECISION: F4/5A — записи группируются по месяцу; внутри месяца порядок
 * бэкенда (watchedAt desc), поэтому дополнительная сортировка не нужна.
 * DECISION: F4/6A — «Загрузить ещё», а не бесконечный скролл и не номера
 * страниц: дневник читается сверху вниз, как лента.
 * DECISION: F4/8A — удаление по наведению на десктопе и всегда на мобиле
 * (там нет hover). Это единственное действие на карточке.
 * DECISION: F4/10A — Watch не создаёт Rating/Review автоматически.
 */
export default function ProfileDiary({
  userId,
  isOwnProfile,
  counters,
  hidden,
  onWatchRemoved
}) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isGone, setIsGone] = useState(false);

  const enabled = Boolean(!hidden && (isOwnProfile || userId));
  const endpoint = isOwnProfile
    ? '/watches/me'
    : userId
      ? `/users/${userId}/watches`
      : null;

  useEffect(() => {
    let cancelled = false;

    setItems([]);
    setPagination(null);
    setPage(1);
    setError('');
    setRemoveError('');
    setIsPrivate(false);
    setIsGone(false);

    if (!enabled || !endpoint) {
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    api.get(endpoint, { params: { page: 1, limit: PAGE_SIZE } })
      .then(response => {
        if (cancelled) return;
        setItems(response.data?.items || []);
        setPagination(response.data?.pagination || null);
      })
      .catch(err => {
        if (cancelled) return;
        const status = err.response?.status;
        if (status === 404) {
          setIsGone(true);
        } else if (status === 403) {
          setIsPrivate(true);
        } else {
          setError(err.response?.data?.error || 'Не удалось загрузить дневник');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, endpoint]);

  const total = Number(
    pagination?.total ?? counters?.watches ?? items.length ?? 0
  );
  const hasMore = Boolean(pagination)
    && Number(pagination.pages) > page;

  const loadMore = async () => {
    if (isLoadingMore || isRemoving || !hasMore || !endpoint) return;

    const nextPage = page + 1;
    setIsLoadingMore(true);
    setError('');

    try {
      const response = await api.get(endpoint, {
        params: { page: nextPage, limit: PAGE_SIZE }
      });
      const nextItems = response.data?.items || [];
      setItems(current => [...current, ...nextItems]);
      setPagination(response.data?.pagination || null);
      setPage(nextPage);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось загрузить ещё');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const removeEntry = async entry => {
    if (!isOwnProfile || !entry?._id) return;

    const previousItems = items;
    const previousPagination = pagination;
    const entryId = entry._id;

    setRemoveError('');
    setItems(current => current.filter(item => item._id !== entryId));
    setPagination(current => (
      current
        ? { ...current, total: Math.max(0, Number(current.total || 0) - 1) }
        : current
    ));
    // Не даём нажать «Загрузить ещё», пока удаление и перечитывание страниц
    // не завершились: иначе offset-пагинация пропустит запись. Список при этом
    // остаётся на месте — запись уже убрана оптимистично.
    setIsRemoving(true);

    try {
      await api.delete(`/watches/${entryId}`);

      // После удаления страница сдвигается: без перечитывания «Загрузить ещё»
      // пропустит одну запись. Перечитываем уже открытые страницы.
      if (endpoint) {
        try {
          const loadedPages = Math.max(1, page);
          const responses = await Promise.all(
            Array.from({ length: loadedPages }, (_, index) => (
              api.get(endpoint, { params: { page: index + 1, limit: PAGE_SIZE } })
            ))
          );
          setItems(responses.flatMap(response => response.data?.items || []));
          setPagination(
            responses[responses.length - 1]?.data?.pagination || null
          );
        } catch {
          // Удаление уже прошло; не откатываем его из-за сбоя перечитывания.
        }
      }

      onWatchRemoved?.(entry);
    } catch (err) {
      setItems(previousItems);
      setPagination(previousPagination);
      setRemoveError(
        err.response?.data?.error || 'Не удалось удалить запись'
      );
    } finally {
      setIsRemoving(false);
    }
  };

  if (hidden || isGone) return null;

  const groups = groupByMonth(items);

  return (
    <section className="diary-section" aria-labelledby="profileDiaryTitle">
      <div className="diary-head">
        <h2 className="h-section" id="profileDiaryTitle">Дневник</h2>
        <span className="diary-count">{total}</span>
      </div>

      {removeError && <p className="diary-error" role="alert">{removeError}</p>}

      {isPrivate ? (
        <p className="diary-private">
          Пользователь закрыл свой дневник просмотров
        </p>
      ) : isLoading ? (
        <p className="diary-loading">Загружаем дневник…</p>
      ) : error && items.length === 0 ? (
        <p className="diary-error" role="alert">{error}</p>
      ) : items.length === 0 ? (
        <div className="diary-empty">
          <p>
            {isOwnProfile
              ? 'Вы пока не отметили ни одного просмотра'
              : 'Пользователь пока не отметил ни одного просмотра'}
          </p>
          {isOwnProfile && (
            <Link className="diary-empty-cta" to="/">Найти фильмы</Link>
          )}
        </div>
      ) : (
        <>
          {groups.map(group => (
            <div className="diary-group" key={group.label}>
              <h3 className="diary-month">{group.label}</h3>
              <div className="diary-entries">
                {group.items.map(entry => {
                  const film = entry.filmId && typeof entry.filmId === 'object'
                    ? entry.filmId
                    : (entry.film || {});
                  const filmId = film._id || entry.filmId;
                  const title = film.title || 'Фильм';
                  const poster = getPosterUrl(film.poster || film.posterPath);
                  const ratingId = entry.ratingId?._id || entry.ratingId;
                  const reviewId = entry.reviewId?._id || entry.reviewId;
                  const tags = Array.isArray(entry.tags) ? entry.tags : [];

                  return (
                    <article className="diary-entry" key={entry._id}>
                      <Link
                        className="diary-poster-link"
                        to={`/film/${filmId}`}
                        aria-label={title}
                      >
                        <img
                          className="diary-poster"
                          src={poster}
                          alt=""
                          loading="lazy"
                          onError={handleImgError}
                        />
                      </Link>

                      <div className="diary-body">
                        <div className="diary-title-row">
                          <Link className="diary-title" to={`/film/${filmId}`}>
                            {title}
                          </Link>
                          {film.year && (
                            <span className="diary-year">{film.year}</span>
                          )}
                        </div>

                        <p className="diary-meta">
                          <span>{shortDate(entry.watchedAt)}</span>
                          {entry.isRewatch && (
                            <span className="diary-badge">Пересмотр</span>
                          )}
                        </p>

                        {tags.length > 0 && (
                          <div className="diary-tags">
                            {tags.map(tag => (
                              <span className="diary-tag" key={tag}>{tag}</span>
                            ))}
                          </div>
                        )}

                        {(ratingId || reviewId) && (
                          <div className="diary-links">
                            {ratingId && (
                              <Link
                                className="diary-link"
                                to={`/film/${filmId}`}
                              >
                                Оценка
                              </Link>
                            )}
                            {reviewId && (
                              <Link
                                className="diary-link"
                                to={`/film/${filmId}`}
                              >
                                Рецензия
                              </Link>
                            )}
                          </div>
                        )}
                      </div>

                      {isOwnProfile && (
                        <button
                          type="button"
                          className="diary-remove"
                          onClick={() => removeEntry(entry)}
                          disabled={isRemoving}
                          aria-label={`Удалить просмотр «${title}»`}
                          title="Удалить запись"
                        >
                          ×
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}

          {error && <p className="diary-error" role="alert">{error}</p>}

          {hasMore && !isRemoving && (
            <div className="diary-more">
              <button
                type="button"
                className="diary-more-btn"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Загружаем…' : 'Загрузить ещё'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
