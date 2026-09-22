import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { getUserIdByNickname, getUserProfileById } from '../api/critics';
import { CRITIC_NICKNAME, TOP_FILM_TITLES, CRITIC_REVIEWS } from '../utils/mockCriticData';

export default function useCriticData() { 
  const [critic, setCritic] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [topMovies, setTopMovies] = useState([]);
  const [reviewPosters, setReviewPosters] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. _id по нику
      const { data: basic } = await getUserIdByNickname(CRITIC_NICKNAME);

      // 2. Полный профиль
      const { data: profile } = await getUserProfileById(basic._id);

      setCritic(profile.user);
      setRatings(profile.ratings || []);

      // 3. Топ-5 по названию
      const byTitle = new Map();
      (profile.ratings || []).forEach(r => {
        const title = r.film?.title;
        if (title) byTitle.set(title, r);
      });
      const top = TOP_FILM_TITLES.map(t => byTitle.get(t)).filter(Boolean);
      setTopMovies(top);

      // 4. Постеры для рецензий — параллельно
      const posterMap = {};
      await Promise.all(
        CRITIC_REVIEWS.map(async (rev) => {
          if (!rev.filmId) return;
          try {
            const { data: film } = await api.get(`/films/${rev.filmId}`);
            if (film?.poster) posterMap[rev.filmId] = film.poster;
          } catch (e) {
            /* игнор */
          }
        })
      );
      setReviewPosters(posterMap);
    } catch (err) {
      console.error('Ошибка загрузки критика:', err);
      setError(err.response?.data?.error || 'Не удалось загрузить данные критика');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { critic, ratings, topMovies, reviewPosters, loading, error };
}
