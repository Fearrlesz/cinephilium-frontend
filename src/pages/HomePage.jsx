import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Header from '../components/Header';
import ActivityFeed from '../components/ActivityFeed';
import useActivityEvents from '../hooks/useActivityEvents';
import { useNotification } from '../context/NotificationContext';
import { getScoreColor } from '../utils/constants';
import './HomePage.css';

const FILMS_PER_PAGE = 20;
const POLLING_INTERVAL = 60000; // мс; поставьте 0, чтобы отключить автообновление

function HomePage() {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);        // полная перезагрузка (первая страница)
  const [loadingMore, setLoadingMore] = useState(false); // догрузка следующей страницы
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortType, setSortType] = useState('technical');
  const [user, setUser] = useState(null);

  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { events, loading: eventsLoading, addEvent, refresh: refreshEvents } = useActivityEvents();

  // Защита от гонок: устаревшие ответы не перезаписывают свежие
  const requestIdRef = useRef(0);

  /* ---------------- Пользователь ---------------- */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(err => {
        if (err.response?.status === 401) localStorage.removeItem('token');
        console.warn('Не удалось загрузить пользователя:', err?.message || err);
      });
  }, []);

  /* ---------------- Загрузка фильмов ---------------- */
  // Полностью явная функция: все параметры передаются снаружи
  const loadFilms = useCallback(async (pageNum, sort, { append = false } = {}) => {
    const reqId = ++requestIdRef.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');

    try {
      const response = await api.get('/films', {
        params: { page: pageNum, limit: FILMS_PER_PAGE, sort }
      });

      // Пока ждали — пришёл более новый запрос, этот ответ устарел
      if (reqId !== requestIdRef.current) return;

      const data = response.data;
      const list = Array.isArray(data?.films) ? data.films : [];

      if (append) {
        setFilms(prev => {
          const existingIds = new Set(prev.map(f => f._id));
          return [...prev, ...list.filter(f => !existingIds.has(f._id))];
        });
      } else {
        setFilms(list);
      }

      setTotalPages(data?.pagination?.pages || 1);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      console.error('Ошибка загрузки фильмов:', err);
      setError('Не удалось загрузить фильмы. Попробуйте позже.');
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []); // <- больше никаких зависимостей

  // Первичная загрузка + перезагрузка при смене сортировки
  useEffect(() => {
    setPage(1);
    loadFilms(1, sortType, { append: false });
  }, [sortType, loadFilms]);

  /* ---------------- Лента активностей ---------------- */
  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  /* ---------------- Polling первой страницы ---------------- */
  useEffect(() => {
    if (!POLLING_INTERVAL) return;
    const id = setInterval(() => {
      if (isImporting) return;                          // не мешаем ручному импорту
      if (document.hidden) return;                      // не грузим во фоне
      loadFilms(1, sortType, { append: false });
    }, POLLING_INTERVAL);
    return () => clearInterval(id);
  }, [loadFilms, sortType, isImporting]);

  /* ---------------- Пагинация ---------------- */
  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    if (page >= totalPages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadFilms(nextPage, sortType, { append: true });
  }, [page, totalPages, sortType, loading, loadingMore, loadFilms]);

  /* ---------------- Смена сортировки ---------------- */
  const handleSortChange = useCallback((type) => {
    if (type === sortType) return;
    setSortType(type); // useEffect выше сам сбросит page и перезагрузит
  }, [sortType]);

  /* ---------------- Поиск ---------------- */
  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchError('Введите название фильма');
      return;
    }
    setSearchError('');
    setShowSearch(false);
    try {
      const response = await api.get('/tmdb/search', { params: { query } });
      setSearchResults(response.data.results || []);
      setShowSearch(true);
    } catch (err) {
      console.error('Ошибка поиска:', err);
      const msg = err.response?.data?.error || 'Не удалось найти фильмы';
      setSearchError(msg);
      showNotification({ title: 'Ошибка поиска', message: msg, type: 'error' });
    }
  }, [searchQuery, showNotification]);

  /* ---------------- Импорт фильма ---------------- */
  const importFilm = useCallback(async (tmdbId, filmTitle) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({
        title: 'Доступ запрещён',
        message: 'Войдите в систему, чтобы добавлять фильмы',
        type: 'warning'
      });
      navigate('/login');
      return;
    }
    if (isImporting) return;
    setIsImporting(true);

    try {
      const response = await api.post('/films/import', { tmdbId });

      if (response.data.alreadyExists) {
        showNotification({
          title: 'Уже в каталоге',
          message: `Фильм "${response.data.film.title}" уже есть. Переход...`,
          type: 'info'
        });
        setTimeout(() => navigate(`/film/${response.data.film._id}`), 1000);
        return;
      }

      // Закрываем поиск
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);

      // Лента активностей
      if (user) {
        try {
          await addEvent({
            type: 'film_add',
            user: user.nickname,
            film: filmTitle || 'Новый фильм',
            filmId: response.data.film._id
          });
        } catch (eventErr) {
          console.warn('Не удалось сохранить событие:', eventErr?.message || eventErr);
        }
      }

      // === ГЛАВНЫЙ ФИКС ===
      // Сбрасываем страницу И принудительно перезагружаем список,
      // потому что setPage(1) на первой странице не даёт никакого эффекта.
      setPage(1);
      await loadFilms(1, sortType, { append: false });
      await refreshEvents(); // лента тоже обновляется сразу

      showNotification({
        title: 'Фильм добавлен!',
        message: 'Фильм успешно добавлен в каталог',
        type: 'success'
      });
    } catch (err) {
      showNotification({
        title: 'Ошибка',
        message: err.response?.data?.error || 'Не удалось добавить фильм',
        type: 'error'
      });
    } finally {
      setIsImporting(false);
    }
  }, [
    isImporting, user, addEvent, refreshEvents,
    navigate, showNotification, loadFilms, sortType
  ]);

  /* ---------------- Выход ---------------- */
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
    showNotification({ title: 'До свидания!', message: 'Вы вышли из аккаунта', type: 'info' });
  }, [navigate, showNotification]);

  /* ---------------- Рендер ---------------- */
  if (loading && films.length === 0) {
    return <div className="loading">Загрузка...</div>;
  }

  const topFilms = [...films]
    .filter(f => f.averageRating > 0)
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 5);

  return (
    <div className="container">
      <Header user={user} onLogout={handleLogout} />

      <div className="hero glass-card">
        <h2>Храм честного кино — 15 критериев для подробной оценки</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Найти фильм в TMDB..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchError(''); }}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>🔍 Найти</button>
        </div>
        {searchError && <div className="error-msg">{searchError}</div>}
      </div>

      <div className="sort-tabs">
        <div
          className={`sort-tab ${sortType === 'technical' ? 'active' : ''}`}
          onClick={() => handleSortChange('technical')}
        >
          <span className="tab-icon">🎯</span>
          <span className="tab-label">Техническая</span>
        </div>
        <div
          className={`sort-tab ${sortType === 'vibe' ? 'active' : ''}`}
          onClick={() => handleSortChange('vibe')}
        >
          <span className="tab-icon">💫</span>
          <span className="tab-label">Вайб</span>
        </div>
        <div
          className={`sort-tab ${sortType === 'combined' ? 'active' : ''}`}
          onClick={() => handleSortChange('combined')}
        >
          <span className="tab-icon">⭐</span>
          <span className="tab-label">Общая</span>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {showSearch && searchResults.length > 0 && (
        <div className="search-results glass-card">
          <h3>Результаты поиска:</h3>
          <div className="films-grid">
            {searchResults.map((film) => (
              <div key={film.id} className="film-card">
                <img
                  src={film.poster_path
                    ? `https://image.tmdb.org/t/p/w200${film.poster_path}`
                    : '/no-poster.jpg'}
                  alt={film.title}
                />
                <div className="film-info">
                  <h4>{film.title}</h4>
                  <p>{film.release_date?.split('-')[0] || 'N/A'}</p>
                  <button
                    onClick={() => importFilm(film.id, film.title)}
                    disabled={isImporting}
                    className="btn-add"
                  >
                    {isImporting ? 'Добавление...' : '➕ Добавить'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topFilms.length > 0 && (
        <div className="top-films-netflix">
          <div className="top-header-netflix">
            <h3>🏆 Топ-5 сообщества</h3>
          </div>
          <div className="top-scroll-container">
            <div className="top-scroll-wrapper">
              {topFilms.map((film, i) => (
                <Link to={`/film/${film._id}`} key={film._id} className="top-card-netflix">
                  <div className="top-card-poster-wrapper">
                    <img src={film.poster || '/no-poster.jpg'} alt={film.title} className="top-card-poster" />
                    <div className="top-card-rank">
                      {i === 0 && '👑'}
                      {i === 1 && '🥇'}
                      {i === 2 && '🥈'}
                      {i === 3 && '🥉'}
                      {i >= 4 && `#${i + 1}`}
                    </div>
                    <div className="top-card-score" style={{ color: getScoreColor(film.averageRating) }}>
                      {film.averageRating?.toFixed(1)}
                    </div>
                  </div>
                  <div className="top-card-info">
                    <span className="top-card-title">{film.title}</span>
                    <span className="top-card-year">{film.year}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <ActivityFeed events={events} loading={eventsLoading} />

      {films.length === 0 && !loading ? (
        <div className="no-films glass-card">
          Нет добавленных фильмов. Найдите и добавьте первый!
        </div>
      ) : (
        <>
          <div className="films-grid">
            {films.map((film) => (
              <Link to={`/film/${film._id}`} key={film._id} className="film-card-link">
                <div className="film-card">
                  <img src={film.poster || '/no-poster.jpg'} alt={film.title} />
                  <div className="film-info">
                    <h3>{film.title}</h3>
                    <p>{film.year}</p>
                    <div className="film-ratings">
                      <div className="rating-row">
                        <span className="rating-label">🎯 Тех.:</span>
                        <span className="rating-value" style={{ color: getScoreColor(film.averageRating) }}>
                          {film.averageRating?.toFixed(1) || '—'}
                        </span>
                      </div>
                      <div className="rating-row">
                        <span className="rating-label">💫 Вайб:</span>
                        <span className="rating-value" style={{ color: getScoreColor(film.averageVibe) }}>
                          {film.averageVibe?.toFixed(1) || '—'}
                        </span>
                      </div>
                      <div className="rating-row">
                        <span className="rating-label">⭐ Общий:</span>
                        <span className="rating-value" style={{ color: getScoreColor(film.averageCombined) }}>
                          {film.averageCombined?.toFixed(1) || '—'}
                        </span>
                      </div>
                    </div>
                    <span className="votes-count">👥 {film.votesCount || 0} оценок</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {page < totalPages && (
            <div className="load-more">
              <button
                onClick={loadMore}
                className="load-more-btn"
                disabled={loadingMore}
              >
                {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
              <span className="page-info">{page} / {totalPages}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HomePage;
