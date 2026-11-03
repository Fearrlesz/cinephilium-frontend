import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { getPosterUrl, handleImgError } from '../../utils/posterUrl';
import { getScoreColor } from '../../utils/constants';
import { formatDate } from '../../utils/ratingUtils';
import { formatVibe } from '../../utils/scoring';
import ProfileDiary from '../../components/ProfileDiary/ProfileDiary';
import {
  useGallery,
  PosterGallerySection,
} from '../../components/ProfileGalleries/ProfileGalleries';

export const PROFILE_TABS = [
  { key: 'ratings', label: 'Оценки' },
  { key: 'reviews', label: 'Рецензии' },
  { key: 'comments', label: 'Комментарии' },
  { key: 'diary', label: 'Дневник' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'likes', label: 'Понравившиеся' },
  { key: 'achievements', label: 'Достижения' },
];

function usePagedList(endpoint, pageSize) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!endpoint) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setItems([]);
    setPagination(null);
    setLoading(true);
    setError('');
    setHidden(false);

    api.get(endpoint, { params: { page: 1, limit: pageSize } })
      .then(response => {
        if (cancelled) return;
        setItems(response.data?.items || []);
        setPagination(response.data?.pagination || null);
      })
      .catch(err => {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setHidden(true);
        } else {
          setError(
            err.response?.data?.error?.message
              || err.response?.data?.error
              || 'Не удалось загрузить раздел'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [endpoint, pageSize]);

  const loadMore = useCallback(async () => {
    const currentPage = Number(pagination?.page) || 0;
    const pages = Number(pagination?.pages) || 1;
    if (!endpoint || loadingMore || currentPage >= pages) return;

    setLoadingMore(true);
    setError('');
    try {
      const response = await api.get(endpoint, {
        params: { page: currentPage + 1, limit: pageSize },
      });
      setItems(current => [...current, ...(response.data?.items || [])]);
      setPagination(response.data?.pagination || null);
    } catch (err) {
      setError(
        err.response?.data?.error?.message
          || err.response?.data?.error
          || 'Не удалось загрузить ещё'
      );
    } finally {
      setLoadingMore(false);
    }
  }, [endpoint, loadingMore, pageSize, pagination]);

  return { items, pagination, loading, loadingMore, error, hidden, loadMore };
}

function TabSkeleton({ variant = 'rows', count = 3 }) {
  return (
    <div className={`profile-skeleton profile-skeleton--${variant}`} aria-label="Загрузка">
      {Array.from({ length: count }, (_, index) => (
        <div className="profile-skel-card" key={index}>
          {variant === 'grid' && <div className="profile-skel-poster" />}
          <div className="profile-skel-line profile-skel-line--wide" />
          <div className="profile-skel-line" />
          {variant === 'rows' && <div className="profile-skel-line profile-skel-line--short" />}
        </div>
      ))}
    </div>
  );
}

function ProfileError({ children }) {
  return <p className="profile-error" role="alert">{children}</p>;
}

function ProfileEmpty({ children }) {
  return <p className="profile-empty">{children}</p>;
}

function MoreButton({ onClick, loading }) {
  return (
    <div className="profile-more">
      <button
        type="button"
        className="profile-more-btn"
        onClick={onClick}
        disabled={loading}
      >
        {loading ? 'Загрузка…' : 'Загрузить ещё'}
      </button>
    </div>
  );
}

const RATING_SORTS = [
  { value: 'new', label: 'Новые' },
  { value: 'old', label: 'Старые' },
  { value: 'high', label: 'Высокие' },
  { value: 'low', label: 'Низкие' },
];

function RatingsTab({ userId, isOwnProfile }) {
  const [sort, setSort] = useState('new');
  const {
    items, pagination, loading, loadingMore, error, hidden, loadMore
  } = usePagedList(`/users/${userId}/ratings?sort=${sort}`, 12);

  if (hidden) return <ProfileEmpty>Оценки недоступны.</ProfileEmpty>;
  if (loading && items.length === 0) return <TabSkeleton variant="grid" count={5} />;
  if (error && items.length === 0) return <ProfileError>{error}</ProfileError>;

  const pages = Number(pagination?.pages) || 1;
  const currentPage = Number(pagination?.page) || 1;
  const hasMore = currentPage < pages;

  return (
    <div className="profile-ratings">
      <div className="profile-ratings-head">
        <div className="profile-sort" role="group" aria-label="Сортировка оценок">
          {RATING_SORTS.map(option => (
            <button
              key={option.value}
              type="button"
              className={`profile-sort-btn${sort === option.value ? ' is-active' : ''}`}
              aria-pressed={sort === option.value}
              onClick={() => setSort(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <ProfileEmpty>
          {isOwnProfile
            ? 'Вы пока не поставили ни одной оценки'
            : 'Пользователь пока не поставил ни одной оценки'}
        </ProfileEmpty>
      ) : (
        <div className="profile-ratings-grid">
          {items.map(rating => {
            const film = rating.film;
            if (!film) return null;

            const filmId = film._id || film.id;
            const title = film.title || 'Фильм';
            const isVibe = rating.completeness === 'vibe';
            const score = isVibe
              ? null
              : (rating.combinedScore ?? rating.technicalScore);
            const poster = getPosterUrl(film.poster || film.posterUrl);

            return (
              <Link
                className="profile-rating-card"
                to={`/film/${filmId}`}
                key={rating.id || `${filmId}-${rating.createdAt}`}
              >
                <img
                  className="profile-rating-poster"
                  src={poster}
                  alt={title}
                  loading="lazy"
                  onError={handleImgError}
                />
                <span className="profile-rating-title">{title}</span>
                {film.year && <span className="profile-rating-year">{film.year}</span>}
                <span
                  className={`profile-rating-score${isVibe ? ' is-vibe' : ''}${score == null && !isVibe ? ' is-empty' : ''}`}
                  style={score == null ? undefined : { color: getScoreColor(score) }}
                >
                  {isVibe ? formatVibe(rating.vibe) : score == null ? '—' : score}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {error && items.length > 0 && <ProfileError>{error}</ProfileError>}
      {hasMore && <MoreButton onClick={loadMore} loading={loadingMore} />}
    </div>
  );
}

function ReviewsTab({ userId, isOwnProfile }) {
  const {
    items, pagination, loading, loadingMore, error, hidden, loadMore
  } = usePagedList(`/users/${userId}/reviews`, 10);
  const [openSpoilers, setOpenSpoilers] = useState({});

  if (hidden) return <ProfileEmpty>Рецензии недоступны.</ProfileEmpty>;
  if (loading && items.length === 0) return <TabSkeleton count={3} />;
  if (error && items.length === 0) return <ProfileError>{error}</ProfileError>;

  const pages = Number(pagination?.pages) || 1;
  const currentPage = Number(pagination?.page) || 1;
  const hasMore = currentPage < pages;

  const toggleSpoiler = id => {
    setOpenSpoilers(current => ({ ...current, [id]: !current[id] }));
  };

  return (
    <div className="profile-reviews">
      {items.length === 0 ? (
        <ProfileEmpty>
          {isOwnProfile
            ? 'Вы пока не написали ни одной рецензии'
            : 'Пользователь пока не написал ни одной рецензии'}
        </ProfileEmpty>
      ) : (
        items.map(review => {
          const film = review.film || review.filmId;
          const filmId = film?._id || film?.id;
          const rating = review.ratingId;
          const score = rating?.combinedScore ?? rating?.technicalScore;
          const isOpen = Boolean(openSpoilers[review._id]);
          const reviewBody = (
            <p className="profile-review-text">{review.text}</p>
          );

          return (
            <article className="profile-review" key={review._id}>
              <div className="profile-review-head">
                <div>
                  <Link
                    className="profile-review-film"
                    to={filmId ? `/film/${filmId}` : '#'}
                  >
                    {film?.title || 'Фильм'}
                    {film?.year ? ` · ${film.year}` : ''}
                  </Link>
                  <h2 className="profile-review-title">{review.title}</h2>
                </div>
                {score != null && (
                  <span
                    className="profile-review-score"
                    style={{ color: getScoreColor(score) }}
                  >
                    {score}
                    <span className="profile-review-score-max">/100</span>
                  </span>
                )}
              </div>

              <div className="profile-review-meta">
                <span>{formatDate(review.createdAt)}</span>
                {review.status && review.status !== 'approved' && (
                  <span className="profile-status">
                    {review.status === 'pending' ? 'На модерации' : 'Не опубликована'}
                  </span>
                )}
                <span>Полезно {review.likes?.length || 0}</span>
              </div>

              {review.isSpoiler ? (
                <div className="profile-spoiler">
                  <div className="profile-spoiler-head">
                    <span className="profile-spoiler-label">Спойлер</span>
                    <button
                      type="button"
                      className="profile-spoiler-toggle"
                      onClick={() => toggleSpoiler(review._id)}
                    >
                      {isOpen ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>
                  {isOpen && reviewBody}
                </div>
              ) : reviewBody}
            </article>
          );
        })
      )}

      {error && items.length > 0 && <ProfileError>{error}</ProfileError>}
      {hasMore && <MoreButton onClick={loadMore} loading={loadingMore} />}
    </div>
  );
}

function CommentsTab({ userId, isOwnProfile }) {
  const {
    items, pagination, loading, loadingMore, error, hidden, loadMore
  } = usePagedList(`/users/${userId}/comments`, 15);

  if (hidden) return <ProfileEmpty>Комментарии недоступны.</ProfileEmpty>;
  if (loading && items.length === 0) return <TabSkeleton count={4} />;
  if (error && items.length === 0) return <ProfileError>{error}</ProfileError>;

  const pages = Number(pagination?.pages) || 1;
  const currentPage = Number(pagination?.page) || 1;
  const hasMore = currentPage < pages;

  return (
    <div className="profile-comments">
      {items.length === 0 ? (
        <ProfileEmpty>
          {isOwnProfile
            ? 'Вы пока не написали ни одного комментария'
            : 'Пользователь пока не написал ни одного комментария'}
        </ProfileEmpty>
      ) : (
        items.map(comment => {
          const film = comment.film;
          const filmId = film?._id || film?.id;
          const targetType = comment.targetType || 'film';
          const target = comment.target;
          const source = targetType === 'review' && target
            ? `К рецензии «${target.title || 'Без названия'}»`
            : `К фильму «${film?.title || 'Фильм'}»`;

          return (
            <article className="profile-comment" key={comment.id}>
              <div className="profile-comment-source">
                <span className="profile-comment-type">
                  {targetType === 'review' ? 'Рецензия' : 'Фильм'}
                </span>
                {filmId ? (
                  <Link to={`/film/${filmId}`}>{source}</Link>
                ) : (
                  <span>{source}</span>
                )}
              </div>
              <p className="profile-comment-text">{comment.text}</p>
              <div className="profile-review-meta">
                <span>{formatDate(comment.createdAt)}</span>
                {comment.parentId && <span>Ответ</span>}
                {comment.status && comment.status !== 'approved' && (
                  <span className="profile-status">
                    {comment.status === 'pending' ? 'На модерации' : 'Не опубликован'}
                  </span>
                )}
                <span>Полезно {comment.likes?.length || 0}</span>
              </div>
            </article>
          );
        })
      )}

      {error && items.length > 0 && <ProfileError>{error}</ProfileError>}
      {hasMore && <MoreButton onClick={loadMore} loading={loadingMore} />}
    </div>
  );
}

function GalleryTab({ userId, isOwnProfile, kind, counters, onRemoved }) {
  const isLikes = kind === 'likes';
  const endpoint = isLikes
    ? (isOwnProfile ? '/users/me/likes' : `/users/${userId}/likes`)
    : (isOwnProfile ? '/watchlist/user' : `/users/${userId}/watchlist`);
  const gallery = useGallery(endpoint, {
    enabled: Boolean(userId),
    removable: !isLikes && isOwnProfile,
  });

  if (gallery.hidden) return <ProfileEmpty>Раздел недоступен.</ProfileEmpty>;

  const count = isLikes
    ? (counters?.filmLikes ?? gallery.pagination?.total ?? 0)
    : (counters?.watchlist ?? gallery.pagination?.total ?? 0);

  const handleRemove = async item => {
    const removed = await gallery.removeItem(item);
    if (removed) onRemoved?.();
  };

  return (
    <PosterGallerySection
      title={isLikes ? 'Понравившиеся' : 'Watchlist'}
      items={gallery.items}
      count={count}
      loading={gallery.loading}
      error={gallery.error}
      emptyText={
        isLikes
          ? (isOwnProfile
            ? 'Вы пока ничего не лайкнули'
            : 'Пользователь пока ничего не лайкнул')
          : (isOwnProfile
            ? 'Вы пока ничего не добавили в Watchlist'
            : 'Пользователь пока ничего не добавил в Watchlist')
      }
      pagination={gallery.pagination}
      page={gallery.page}
      onPageChange={gallery.setPage}
      removable={!isLikes && isOwnProfile}
      onRemove={handleRemove}
      hideHead
    />
  );
}

function AchievementsTab({
  userId,
  isOwnProfile,
  pinned,
  onPinnedChange,
}) {
  const [earned, setEarned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(false);
  const [pinning, setPinning] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setHidden(false);

    api.get(`/users/${userId}/achievements`)
      .then(response => {
        if (cancelled) return;
        setEarned(response.data?.earned || []);
      })
      .catch(err => {
        if (cancelled) return;
        if (err.response?.status === 404) {
          setHidden(true);
        } else {
          setError(
            err.response?.data?.error?.message
              || err.response?.data?.error
              || 'Не удалось загрузить достижения'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const togglePin = async achievement => {
    if (!isOwnProfile || pinning) return;
    const next = pinned === achievement ? null : achievement;
    setPinning(achievement);
    setError('');
    try {
      const response = await api.put('/users/me/pinned-achievement', {
        achievement: next,
      });
      onPinnedChange?.(response.data?.pinnedAchievement ?? next);
    } catch (err) {
      setError(
        err.response?.data?.error?.message
          || err.response?.data?.error
          || 'Не удалось изменить закреплённое достижение'
      );
    } finally {
      setPinning(null);
    }
  };

  if (hidden) return <ProfileEmpty>Достижения недоступны.</ProfileEmpty>;
  if (loading) return <TabSkeleton variant="grid" count={6} />;

  return (
    <div className="profile-achievements">
      {error && <ProfileError>{error}</ProfileError>}
      {earned.length === 0 ? (
        <ProfileEmpty>
          {isOwnProfile
            ? 'Вы пока не получили ни одного достижения'
            : 'Пользователь пока не получил ни одного достижения'}
        </ProfileEmpty>
      ) : (
        <div className="profile-achievements-grid">
          {earned.map(achievement => {
            const isPinned = pinned === achievement;
            return (
              <div
                className={`profile-achievement${isPinned ? ' is-pinned' : ''}`}
                key={achievement}
              >
                <span className="profile-achievement-name">{achievement}</span>
                {isOwnProfile && (
                  <button
                    type="button"
                    className="profile-pin-btn"
                    onClick={() => togglePin(achievement)}
                    disabled={Boolean(pinning)}
                  >
                    {pinning === achievement
                      ? 'Сохраняем…'
                      : (isPinned ? 'Открепить' : 'Закрепить')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProfileTabs({
  userId,
  isOwnProfile,
  counters,
  pinnedAchievement,
  onPinnedChange,
  onWatchlistRemoved,
  onWatchRemoved,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab');
  const activeTab = PROFILE_TABS.some(tab => tab.key === requested)
    ? requested
    : 'ratings';

  const selectTab = key => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    setSearchParams(next);
  };

  let content = null;
  switch (activeTab) {
    case 'reviews':
      content = <ReviewsTab userId={userId} isOwnProfile={isOwnProfile} />;
      break;
    case 'comments':
      content = <CommentsTab userId={userId} isOwnProfile={isOwnProfile} />;
      break;
    case 'diary':
      content = (
        <ProfileDiary
          key={`diary-${userId}`}
          userId={userId}
          isOwnProfile={isOwnProfile}
          counters={counters}
          hidden={false}
          onWatchRemoved={onWatchRemoved}
          embedded
        />
      );
      break;
    case 'watchlist':
      content = (
        <GalleryTab
          userId={userId}
          isOwnProfile={isOwnProfile}
          kind="watchlist"
          counters={counters}
          onRemoved={onWatchlistRemoved}
        />
      );
      break;
    case 'likes':
      content = (
        <GalleryTab
          userId={userId}
          isOwnProfile={isOwnProfile}
          kind="likes"
          counters={counters}
        />
      );
      break;
    case 'achievements':
      content = (
        <AchievementsTab
          userId={userId}
          isOwnProfile={isOwnProfile}
          pinned={pinnedAchievement}
          onPinnedChange={onPinnedChange}
        />
      );
      break;
    case 'ratings':
    default:
      content = <RatingsTab userId={userId} isOwnProfile={isOwnProfile} />;
  }

  return (
    <>
      <nav className="profile-tabbar" role="tablist" aria-label="Разделы профиля">
        {PROFILE_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`profile-tab${activeTab === tab.key ? ' is-active' : ''}`}
            onClick={() => selectTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="profile-tabpanel" role="tabpanel" key={activeTab}>
        {content}
      </div>
    </>
  );
}
