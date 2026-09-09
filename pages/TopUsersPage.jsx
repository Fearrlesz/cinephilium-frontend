import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

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
      setUsers(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки топа:', err);
      setError('Не удалось загрузить топ пользователей');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  const getMedal = (index) => {
    const medals = ['👑', '🥇', '🥈', '🥉'];
    return medals[index] || `#${index + 1}`;
  };

  return (
    <div className="container top-page">
      <Link to="/" className="back-btn">← На главную</Link>
      <h1 className="top-title">🏆 Топ пользователей</h1>
      <div className="top-users-list">
        {users.map((user, index) => (
          <Link to={`/user/${user._id}`} key={user._id} className="top-user-item">
            <div className="top-user-rank">{getMedal(index)}</div>
            <div className="top-user-avatar">
              <div className="avatar-placeholder-small">{user.nickname?.[0] || '?'}</div>
            </div>
            <div className="top-user-info">
              <div className="top-user-name">
                {user.nickname || 'Пользователь'}
                {user.isAdmin && <span className="admin-badge">👑</span>}
              </div>
              <div className="top-user-stats">
                <span>⭐ {user.totalPoints || 0} баллов</span>
                <span>🎯 {user.ratingsCount || 0} оценок</span>
                <span>📝 {user.reviewsCount || 0} рецензий</span>
                <span>💬 {user.commentsCount || 0} комментариев</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default TopUsersPage;
