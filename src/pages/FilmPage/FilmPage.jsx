import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import useActivityEvents from '../../hooks/useActivityEvents';
import api from '../../api/client';
import { getGrade } from '../../utils/scoring';
import { getPosterUrl, handleImgError } from '../../utils/posterUrl';
import Header from '../../components/Header';
import FilmInfo from './components/FilmInfo';
import RatingSection from './components/RatingSection';
import CommentsSection from './components/CommentsSection';
import ReviewsSection from './components/ReviewsSection';
import UsersList from './components/UsersList';
import useFilmData from './hooks/useFilmData';
import RatingDetailsModal from '../../components/RatingDetailsModal';
import './FilmPage.css';

function FilmPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { addEvent } = useActivityEvents();
  const [selectedRating, setSelectedRating] = useState(null);
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
      return { ok: false, code: 'UNAUTHORIZED', message: 'Войдите, чтобы комментировать' };
    }
    try {
      // DECISION: API-CONTRACT.md описывает { targetType, targetId, text }, но
      // работающий код и бэкенд используют { filmId, text }. Верил коду.
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
      return { ok: true };
    } catch (err) {
      const code = err.response?.data?.errorCode;
      const message = err.response?.data?.error || 'Не удалось добавить комментарий';

      // DECISION: F2/3B — 403 ловим по errorCode, не по тексту. Inline-гейт
      // рисует CommentsSection, поэтому глобальную модалку здесь не показываем.
      if (code === 'RATING_REQUIRED_FOR_COMMENT') {
        return {
          ok: false,
          code,
          message: 'Чтобы комментировать, оцените фильм'
        };
      }

      showNotification({ title: 'Ошибка', message, type: 'error' });
      return { ok: false, code, message };
    }
  };

  // DECISION: F2/2A — «Оценить» из гейта комментариев скроллит к блоку оценки
  // на этой же странице. RatingSection.jsx (F1) не трогаем, поэтому ищем его
  // по существующему классу .rating-section.
  const scrollToRating = () => {
    const section = document.querySelector('.rating-section');
    if (!section) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
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

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!film) return <div className="error">Фильм не найден</div>;

  const posterUrl = getPosterUrl(film.poster);
  const hasBackdrop = Boolean(film.backdrop || film.poster);
  const backdropUrl = film.backdrop ? getPosterUrl(film.backdrop) : posterUrl;
  const genres = film.genres || [];
  const actors = film.actors || [];

  return (
    <div className="film-page">
      <Header user={currentUser} />

      <section className={`film-hero ${hasBackdrop ? '' : 'no-image'}`}>
        <div
          className={`film-hero-bd ${hasBackdrop ? 'has-image' : ''}`}
          style={hasBackdrop ? { backgroundImage: `url("${backdropUrl}")` } : undefined}
          aria-hidden="true"
        />

        <div className="film-hero-in">
          <div className="film-poster-col">
            <div className="film-poster">
              <img src={posterUrl} alt={film.title} onError={handleImgError} />
            </div>
          </div>

          <FilmInfo film={film}>
            <RatingSection
              film={film}
              userRating={userRating}
              setUserRating={setUserRating}
              reloadFilm={loadFilm}
              reloadUsers={loadFilmUsers}
              showNotification={showNotification}
              navigate={navigate}
            />
          </FilmInfo>
        </div>
      </section>

      <main className="film-layout">
        <div className="film-main">
          <UsersList
            filmUsers={filmUsers}
            usersLoading={false}
            onShowUsers={() => setShowUsersModal(true)}
            onOpenRatingDetails={openRatingDetails}
          />

          {film.trailer && (
            <section className="film-trailer">
              <h2 className="sec-title">Трейлер</h2>
              <iframe
                src={film.trailer}
                title="Трейлер" allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation"
              />
            </section>
          )}

          <ReviewsSection
            reviews={reviews}
            currentUser={currentUser}
            film={film}
            userRating={userRating}
            onAddReview={addReview}
            onLikeReview={likeReview}
          />

          <CommentsSection
            comments={comments}
            currentUser={currentUser}
            film={film}
            onAddComment={addComment}
            onLikeComment={likeComment}
            onRate={scrollToRating}
          />
        </div>

        <aside className="film-side">
          {genres.length > 0 && (
            <div className="side-block">
              <h3 className="sec-title">Жанры</h3>
              <div className="side-chips">
                {genres.map(genre => (
                  <span className="chip" key={genre}>{genre}</span>
                ))}
              </div>
            </div>
          )}

          <div className="side-block">
            <h3 className="sec-title">О фильме</h3>
            <dl className="side-facts">
              {film.year && (
                <div>
                  <dt>Год</dt>
                  <dd>{film.year}</dd>
                </div>
              )}
              {film.director && (
                <div>
                  <dt>Режиссёр</dt>
                  <dd>{film.director}</dd>
                </div>
              )}
              {actors.length > 0 && (
                <div>
                  <dt>В ролях</dt>
                  <dd>{actors.join(', ')}</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </main>

      {showUsersModal && (
        <div className="modal-overlay" onClick={() => setShowUsersModal(false)}>
          <div className="modal-content users-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowUsersModal(false)}>×</button>
            <p className="modal-kicker">Оценки</p>
            <h2 className="modal-title">Все оценки фильма</h2>
            <p className="modal-sub">Всего <strong>{filmUsers.length}</strong> человек</p>
            <div className="users-modal-list">
              {filmUsers.map((item) => {
                // F1-fix: для vibe-only finalScore на бэке = 0, не показываем цифру.
                const isVibeOnly = item.rating.completeness === 'vibe';
                return (
                  <div key={`${item.user._id}-${item.rating._id}`} className="user-rating-item-full">
                    <Link to={`/user/${item.user._id}`} className="user-link">
                      {item.user.nickname || 'Пользователь'}
                    </Link>
                    <div className="rating-info">
                      <span
                        className="user-rating-score" style={{ color: isVibeOnly ? 'var(--ink-faint)' : (getGrade(item.rating.finalScore)?.color || 'var(--ink)') }}
                        title={isVibeOnly ? 'Только вайб — комбинированный не вычислен' : undefined}
                      >
                        {isVibeOnly ? '—' : item.rating.finalScore}
                      </span>
                      <button
                        className="details-btn" onClick={() => {
                          setShowUsersModal(false);
                          openRatingDetails(item.rating);
                        }}
                      >
                        Детали
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <RatingDetailsModal rating={selectedRating} onClose={() => setSelectedRating(null)} />
    </div>
  );
}

export default FilmPage;
