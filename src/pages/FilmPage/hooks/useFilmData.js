import { useState, useCallback } from 'react';
import api from '../../../api/client';

function useFilmData(filmId) {
  const [film, setFilm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(null);
  const [filmUsers, setFilmUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const loadFilm = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [filmId]);

  const loadFilmUsers = useCallback(async () => {
    try {
      const response = await api.get(`/films/${filmId}/users`);
      setFilmUsers(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    }
  }, [filmId]);

  const loadComments = useCallback(async () => {
    try {
      const response = await api.get(`/comments/${filmId}`);
      setComments(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
    }
  }, [filmId]);

  const loadReviews = useCallback(async () => {
    try {
      const response = await api.get(`/reviews/${filmId}`);
      setReviews(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки рецензий:', err);
    }
  }, [filmId]);

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
  };
}

export default useFilmData;
