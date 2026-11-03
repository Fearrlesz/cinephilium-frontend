import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import ActivityFeed from '../../components/ActivityFeed/ActivityFeed';
import useActivityEvents from '../../hooks/useActivityEvents';
import { getPosterUrl, handleImgError } from '../../utils/posterUrl';
import './HomePage.css';

const SORTS = [
  { value: 'technical', label: 'Техническая' },
  { value: 'vibe', label: 'Вайб' },
  { value: 'combined', label: 'Общая' }
];

function HomePage() {
  const [sortType, setSortType] = useState('technical');
  const [topFilms, setTopFilms] = useState([]);
  const [topLoading, setTopLoading] = useState(true);
  const [newFilms, setNewFilms] = useState([]);
  const [newLoading, setNewLoading] = useState(true);
  const [heroQuery, setHeroQuery] = useState('');
  const { events, loading: eventsLoading } = useActivityEvents();
  const navigate = useNavigate();

  const loadTopFilms = useCallback(async (sort) => {
    setTopLoading(true);
    try {
      const { data } = await api.get('/films/top', { params: { sort, limit: 5 } });
      setTopFilms(Array.isArray(data?.films) ? data.films : []);
    } catch (err) {
      console.error('Ошибка загрузки топа:', err);
      setTopFilms([]);
    } finally {
      setTopLoading(false);
    }
  }, []);

  useEffect(() => { loadTopFilms(sortType); }, [loadTopFilms, sortType]);

  useEffect(() => {
    let alive = true;
    api.get('/films', { params: { sort: 'new', limit: 10 } })
      .then(({ data }) => {
        if (alive) setNewFilms(Array.isArray(data?.films) ? data.films : []);
      })
      .catch(err => {
        console.error('Ошибка загрузки новинок:', err);
        if (alive) setNewFilms([]);
      })
      .finally(() => { if (alive) setNewLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleHeroSearch = (event) => {
    event.preventDefault();
    const query = heroQuery.trim();
    const suffix = query ? `?q=${encodeURIComponent(query)}&focus=search` : '?focus=search';
    navigate(`/catalog${suffix}`);
  };

  const topScore = (film) => (
    sortType === 'vibe' ? film.averageVibe
      : sortType === 'combined' ? film.averageCombined
        : film.averageTechnical
  );

  return (
    <div className="container home-page">
      <section className="home-hero">
        <p className="home-kicker">Теперь уже точно</p>
        <h1 className="home-title">Храм честного кино</h1>
        <p className="home-lead">
          15 критериев вместо одной цифры. Технический балл, вайб и общая оценка.
          Больше никаких безосновательных оценок. Все критерии прозрачны.
        </p>
        <form className="home-search" onSubmit={handleHeroSearch}>
          <input
            type="search"
            value={heroQuery}
            onChange={(event) => setHeroQuery(event.target.value)}
            placeholder="Найти фильм в каталоге"
            aria-label="Найти фильм в каталоге"
          />
          <button type="submit">Найти</button>
        </form>
        <div className="home-hero-links">
          <Link to="/catalog">Весь каталог</Link>
          <Link to="/about">Как считается оценка</Link>
        </div>
      </section>

      <div className="home-sort" role="tablist" aria-label="Ось топа">
        {SORTS.map(item => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={sortType === item.value}
            className={`home-sort-tab${sortType === item.value ? ' is-active' : ''}`}
            onClick={() => setSortType(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="home-section">
        <div className="home-section-head">
          <h2 className="home-section-title">Топ-5</h2>
          <span className="home-section-meta">по оценкам сообщества</span>
        </div>

        {topLoading ? (
          <div className="home-placeholder">Загрузка топа…</div>
        ) : topFilms.length === 0 ? (
          <div className="home-placeholder">Пока нет оценённых фильмов.</div>
        ) : (
          <div className="home-top-grid">
            {topFilms.map((film, index) => {
              const value = topScore(film);
              return (
                <Link to={`/film/${film._id}`} key={film._id} className="home-top-card">
                  <div className="home-top-poster">
                    <span className="home-top-rank">{String(index + 1).padStart(2, '0')}</span>
                    <img src={getPosterUrl(film.poster)} alt={film.title} onError={handleImgError} />
                    <span className={`home-top-score${Number.isFinite(value) ? '' : ' is-empty'}`}>
                      {Number.isFinite(value) ? value.toFixed(1) : '—'}
                    </span>
                  </div>
                  <span className="home-top-title">{film.title}</span>
                  <span className="home-top-year">{film.year || '—'}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-head">
          <h2 className="home-section-title">Новые в каталоге</h2>
          <Link to="/catalog" className="home-section-link">Весь каталог →</Link>
        </div>

        {newLoading ? (
          <div className="home-placeholder">Загрузка каталога…</div>
        ) : newFilms.length === 0 ? (
          <div className="home-placeholder">
            В каталоге пока нет фильмов. <Link to="/catalog">Добавить первый</Link>
          </div>
        ) : (
          <div className="home-new-grid">
            {newFilms.map(film => (
              <Link to={`/film/${film._id}`} key={film._id} className="home-new-card">
                <div className="home-new-poster">
                  <img src={getPosterUrl(film.poster)} alt={film.title} loading="lazy" onError={handleImgError} />
                </div>
                <span className="home-new-title">{film.title}</span>
                <span className="home-new-year">{film.year || '—'}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <ActivityFeed events={events} loading={eventsLoading} />
    </div>
  );
}

export default HomePage;
