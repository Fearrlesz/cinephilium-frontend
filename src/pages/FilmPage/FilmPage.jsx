import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import useActivityEvents from '../../hooks/useActivityEvents';
import api from '../../api/client';
import { getScoreColor } from '../../utils/constants';
import FilmInfo from './components/FilmInfo';
import RatingForm from './components/RatingForm'; 
import CommentsSection from './components/CommentsSection';
import ReviewsSection from './components/ReviewsSection';
import UsersList from './components/UsersList';
import useFilmData from './hooks/useFilmData';
import useRatingForm from './hooks/useRatingForm';
import RatingDetailsModal from '../../components/RatingDetailsModal';

function FilmPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { addEvent } = useActivityEvents();
  const [selectedRating, setSelectedRating] = useState(null);
  const [isRatingMode, setIsRatingMode] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);

  const {
    film,
    loading,
    userRating,
    setUserRating,
    filmUsers,
    setFilmUsers,
    comments,
    setComments,
    reviews,
    setReviews,
    currentUser,
    loadFilm,
    loadFilmUsers,
    loadComments,
    loadReviews,
    loadCurrentUser
  } = useFilmData(id);

  const ratingForm = useRatingForm(id, film, userRating, currentUser, loadFilm, loadFilmUsers, setUserRating, showNotification, navigate, addEvent);
  const {
    scores,
    vibe,
    genrePreset,
    blockWeights,
    textReview,
    isSaving,
    weightsValid,
    calculatePreview,
    saveRating,
    handleGenreChange,
    handleWeightChange,
    handleRatingChange,
    setVibe,
    setTextReview,
    resetForm
  } = ratingForm;

  useEffect(() => {
    resetForm();
  }, [userRating, resetForm]);

  useEffect(() => {
    loadFilm();
    loadFilmUsers();
    loadComments();
    loadReviews();
    loadCurrentUser();
  }, [id]);

  const addComment = async (text) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы комментировать', type: 'warning' });
      navigate('/login');
      return;
    }
    try {
      await api.post('/comments', { filmId: id, text });
      await loadComments();
      if (currentUser && film) {
        await addEvent({
          type: 'comment',
          user: currentUser.nickname,
          film: film.title,
          filmId: film._id
        });
      }
      showNotification({ title: 'Комментарий добавлен', message: 'Ваш комментарий опубликован', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось добавить комментарий', type: 'error' });
    }
  };

  const likeComment = async (commentId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы ставить лайки', type: 'warning' });
      navigate('/login');
      return;
    }
    try {
      await api.post(`/comments/${commentId}/like`);
      await loadComments();
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось поставить лайк', type: 'error' });
    }
  };

  const addReview = async (title, text) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы написать рецензию', type: 'warning' });
      navigate('/login');
      return;
    }
    if (!userRating) {
      showNotification({ title: 'Сначала оцените фильм', message: 'Чтобы написать рецензию, нужно оценить фильм', type: 'warning' });
      return;
    }
    try {
      await api.post('/reviews', {
        filmId: id,
        ratingId: userRating._id,
        title,
        text
      });
      await loadReviews();
      if (currentUser && film) {
        await addEvent({
          type: 'review',
          user: currentUser.nickname,
          film: film.title,
          filmId: film._id
        });
      }
      showNotification({ title: 'Рецензия добавлена!', message: 'Ваша рецензия опубликована', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось добавить рецензию', type: 'error' });
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
      await loadReviews();
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось поставить лайк', type: 'error' });
    }
  };

  const openRatingDetails = async (ratingData) => {
    try {
      if (ratingData.base1 && ratingData.base1.length === 5) {
        setSelectedRating(ratingData);
        return;
      }
      const response = await api.get(`/ratings/${ratingData._id}/details`);
      setSelectedRating(response.data);
    } catch (err) {
      console.error('Ошибка загрузки деталей оценки:', err);
      showNotification({ title: 'Ошибка', message: 'Не удалось загрузить детали оценки', type: 'error' });
    }
  };

  const toggleRatingMode = () => setIsRatingMode(prev => !prev);
  const handleSaveRating = async () => {
    await saveRating();
    setIsRatingMode(false);
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!film) return <div className="error">Фильм не найден</div>;

  return (
    <div className="container">
      <div className="film-page">
        <button onClick={() => navigate('/')} className="back-btn">← На главную</button>

        <FilmInfo film={film} userRating={userRating} onToggleRating={toggleRatingMode} isRatingMode={isRatingMode} />

        {isRatingMode && (
          <RatingForm
            scores={scores}
            vibe={vibe}
            genrePreset={genrePreset}
            blockWeights={blockWeights}
            textReview={textReview}
            weightsValid={weightsValid}
            isSaving={isSaving}
            onScoreChange={handleRatingChange}
            onVibeChange={setVibe}
            onGenreChange={handleGenreChange}
            onWeightChange={handleWeightChange}
            onTextReviewChange={setTextReview}
            onSave={handleSaveRating}
            calculatePreview={calculatePreview}
          />
        )}

        <ReviewsSection
          reviews={reviews}
          currentUser={currentUser}
          film={film}
          userRating={userRating}
          onAddReview={addReview}
          onLikeReview={likeReview}
        />

        <UsersList
          filmUsers={filmUsers}
          usersLoading={false}
          onShowUsers={() => setShowUsersModal(true)}
          onOpenRatingDetails={openRatingDetails}
        />

        {showUsersModal && (
          <div className="modal-overlay" onClick={() => setShowUsersModal(false)}>
            <div className="modal-content users-modal" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowUsersModal(false)}>✕</button>
              <h2>👥 Все оценки фильма</h2>
              <p className="modal-subtitle">Всего <strong>{filmUsers.length}</strong> человек</p>
              <div className="users-modal-list">
                {filmUsers.map((item) => (
                  <div key={`${item.user._id}-${item.rating._id}`} className="user-rating-item-full">
                    <div className="user-info">
                      <Link to={`/user/${item.user._id}`} className="user-link">
                        👤 {item.user.nickname || 'Пользователь'}
                      </Link>
                      {item.user.isAdmin && <span className="admin-badge">👑</span>}
                    </div>
                    <div className="rating-info">
                      <span className="user-rating-score" style={{ color: getScoreColor(item.rating.finalScore) }}>
                        {item.rating.finalScore}
                      </span>
                      <button className="details-btn" onClick={() => {
                        setShowUsersModal(false);
                        openRatingDetails(item.rating);
                      }}>
                        🔍 Детали
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <CommentsSection
          comments={comments}
          currentUser={currentUser}
          film={film}
          onAddComment={addComment}
          onLikeComment={likeComment}
        />

        {film.trailer && (
          <div className="trailer glass-card">
            <h3>Трейлер</h3>
            <iframe
              src={film.trailer}
              title="Трейлер"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation"
              style={{ width: '100%', height: '380px', border: 'none' }}
            />
          </div>
        )}
      </div>

      <RatingDetailsModal rating={selectedRating} onClose={() => setSelectedRating(null)} />
    </div>
  );
}

export default FilmPage;
