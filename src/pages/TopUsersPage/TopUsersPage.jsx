import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import './TopUsersPage.css';

function TopUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTopUsers();
  }, []);

  const loadTopUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/top/users');
      const payload = response.data;
      setUsers(Array.isArray(payload) ? payload : payload?.items || []);
    } catch (err) {
      console.error('Ошибка загрузки топа:', err);
      setError('Не удалось загрузить топ пользователей');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container top-page">
      <header className="top-head">
        <p className="top-kicker">Сообщество</p>
        <h1 className="top-title">Топ пользователей</h1>
        <p className="top-lead">
          Больше всего баллов за оценки, рецензии и комментарии. Без медалей —
          только цифры.
        </p>
      </header>

      {loading && <p className="top-state">Загрузка…</p>}
      {error && <p className="top-state top-state--error" role="alert">{error}</p>}

      {!loading && !error && users.length === 0 && (
        <p className="top-state">Пока никого нет в топе.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="top-table" role="table" aria-label="Топ пользователей">
          <div className="top-table-head" role="row">
            <span role="columnheader">Место</span>
            <span role="columnheader">Пользователь</span>
            <span role="columnheader">Баллы</span>
            <span role="columnheader">Оценки</span>
            <span role="columnheader">Рецензии</span>
            <span role="columnheader">Комментарии</span>
          </div>

          {users.map((user, index) => (
            <Link
              to={`/user/${user._id}`}
              key={user._id}
              className={`top-row${index < 3 ? ' is-top' : ''}`}
              role="row"
            >
              <span className="top-rank" role="cell">
                {String(index + 1).padStart(2, '0')}
              </span>

              <span className="top-user" role="cell">
                <span className="top-avatar" aria-hidden="true">
                  {user.nickname?.[0]?.toUpperCase() || '?'}
                </span>
                <span className="top-name">
                  {user.nickname || 'Пользователь'}
                  {user.isAdmin && <span className="top-admin">админ</span>}
                </span>
              </span>

              <span className="top-points" role="cell">
                {user.totalPoints || 0}
              </span>
              <span className="top-stat" role="cell">
                <span className="top-stat-label">Оценки</span>
                {user.counters?.ratings ?? user.ratingsCount ?? 0}
              </span>
              <span className="top-stat" role="cell">
                <span className="top-stat-label">Рецензии</span>
                {user.counters?.reviewsApproved ?? user.reviewsCount ?? 0}
              </span>
              <span className="top-stat" role="cell">
                <span className="top-stat-label">Комментарии</span>
                {user.counters?.commentsApproved ?? user.commentsCount ?? 0}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export default TopUsersPage;
