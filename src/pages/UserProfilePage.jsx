import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useNotification } from '../context/NotificationContext';
import { formatDate } from '../utils/ratingUtils';
import { getScoreColor } from '../utils/constants';
import RatingDetailsModal from '../components/RatingDetailsModal';
import './ProfilePage.css';

function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(null);
  const [activeTab, setActiveTab] = useState('ratings');
  const [currentUser, setCurrentUser] = useState(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadUserProfile();
    loadCurrentUser();
  }, [id]);

  const loadCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await api.get('/auth/me');
        setCurrentUser(response.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
        }
      }
    }
  };

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/users/${id}`);
      setUser(response.data.user);
      setRatings(response.data.ratings || []);
      setReviews(response.data.reviews || []);
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      if (err.response?.status === 404) {
        setUser(null);
      }
      showNotification({
        title: 'Ошибка',
        message: err.response?.status === 404 ? 'Пользователь не найден' : 'Не удалось загрузить профиль',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
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
      const response = await api.get(`/users/${id}`);
      setReviews(response.data.reviews || []);
      showNotification({ title: 'Лайк поставлен!', message: 'Вы оценили рецензию', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось поставить лайк', type: 'error' });
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  if (!user) {
    return (
      <div className="container">
        <button onClick={() => navigate('/')} className="back-btn">← На главную</button>
        <div className="error-msg" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>😕 Пользователь не найден</h2>
          <p>Возможно, этот пользователь был удалён или вы перешли по неверной ссылке.</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?._id === user._id;

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
          <p>📅 Зарегистрирован: {formatDate(user.registeredAt)}</p>
          <p>⭐ Всего оценок: <strong>{ratings.length}</strong></p>
          <p>📝 Рецензий: <strong>{reviews.length}</strong></p>
          <p>🏆 Баллов: <strong>{user.totalPoints || 0}</strong></p>
          
          <div className="achievements-section" style={{ marginTop: '15px' }}>
            <h4>🏅 Достижения</h4>
            {user.achievements?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {user.achievements.map(ach => (
                  <span key={ach} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: '20px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    🏅 {ach}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: '#888', fontSize: '13px' }}>Нет достижений</p>
            )}
          </div>

       
      <div className="profile-tabs glass-card">
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'ratings' ? 'active' : ''}`}
            onClick={() => setActiveTab('ratings')}
          >
            ⭐ Оценки ({ratings.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            📝 Рецензии ({reviews.length})
          </button>
        </div>

        {activeTab === 'ratings' && (
          <div className="profile-ratings">
            <h2>Оценки пользователя</h2>
            {ratings.length === 0 ? (
              <p>Пользователь еще не оценил ни одного фильма</p>
            ) : (
              <div className="ratings-list">
                {ratings.map((rating) => (
                  <div key={rating._id} className="rating-item">
                    <Link to={`/film/${rating.film?._id || rating.filmId?._id}`}>
                      <div className="rating-film-info">
                        <img src={rating.film?.poster || rating.filmId?.poster || '/no-poster.jpg'} alt={rating.film?.title || rating.filmId?.title || 'Фильм'} className="rating-poster-small" />
                        <div>
                          <h4>{rating.film?.title || rating.filmId?.title || 'Фильм'}</h4>
                          <p>{rating.film?.year || rating.filmId?.year}</p>
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
            <h2>Рецензии пользователя</h2>
            {reviews.length === 0 ? (
              <p>Пользователь еще не написал ни одной рецензии</p>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="review-item">
                    <div className="review-header">
                      <Link to={`/film/${review.film?._id || review.filmId?._id}`} className="review-film-link">
                        <h3 className="review-title">{review.title}</h3>
                        <p className="review-film-name">
                          🎬 {review.film?.title || review.filmId?.title || 'Фильм'} 
                          ({review.film?.year || review.filmId?.year || 'N/A'})
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
                      <Link to={`/film/${review.film?._id || review.filmId?._id}`} className="review-go-to-film">
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

export default UserProfilePage;
