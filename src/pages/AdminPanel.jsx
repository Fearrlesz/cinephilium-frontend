import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useNotification } from '../context/NotificationContext';
import './AdminPanel.css';

function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pendingComments, setPendingComments] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadAdminData();
  }, [navigate]);

  const loadAdminData = async () => {
    try {
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      if (!userResponse.data.isAdmin) {
        navigate('/');
        return;
      }
      const [commentsRes, reviewsRes] = await Promise.all([
        api.get('/admin/pending/comments'),
        api.get('/admin/pending/reviews')
      ]);
      setPendingComments(commentsRes.data || []);
      setPendingReviews(reviewsRes.data || []);
    } catch (err) {
      console.error('Ошибка загрузки админ-панели:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const approveComment = async (id) => {
    try {
      await api.put(`/admin/comments/${id}/approve`);
      setPendingComments(prev => prev.filter(c => c._id !== id));
      showNotification({ title: 'Одобрено', message: 'Комментарий опубликован', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось одобрить комментарий', type: 'error' });
    }
  };

  const rejectComment = async (id) => {
    try {
      await api.put(`/admin/comments/${id}/reject`);
      setPendingComments(prev => prev.filter(c => c._id !== id));
      showNotification({ title: 'Отклонено', message: 'Комментарий отклонён', type: 'info' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось отклонить комментарий', type: 'error' });
    }
  };

  const approveReview = async (id) => {
    try {
      await api.put(`/admin/reviews/${id}/approve`);
      setPendingReviews(prev => prev.filter(r => r._id !== id));
      showNotification({ title: 'Одобрено', message: 'Рецензия опубликована', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось одобрить рецензию', type: 'error' });
    }
  };

  const rejectReview = async (id) => {
    try {
      await api.put(`/admin/reviews/${id}/reject`);
      setPendingReviews(prev => prev.filter(r => r._id !== id));
      showNotification({ title: 'Отклонено', message: 'Рецензия отклонена', type: 'info' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось отклонить рецензию', type: 'error' });
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="container admin-panel">
      <button onClick={() => navigate('/')} className="back-btn">← На главную</button>
      <h1 className="admin-title">🛡️ Админ-панель</h1>
      <p className="admin-welcome">Добро пожаловать, {user?.nickname}!</p>

      <div className="admin-section glass-card">
        <h2>💬 Комментарии на модерации ({pendingComments.length})</h2>
        {pendingComments.length === 0 ? (
          <p className="admin-empty">Нет комментариев для проверки</p>
        ) : (
          <div className="admin-list">
            {pendingComments.map(c => (
              <div key={c._id} className="admin-item">
                <div className="admin-item-header">
                  <span className="admin-item-author">👤 {c.userId?.nickname || 'Пользователь'}</span>
                  <span className="admin-item-film">🎬 {c.filmId?.title || 'Фильм'}</span>
                </div>
                <p className="admin-item-text">{c.text}</p>
                <div className="admin-item-actions">
                  <button className="btn-approve" onClick={() => approveComment(c._id)}>✅ Одобрить</button>
                  <button className="btn-reject" onClick={() => rejectComment(c._id)}>❌ Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-section glass-card">
        <h2>📝 Рецензии на модерации ({pendingReviews.length})</h2>
        {pendingReviews.length === 0 ? (
          <p className="admin-empty">Нет рецензий для проверки</p>
        ) : (
          <div className="admin-list">
            {pendingReviews.map(r => (
              <div key={r._id} className="admin-item">
                <div className="admin-item-header">
                  <span className="admin-item-author">👤 {r.userId?.nickname || 'Пользователь'}</span>
                  <span className="admin-item-film">🎬 {r.filmId?.title || 'Фильм'}</span>
                </div>
                <h4 className="admin-item-title">{r.title}</h4>
                <p className="admin-item-text">{r.text}</p>
                <div className="admin-item-actions">
                  <button className="btn-approve" onClick={() => approveReview(r._id)}>✅ Одобрить</button>
                  <button className="btn-reject" onClick={() => rejectReview(r._id)}>❌ Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
