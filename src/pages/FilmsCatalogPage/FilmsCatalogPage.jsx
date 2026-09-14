// src/components/FilmsCatalog.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getScoreColor } from '../utils/constants';
import './FilmsCatalog.css';

function FilmsCatalog({ 
  initialSort = 'technical', 
  limit = 20, 
  showSortTabs = true 
}) {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortType, setSortType] = useState(initialSort);

  const loadFilms = useCallback(async (pageNum = 1, sort = sortType) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/films?page=${pageNum}&limit=${limit}&sort=${sort}`);
      if (response.data && Array.isArray(response.data.films)) {
        if (pageNum === 1) {
          setFilms(response.data.films);
        } else {
          setFilms(prev => {
            const existingIds = new Set(prev.map(f => f._id));
            const newFilms = response.data.films.filter(f => !existingIds.has(f._id));
            return [...prev, ...newFilms];
          });
        }
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        setFilms([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки фильмов:', err);
      setError('Не удалось загрузить фильмы. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [sortType, limit]);

  // Сбрасываем на 1-ю страницу при смене сортировки
  useEffect(() => {
    setPage(1);
  }, [sortType]);

  useEffect(() => {
    loadFilms(page);
  }, [page, loadFilms]);

  const loadMore = useCallback(() => {
    if (page < totalPages && !loading) {
      setPage(prev => prev + 1);
    }
  }, [page, totalPages, loading]);

  return (
    <div className="films-catalog">
      {showSortTabs && (
        <div className="sort-tabs">
          <div
            className={`sort-tab ${sortType === 'technical' ? 'active' : ''}`}
            onClick={() => setSortType('technical')}
          >
            <span className="tab-icon">⚔️ </span>
            <span className="tab-label">Техническая</span>
          </div>
          <div
            className={`sort-tab ${sortType === 'vibe' ? 'active' : ''}`}
            onClick={() => setSortType('vibe')}
          >
            <span className="tab-icon">🍷 </span>
            <span className="tab-label">Вайб</span>
          </div>
          <div
            className={`sort-tab ${sortType === 'combined' ? 'active' : ''}`}
            onClick={() => setSortType('combined')}
          >
            <span className="tab-icon">🧪 </span>
            <span className="tab-label">Общая</span>
          </div>
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      {loading && page === 1 ? (
        <div className="loading">Загрузка...</div>
      ) : films.length === 0 ? (
        <div className="no-films glass-card">Нет добавленных фильмов.</div>
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
                        <span className="rating-label">⚔️ Тех.:</span>
                        <span className="rating-value" style={{ color: getScoreColor(film.averageRating) }}>
                          {film.averageRating?.toFixed(1) || '—'}
                        </span>
                      </div>
                      <div className="rating-row">
                        <span className="rating-label">🍷 Вайб:</span>
                        <span className="rating-value" style={{ color: getScoreColor(film.averageVibe) }}>
                          {film.averageVibe?.toFixed(1) || '—'}
                        </span>
                      </div>
                      <div className="rating-row">
                        <span className="rating-label">🧪 Общий:</span>
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
              <button onClick={loadMore} className="load-more-btn" disabled={loading}>
                {loading ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
              <span className="page-info">{page} / {totalPages}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FilmsCatalog;
