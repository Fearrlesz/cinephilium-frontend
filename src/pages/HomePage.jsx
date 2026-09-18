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

function HomePage() {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);          // первая загрузка
  const [loadingMore, setLoadingMore] = useState(false); // догрузка
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortType, setSortType] = useState('technical');
  const [user, setUser] = useState(null);
  const [topFilms, setTopFilms] = useState([]);

  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { events, loading: eventsLoading, addEvent, refresh: refreshEvents } = useActivityEvents();

  // Защита только от гонок ПОЛНОЙ перезагрузки (смена сортировки / импорт).
  // Догрузка страниц использует отдельный флаг loadingMore и не бампает этот счётчик.
  const resetReqIdRef = useRef(0);
  const loadingMoreRef = useRef(false);   // синхронный флаг (state асинхронный)

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

  /* ---------------- Загрузка первой страницы (reset) ---------------- */
  const reloadFromStart = useCallback(async (sort) => {
    const reqId = ++resetReqIdRef.current;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/films', {
        params: { page: 1, limit: FILMS_PER_PAGE, sort }
      });
      if (reqId !== resetReqIdRef.current) return;   // устарел

      const list = Array.isArray(data?.films) ? data.films : [];
      setFilms(list);
      setPage(1);
      setTotalPages(data?.pagination?.pages || 1);
      setTotalCount(data?.pagination?.total ?? list.length);
    } catch (err) {
      if (reqId !== resetReqIdRef.current) return;
      console.error('Ошибка загрузки фильмов:', err);
      setError('Не удалось загрузить фильмы. Попробуйте позже.');
    } finally {
      if (reqId === resetReqIdRef.current) setLoading(false);
    }
  }, []);

    /* ---------------- Загрузка топа (независимо от пагинации) ---------------- */
  const loadTopFilms = useCallback(async (sort) => {
    try {
      const { data } = await api.get('/films/top', {
        params: { sort, limit: 5 }
      });
      setTopFilms(Array.isArray(data?.films) ? data.films : []);
    } catch (err) {
      console.error('Ошибка загрузки топа:', err);
      setTopFilms([]);
    }
  }, []);

  /* ---------------- Догрузка следующей страницы (append) ---------------- */
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (loading) return;
    if (films.length >= totalCount) return;   // всё реально загружено

    // Запоминаем «поколение» загрузки. Если за время запроса случится
    // полная перезагрузка (смена сортировки / импорт) — resetReqIdRef
    // увеличится, и мы отбросим устаревший ответ.
    const reqIdAtStart = resetReqIdRef.current;

    const nextPage = page + 1;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const { data } = await api.get('/films', {
        params: { page: nextPage, limit: FILMS_PER_PAGE, sort: sortType }
      });

      // Проверяем, что за время запроса не было reset.
      if (reqIdAtStart !== resetReqIdRef.current) return;

      const list = Array.isArray(data?.films) ? data.films : [];

      // Бэк больше ничего не отдаёт — значит реально всё, что можно было, загружено.
      // Синхронизируем totalCount с фактическим количеством, чтобы кнопка исчезла.
            if (list.length === 0) {
        // Бэк больше ничего не отдаёт — фиксируем фактический total,
        // чтобы кнопка «Загрузить ещё» исчезла.
        setTotalCount(films.length);
        return;
      }

      setFilms(prev => {
        const seen = new Set(prev.map(f => f._id));
        return [...prev, ...list.filter(f => !seen.has(f._id))];
      });
      setPage(nextPage);
      if (data?.pagination?.pages) setTotalPages(data.pagination.pages);
      if (typeof data?.pagination?.total === 'number') setTotalCount(data.pagination.total);
    } catch (err) {
      if (reqIdAtStart !== resetReqIdRef.current) return;
      console.error('Ошибка догрузки страницы:', err);
      setError('Не удалось загрузить ещё фильмы. Попробуйте позже.');
    } finally {
      // Флаг сбрасываем всегда — иначе после reset «залипнем» навсегда.
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [page, totalCount, sortType, loading, films.length]);

  /* ---------------- Первичная загрузка + смена сортировки ---------------- */
   useEffect(() => {
    reloadFromStart(sortType);
    loadTopFilms(sortType);
  }, [sortType, reloadFromStart, loadTopFilms]); 

  /* ---------------- Лента активностей ---------------- */
  useEffect(() => { refreshEvents(); }, [refreshEvents]);

  /* ---------------- Смена сортировки ---------------- */
  const handleSortChange = useCallback((type) => {
    if (type === sortType) return;
    setSortType(type);   // useEffect выше перезагрузит
  }, [sortType]);

  /* ---------------- Поиск ---------------- */
  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) { setSearchError('Введите название фильма'); return; }
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

  /* ---------------- Импорт ---------------- */
  const importFilm = useCallback(async (tmdbId, filmTitle) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы добавлять фильмы', type: 'warning' });
      navigate('/login');
      return;
    }
    if (isImporting) return;
    setIsImporting(true);
    try {
      const response = await api.post('/films/import', { tmdbId });

      if (response.data.alreadyExists) {
        showNotification({ title: 'Уже в каталоге', message: `Фильм "${response.data.film.title}" уже есть. Переход...`, type: 'info' });
        setTimeout(() => navigate(`/film/${response.data.film._id}`), 1000);
        return;
      }

      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);

      if (user) {
        try {
          await addEvent({
            type: 'film_add',
            user: user.nickname,
            film: filmTitle || 'Новый фильм',
            filmId: response.data.film._id
          });
        } catch (e) { console.warn('event:', e); }
      }

      await reloadFromStart(sortType);
      await loadTopFilms(sortType);
      await refreshEvents();

      showNotification({ title: 'Фильм добавлен!', message: 'Фильм успешно добавлен в каталог', type: 'success' });
    } catch (err) {
      showNotification({
        title: 'Ошибка',
        message: err.response?.data?.error || 'Не удалось добавить фильм',
        type: 'error'
      });
    } finally {
      setIsImporting(false);
    }
   }, [isImporting, user, addEvent, refreshEvents, navigate, showNotification,
      reloadFromStart, loadTopFilms, sortType]); 

  /* ---------------- Выход ---------------- */
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
    showNotification({ title: 'До свидания!', message: 'Вы вышли из аккаунта', type: 'info' });
  }, [navigate, showNotification]);

  /* ---------------- Рендер ---------------- */
  if (loading && films.length === 0) return <div className="loading">Загрузка...</div>;

  

  // Считаем по количеству, а не по номерам страниц: из-за нестабильной
  // сортировки на бэке часть фильмов теряется/дублируется, поэтому
  // page === totalPages ещё не значит, что всё загружено.
  const hasMore = films.length < totalCount; 
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
        <div className={`sort-tab ${sortType === 'technical' ? 'active' : ''}`} onClick={() => handleSortChange('technical')}>
          <span className="tab-icon">🎯</span><span className="tab-label">Техническая</span>
        </div>
        <div className={`sort-tab ${sortType === 'vibe' ? 'active' : ''}`} onClick={() => handleSortChange('vibe')}>
          <span className="tab-icon">💫</span><span className="tab-label">Вайб</span>
        </div>
        <div className={`sort-tab ${sortType === 'combined' ? 'active' : ''}`} onClick={() => handleSortChange('combined')}>
          <span className="tab-icon">⭐</span><span className="tab-label">Общая</span>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {showSearch && searchResults.length > 0 && (
        <div className="search-results glass-card">
          <h3>Результаты поиска:</h3>
          <div className="films-grid">
            {searchResults.map((film) => (
              <div key={film.id} className="film-card">
                <img src={film.poster_path ? `https://image.tmdb.org/t/p/w200${film.poster_path}` : '/no-poster.jpg'} alt={film.title} />
                <div className="film-info">
                  <h4>{film.title}</h4>
                  <p>{film.release_date?.split('-')[0] || 'N/A'}</p>
                  <button onClick={() => importFilm(film.id, film.title)} disabled={isImporting} className="btn-add">
                    {isImporting ? 'Добавление...' : '➕ Добавить'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


                   {topFilms.map((film, i) => {
                const value =
                  sortType === 'vibe'     ? film.averageVibe :
                  sortType === 'combined' ? film.averageCombined :
                                            film.averageRating;
                return (
                  <Link to={`/film/${film._id}`} key={film._id} className="top-card-netflix">
                    <div className="top-card-poster-wrapper">
                      <img src={film.poster || '/no-poster.jpg'} alt={film.title} className="top-card-poster" />
                      <div className="top-card-rank">
                        {i === 0 && '👑'}{i === 1 && '🥇'}{i === 2 && '🥈'}{i === 3 && '🥉'}{i >= 4 && `#${i + 1}`}
                      </div>
                      <div className="top-card-score" style={{ color: getScoreColor(value) }}>
                        {Number.isFinite(value) ? value.toFixed(1) : '—'}
                      </div>
                    </div>
                    <div className="top-card-info">
                      <span className="top-card-title">{film.title}</span>
                      <span className="top-card-year">{film.year}</span>
                    </div>
                  </Link>
                );
              })} 

      

      <ActivityFeed events={events} loading={eventsLoading} />

      {films.length === 0 && !loading ? (
        <div className="no-films glass-card">Нет добавленных фильмов. Найдите и добавьте первый!</div>
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

          <div className="load-more">
            {hasMore ? (
              <button onClick={loadMore} className="load-more-btn" disabled={loadingMore}>
                {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
            ) : (
              <span className="load-more-end">— Это все фильмы ({films.length}) —</span>
            )}
            <span className="page-info">Показано {films.length} из {totalCount}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default HomePage;
