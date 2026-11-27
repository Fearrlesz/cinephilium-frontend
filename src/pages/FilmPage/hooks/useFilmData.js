import { useState, useCallback } from 'react';
import api from '../../../api/client';

function useFilmData(filmId) {
  const [film, setFilm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(null);
  const [filmUsers, setFilmUsers] = useState([]);
  const [filmUsersPagination, setFilmUsersPagination] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsPagination, setCommentsPagination] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsPagination, setReviewsPagination] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingMore, setLoadingMore] = useState({
    filmUsers: false,
    comments: false,
    reviews: false
  });

  // `silent` — обновить фильм/агрегаты после оценки, не показывая экран
  // «Загрузка...». Иначе каждый drag вайба размонтировал бы панель.
  const loadFilm = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/films/${filmId}`);
      setFilm(response.data);
      if (response.data?.userRating) {
        setUserRating(response.data.userRating);
      } else {
        setUserRating(null);
      }
    } catch (err) {
      console.error('Ошибка загрузки фильма:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filmId]);

  // DECISION: списки фильма листаются сервером (шаг «пагинация»), поэтому
  // хук хранит и накопленные элементы, и pagination. page === 1 заменяет
  // список (первичная загрузка/перезагрузка после действия), следующая
  // страница дописывается в конец.
  const loadFilmUsers = useCallback(async (page = 1) => {
    if (page > 1) setLoadingMore(prev => ({ ...prev, filmUsers: true }));
    try {
      const response = await api.get(`/films/${filmId}/users`, {
        params: { page, limit: 20 }
      });
      const data = response.data || {};
      const items = Array.isArray(data.users) ? data.users : [];
      setFilmUsers(prev => (page === 1 ? items : [...prev, ...items]));
      setFilmUsersPagination(data.pagination || null);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    } finally {
      if (page > 1) setLoadingMore(prev => ({ ...prev, filmUsers: false }));
    }
  }, [filmId]);

  const loadComments = useCallback(async (page = 1) => {
    if (page > 1) setLoadingMore(prev => ({ ...prev, comments: true }));
    try {
      const response = await api.get('/comments', {
        params: { targetType: 'film', targetId: filmId, page, limit: 10 }
      });
      const data = response.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      setComments(prev => (page === 1 ? items : [...prev, ...items]));
      setCommentsPagination(data.pagination || null);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
    } finally {
      if (page > 1) setLoadingMore(prev => ({ ...prev, comments: false }));
    }
  }, [filmId]);

  const loadReviews = useCallback(async (page = 1) => {
    if (page > 1) setLoadingMore(prev => ({ ...prev, reviews: true }));
    try {
      const response = await api.get(`/reviews/${filmId}`, {
        params: { page, limit: 10 }
      });
      const data = response.data || {};
      const items = Array.isArray(data.reviews) ? data.reviews : [];
      setReviews(prev => (page === 1 ? items : [...prev, ...items]));
      setReviewsPagination(data.pagination || null);
    } catch (err) {
      console.error('Ошибка загрузки рецензий:', err);
    } finally {
      if (page > 1) setLoadingMore(prev => ({ ...prev, reviews: false }));
    }
  }, [filmId]);

  const loadMoreFilmUsers = useCallback(() => {
    if (!filmUsersPagination || filmUsersPagination.page >= filmUsersPagination.pages) return;
    return loadFilmUsers(filmUsersPagination.page + 1);
  }, [filmUsersPagination, loadFilmUsers]);

  const loadMoreComments = useCallback(() => {
    if (!commentsPagination || commentsPagination.page >= commentsPagination.pages) return;
    return loadComments(commentsPagination.page + 1);
  }, [commentsPagination, loadComments]);

  const loadMoreReviews = useCallback(() => {
    if (!reviewsPagination || reviewsPagination.page >= reviewsPagination.pages) return;
    return loadReviews(reviewsPagination.page + 1);
  }, [reviewsPagination, loadReviews]);

  const loadCurrentUser = useCallback(async () => {
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
  }, []);

  return {
    film,
    loading,
    userRating,
    setUserRating,
    filmUsers,
    setFilmUsers,
    filmUsersPagination,
    comments,
    setComments,
    commentsPagination,
    reviews,
    setReviews,
    reviewsPagination,
    loadingMore,
    currentUser,
    loadFilm,
    loadFilmUsers,
    loadMoreFilmUsers,
    loadComments,
    loadMoreComments,
    loadReviews,
    loadMoreReviews,
    loadCurrentUser
  };
}

export default useFilmData;
