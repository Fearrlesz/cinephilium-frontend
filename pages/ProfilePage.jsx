import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useNotification } from '../context/NotificationContext';
import useActivityEvents from '../hooks/useActivityEvents';
import { formatDate } from '../utils/ratingUtils';
import { getScoreColor } from '../utils/constants';
import RatingDetailsModal from '../components/RatingDetailsModal';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(null);
  const [adminSecret, setAdminSecret] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('ratings');
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { addEvent } = useActivityEvents();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, [navigate]);

  const loadAchievementProgress = useCallback(async (userData) => {
  try {
    const response = await api.get('/users/me/achievements');
    if (response.data?.achievements) {
      const oldAchievements = userData?.achievements || [];
      const newAchievements = response.data.achievements;
      const freshAchievements = newAchievements.filter(ach => !oldAchievements.includes(ach));
      
      if (freshAchievements.length > 0) {
        try {
          await addEvent({
            type: 'achievement',
            user: userData?.nickname || 'Пользователь',
            film: 'система',
            filmId: 'system',
            metadata: { achievements: freshAchievements }
          });
        } catch (err) {
          console.error('Ошибка создания события о достижениях:', err);
        }
      }
      
      // ✅ ИСПРАВЛЕНО: используем userData как основу
      setUser({
        ...userData,  // все поля от свежего профиля
        achievements: newAchievements,
        totalPoints: response.data.totalPoints || userData?.totalPoints || 0
      });
    }
  } catch (err) {
    console.error('Ошибка загрузки прогресса достижений:', err);
  }
}, [addEvent]);

  const loadProfile = useCallback(async () => {
  setLoading(true);
  try {
    const [userResponse, ratingsResponse, reviewsResponse] = await Promise.all([
      api.get('/auth/me'),
      api.get('/ratings/user'),
      api.get('/reviews/user')
    ]);
    const userData = userResponse.data;
    setUser(userData);
    setRatings(ratingsResponse.data || []);
    setReviews(reviewsResponse.data || []);
    await loadAchievementProgress(userData);
  } catch (err) {
    console.error('Ошибка загрузки профиля:', err);
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      navigate('/login');
    }
  } finally {
    setLoading(false);
  }
}, [navigate, loadAchievementProgress]);
  
  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
    showNotification({ title: 'До свидания!', message: 'Вы вышли из аккаунта', type: 'info' });
  };

  const openRatingDetails = async (rating) => {
    try {
      const ratingId = rating._id || rating.id;
      if (!ratingId) {
        showNotification({ title: 'Ошибка', message: 'ID оценки не найден', type: 'error' });
        return;
      }
      const response = await api.get(`/ratings/${ratingId}/details`);
      setSelectedRating(response.data);
    } catch (err) {
      console.error('Ошибка загрузки деталей оценки:', err);
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось загрузить детали оценки', type: 'error' });
    }
  };

  const likeReview = async (reviewId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы ставить лайки', type: 'warning' });
      navigate('/login');
      return;
    }
    try {
      await api.post(`/reviews/${reviewId}/like`);
      const response = await api.get('/reviews/user');
      setReviews(response.data || []);
      showNotification({ title: 'Лайк поставлен!', message: 'Вы оценили рецензию', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось поставить лайк', type: 'error' });
    }
  };

  const activateAdmin = async () => {
    if (!adminSecret.trim()) {
      setAdminError('Введите секретный ключ');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    setAdminSuccess('');
    try {
      const response = await api.post('/admin/make', { secretKey: adminSecret });
      setAdminSuccess(response.data.message);
      setUser(prev => ({ ...prev, isAdmin: true, totalPoints: response.data.totalPoints }));
      setAdminSecret('');
      showNotification({ title: 'Поздравляем!', message: 'Вы стали администратором! 👑', type: 'success' });
    } catch (err) {
      setAdminError(err.response?.data?.error || 'Ошибка активации');
    } finally {
      setAdminLoading(false);
    }
  };

  const avgRating = ratings.length ? (ratings.reduce((sum,r)=>sum+r.finalScore,0)/ratings.length).toFixed(1) : 'Нет';

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!user) return <div className="error">Не удалось загрузить профиль</div>;

  return (
    <div className="container profile-page">
      <button onClick={() => navigate('/')} className="back-btn">← На главную</button>

      <div className="profile-header glass-card">
        <div className="profile-avatar">
          <div className="avatar-placeholder">{user.nickname?.[0] || '?'}</div>
        </div>
        <div className="profile-info">
          <h1>
            {user.nickname || 'Пользователь'}
            {user.isAdmin && <span className="admin-badge"> 👑</span>}
          </h1>
          <p>📧 {user.email}</p>
          <div className="profile-stats">
            <p>📊 Средняя оценка: <strong>{avgRating}</strong></p>
            <p>🏆 Всего оценок: <strong>{ratings.length}</strong></p>
            <p>📝 Рецензий: <strong>{reviews.length}</strong></p>
            <p>⭐ Баллов: <strong>{user.totalPoints || 0}</strong></p>
          </div>

          <div className="achievements-section" style={{ marginTop: '20px' }}>
            <h3>🏅 Достижения</h3>
            {user.achievements?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginTop: '10px' }}>
                {user.achievements.map(ach => (
                  <div key={ach} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '24px' }}>🏅</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{ach}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#888', padding: '10px 0' }}>Нет достижений. Начните оценивать фильмы, писать рецензии и комментарии!</p>
            )}
          </div>

          {!user.isAdmin && (
            <div className="admin-activation glass-card">
              <h4>🔑 Стать администратором</h4>
              <p className="admin-hint">Введите секретный ключ, чтобы получить права администратора</p>
              <div className="admin-form">
                <input type="password" placeholder="Секретный ключ..." value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} />
                <button onClick={activateAdmin} disabled={adminLoading}>{adminLoading ? 'Проверка...' : '👑 Активировать'}</button>
              </div>
              {adminError && <div className="error-msg">{adminError}</div>}
              {adminSuccess && <div className="success-msg">{adminSuccess}</div>}
            </div>
          )}
          <button onClick={logout} className="logout-btn">🚪 Выйти</button>
        </div>
      </div>

      <div className="profile-tabs glass-card">
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'ratings' ? 'active' : ''}`}
            onClick={() => setActiveTab('ratings')}
          >
            ⭐ Мои оценки ({ratings.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            📝 Мои рецензии ({reviews.length})
          </button>
        </div>

        {activeTab === 'ratings' && (
          <div className="profile-ratings">
            <h2>Мои оценки</h2>
            {ratings.length === 0 ? (
              <p>Вы еще не оценили ни одного фильма</p>
            ) : (
              <div className="ratings-list">
                {ratings.map((rating) => (
                  <div key={rating._id} className="rating-item">
                    <Link to={`/film/${rating.filmId?._id || rating.film?._id}`}>
                      <div className="rating-film-info">
                        <img src={rating.filmId?.poster || rating.film?.poster || '/no-poster.jpg'} alt={rating.filmId?.title || rating.film?.title || 'Фильм'} className="rating-poster-small" />
                        <div>
                          <h4>{rating.filmId?.title || rating.film?.title || 'Фильм'}</h4>
                          <p>{rating.filmId?.year || rating.film?.year}</p>
                        </div>
                      </div>
                    </Link>
                    <div className="rating-score" style={{ color: getScoreColor(rating.finalScore) }}>{rating.finalScore}</div>
                    <button className="details-btn" onClick={() => openRatingDetails(rating)}>🔍 Детали</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="profile-reviews">
            <h2>Мои рецензии</h2>
            {reviews.length === 0 ? (
              <p>Вы еще не написали ни одной рецензии</p>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="review-item">
                    <div className="review-header">
                      <Link to={`/film/${review.filmId?._id || review.film?._id}`} className="review-film-link">
                        <h3 className="review-title">{review.title}</h3>
                        <p className="review-film-name">
                          🎬 {review.filmId?.title || review.film?.title || 'Фильм'} 
                          ({review.filmId?.year || review.film?.year || 'N/A'})
                        </p>
                      </Link>
                      <div className="review-rating">
                        ⭐ Оценка: {review.ratingId?.finalScore || 'Нет оценки'}
                      </div>
                    </div>
                    <p className="review-text">{review.text}</p>
                    <div className="review-footer">
                      <div className="review-actions">
                        <button className="like-btn" onClick={() => likeReview(review._id)}>
                          ❤️ {review.likes?.length || 0}
                        </button>
                        <span className="review-date">
                          📅 {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <Link to={`/film/${review.filmId?._id || review.film?._id}`} className="review-go-to-film">
                        🎬 Перейти к фильму
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <RatingDetailsModal rating={selectedRating} onClose={() => setSelectedRating(null)} />
    </div>
  );
}

export default ProfilePage;
