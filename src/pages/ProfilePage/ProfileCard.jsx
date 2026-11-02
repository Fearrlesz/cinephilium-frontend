import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/ratingUtils';

function ProfileCard({ user, isOwnProfile }) {
  if (!user) return null;

  const counters = user.counters || {};
  const ratingCount = (counters.ratings || 0) + (counters.vibes || 0);
  const achievementsCount = user.achievementsCount
    ?? (Array.isArray(user.achievements) ? user.achievements.length : 0);
  const pinned = user.pinnedAchievement;

  const stats = user.isHidden
    ? []
    : [
        { label: 'Оценки', value: ratingCount },
        { label: 'Рецензии', value: counters.reviewsApproved || 0 },
        { label: 'Комментарии', value: counters.commentsApproved || 0 },
        { label: 'Дневник', value: counters.watches || 0 },
        { label: 'Watchlist', value: counters.watchlist || 0 },
        { label: 'Понравившиеся', value: counters.filmLikes || 0 },
      ];

  return (
    <section className="profile-card" aria-label="Карточка профиля">
      <div className="profile-avatar" aria-hidden="true">
        {user.nickname?.[0]?.toUpperCase() || '?'}
      </div>

      <div className="profile-card-body">
        <div className="profile-name-row">
          <h1 className="profile-name">{user.nickname || 'Пользователь'}</h1>
          {user.isAdmin && <span className="profile-badge">Админ</span>}
          {user.isExclusive && (
            <span className="profile-badge profile-badge--exclusive">
              Архитектор Синефилиума
            </span>
          )}
          {isOwnProfile && <span className="profile-own">Это вы</span>}
          {!user.isHidden && pinned && (
            <Link
              className="profile-pinned"
              to="?tab=achievements"
              title="Закреплённое достижение"
            >
              <span className="profile-pinned-mark" aria-hidden="true">◆</span>
              <span>{pinned}</span>
            </Link>
          )}
          {isOwnProfile && (
            <button
              type="button"
              className="profile-edit"
              disabled
              title="Редактирование профиля скоро"
            >
              Редактировать
            </button>
          )}
        </div>

        {user.isHidden && (
          <p className="profile-hidden-note">
            Профиль скрыт. Показаны только ник и аватар.
          </p>
        )}

        {!user.isHidden && user.registeredAt && (
          <p className="profile-registered">
            Зарегистрирован {formatDate(user.registeredAt)}
          </p>
        )}

        {!user.isHidden && (
          <div className="profile-stats">
            {stats.map(stat => (
              <div className="profile-stat" key={stat.label}>
                <span className="profile-stat-label">{stat.label}</span>
                <strong className="profile-stat-value">{stat.value}</strong>
              </div>
            ))}
          </div>
        )}

        {!user.isHidden && (
          <div className="profile-achievement-row">
            {!pinned && (
              <span className="profile-pinned-empty">Достижение не закреплено</span>
            )}
            <Link className="profile-achievements-link" to="?tab=achievements">
              Достижения <span className="profile-ach-count">{achievementsCount}</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export default ProfileCard;
