import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import ProfileCard from './ProfileCard';
import ProfileTabs from './ProfileTabs';
import './ProfilePage.css';

function ProfileView({ userId, isOwnProfile, initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setLoading(false);
      setError('');
      return undefined;
    }

    if (!userId) {
      setLoading(false);
      setError('Профиль не найден');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    api.get(`/users/${userId}`)
      .then(response => {
        if (cancelled) return;
        setUser(response.data?.user || null);
      })
      .catch(err => {
        if (cancelled) return;
        setError(
          err.response?.status === 404
            ? 'Пользователь не найден'
            : 'Не удалось загрузить профиль'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, initialUser]);

  const handlePinnedChange = useCallback(value => {
    setUser(current => (
      current ? { ...current, pinnedAchievement: value } : current
    ));
  }, []);

  const handleWatchlistRemoved = useCallback(() => {
    setUser(current => (
      current
        ? {
            ...current,
            counters: {
              ...(current.counters || {}),
              watchlist: Math.max(0, (current.counters?.watchlist || 0) - 1),
            },
          }
        : current
    ));
  }, []);

  const handleWatchRemoved = useCallback(() => {
    setUser(current => (
      current
        ? {
            ...current,
            counters: {
              ...(current.counters || {}),
              watches: Math.max(0, (current.counters?.watches || 0) - 1),
            },
          }
        : current
    ));
  }, []);

  if (loading) {
    return (
      <div className="profile-page">
        <Link className="profile-back" to="/">← На главную</Link>
        <div className="profile-skeleton profile-skeleton--card" aria-label="Загрузка">
          <div className="profile-skel-card">
            <div className="profile-skel-line profile-skel-line--wide" />
            <div className="profile-skel-line" />
            <div className="profile-skel-line profile-skel-line--short" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="profile-page">
        <Link className="profile-back" to="/">← На главную</Link>
        <p className="profile-error" role="alert">{error || 'Профиль не найден'}</p>
      </div>
    );
  }

  const targetUserId = user._id || user.id;

  return (
    <div className="profile-page">
      <Link className="profile-back" to="/">← На главную</Link>

      <ProfileCard user={user} isOwnProfile={isOwnProfile} />

      {!user.isHidden && (
        <ProfileTabs
          userId={targetUserId}
          isOwnProfile={isOwnProfile}
          counters={user.counters}
          pinnedAchievement={user.pinnedAchievement}
          onPinnedChange={handlePinnedChange}
          onWatchlistRemoved={handleWatchlistRemoved}
          onWatchRemoved={handleWatchRemoved}
        />
      )}
    </div>
  );
}

export default ProfileView;
