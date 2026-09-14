import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Header from '../components/Header';
import ActivityFeed from '../components/ActivityFeed';
import FilmsCatalog from '../components/FilmsCatalog';
import useActivityEvents from '../hooks/useActivityEvents';
import { useNotification } from '../context/NotificationContext';
import { getScoreColor } from '../utils/constants';
import './HomePage.css';

function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [user, setUser] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { events, loading: eventsLoading, addEvent, refresh: refreshEvents } = useActivityEvents();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(err => {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
        }
        console.warn('Не удалось загрузить пользователя:', err?.message || err);
      });
  }, []);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

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
      setSearchError(err.response?.data?.error || 'Не удалось найти фильмы');
      showNotification({
        title: 'Ошибка поиска',
        message: err.response?.data?.error || 'Не удалось найти фильмы',
        type: 'error'
      });
    }
  }, [searchQuery, showNotification]);

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
        setIsImporting(false);
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
        } catch (eventErr) {
          console.warn('Не удалось сохранить событие:', eventErr?.message || eventErr);
        }
      }
      setCatalogRefreshKey(prev => prev + 1);
      showNotification({ title: 'Фильм добавлен!', message: 'Фильм успешно добавлен в каталог', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось добавить фильм', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  }, [isImporting, user, addEvent, navigate, showNotification]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
    showNotification({ title: 'До свидания!', message: 'Вы вышли из аккаунта', type: 'info' });
  }, [navigate, showNotification]);

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

      <ActivityFeed events={events} loading={eventsLoading} />

      <div className="catalog-section">
        <div className="catalog-section-header">
          <h3>🎬 Все фильмы</h3>
          <Link to="/catalog" className="view-all-link">Смотреть весь каталог →</Link>
        </div>
        <FilmsCatalog key={catalogRefreshKey} initialSort="technical" limit={20} showSortTabs={true} />
      </div>
    </div>
  );
}

export default HomePage;
