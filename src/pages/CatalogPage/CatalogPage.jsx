import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import { getPosterUrl, handleImgError } from '../../utils/posterUrl';
import './CatalogPage.css';

const PAGE_SIZE = 20;
const SORTS = [
  { value: 'technical', label: 'Техническая' },
  { value: 'vibe', label: 'Вайб' },
  { value: 'combined', label: 'Общая' },
  { value: 'new', label: 'Новые' },
  { value: 'title', label: 'По алфавиту' }
];

function mergeFilms(prev, next) {
  const seen = new Set(prev.map(film => film._id));
  return [...prev, ...next.filter(film => !seen.has(film._id))];
}

function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const q = params.get('q') || '';
  const genre = params.get('genre') || '';
  const yearFrom = params.get('yearFrom') || '';
  const yearTo = params.get('yearTo') || '';
  const rated = params.get('rated') || '';
  const sort = params.get('sort') || 'technical';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);

  const [films, setFilms] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [facets, setFacets] = useState({ genres: [], years: { min: null, max: null } });

  const [queryDraft, setQueryDraft] = useState(q);
  const [yearFromDraft, setYearFromDraft] = useState(yearFrom);
  const [yearToDraft, setYearToDraft] = useState(yearTo);
  const inputRef = useRef(null);
  const loadedPageRef = useRef(0);
  const aliveRef = useRef(true);

  const filterKey = useMemo(
    () => [q, genre, yearFrom, yearTo, rated, sort].join('|'),
    [q, genre, yearFrom, yearTo, rated, sort]
  );

  const baseParams = useMemo(() => {
    const next = { limit: PAGE_SIZE, sort };
    if (q) next.q = q;
    if (genre) next.genre = genre;
    if (yearFrom) next.yearFrom = yearFrom;
    if (yearTo) next.yearTo = yearTo;
    if (rated) next.rated = rated;
    return next;
  }, [q, genre, yearFrom, yearTo, rated, sort]);

  useEffect(() => {
    aliveRef.current = true;
    api.get('/films/facets')
      .then(res => { if (aliveRef.current) setFacets(res.data || { genres: [], years: {} }); })
      .catch(() => {});
    return () => { aliveRef.current = false; };
  }, []);

  useEffect(() => { setQueryDraft(q); }, [q]);
  useEffect(() => { setYearFromDraft(yearFrom); }, [yearFrom]);
  useEffect(() => { setYearToDraft(yearTo); }, [yearTo]);

  useEffect(() => {
    if (params.get('focus') === 'search') inputRef.current?.focus();
  }, [params]);

  // DECISION: страница грузит все страницы до page, чтобы ссылка ?page=2
  // открывалась с той же выдачей, что и после «Загрузить ещё».
  useEffect(() => {
    if (page > 1 && loadedPageRef.current === page) return;
    let alive = true;
    setLoading(true);
    setError('');

    const load = async () => {
      try {
        const first = await api.get('/films', { params: { ...baseParams, page: 1 } });
        if (!alive) return;
        let list = Array.isArray(first.data?.films) ? first.data.films : [];
        let pagination = first.data?.pagination;

        for (let p = 2; p <= page; p += 1) {
          const next = await api.get('/films', { params: { ...baseParams, page: p } });
          if (!alive) return;
          list = mergeFilms(list, Array.isArray(next.data?.films) ? next.data.films : []);
          pagination = next.data?.pagination || pagination;
        }

        setFilms(list);
        setTotal(pagination?.total ?? list.length);
        loadedPageRef.current = page;
      } catch (err) {
        if (!alive) return;
        console.error('Ошибка каталога:', err);
        setError('Не удалось загрузить каталог. Попробуйте позже. Сорян...');
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => { alive = false; };
  }, [filterKey, page, baseParams]);

  const updateParam = useCallback((name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('page');
    next.delete('focus');
    setParams(next);
  }, [params, setParams]);

  const applySearch = (event) => {
    event.preventDefault();
    updateParam('q', queryDraft.trim());
  };

  const applyYear = (name, value) => {
    const digits = String(value).replace(/\D/g, '').slice(0, 4);
    updateParam(name, digits.length === 4 ? digits : '');
  };

  const resetFilters = () => setParams(new URLSearchParams());

  const loadMore = async () => {
    if (loadingMore || loading || films.length >= total) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const { data } = await api.get('/films', { params: { ...baseParams, page: nextPage } });
      setFilms(prev => mergeFilms(prev, Array.isArray(data?.films) ? data.films : []));
      setTotal(data?.pagination?.total ?? total);
      loadedPageRef.current = nextPage;
      const next = new URLSearchParams(params);
      next.set('page', String(nextPage));
      setParams(next);
    } catch (err) {
      console.error('Ошибка догрузки каталога:', err);
      setError('Не удалось загрузить ещё. Попробуйте позже. Упс...');
    } finally {
      setLoadingMore(false);
    }
  };

  const chips = [];
  if (q) chips.push({ key: 'q', label: `Поиск: ${q}` });
  if (genre) chips.push({ key: 'genre', label: genre });
  if (yearFrom || yearTo) chips.push({ key: 'years', label: `${yearFrom || '…'}–${yearTo || '…'}` });
  if (rated) chips.push({ key: 'rated', label: rated === '1' ? 'С оценками' : 'Без оценок' });

  const removeChip = (key) => {
    const next = new URLSearchParams(params);
    if (key === 'years') {
      next.delete('yearFrom');
      next.delete('yearTo');
    } else {
      next.delete(key);
    }
    next.delete('page');
    next.delete('focus');
    setParams(next);
  };

  const [addOpen, setAddOpen] = useState(false);
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [importingId, setImportingId] = useState(null);
  const [tmdbError, setTmdbError] = useState('');

  useEffect(() => {
    if (!addOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setAddOpen(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [addOpen]);

  const openAdd = () => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    setTmdbError('');
    setAddOpen(true);
  };

  const searchTmdb = async (event) => {
    event.preventDefault();
    const query = tmdbQuery.trim();
    if (!query) { setTmdbError('Введите название фильма'); return; }
    setTmdbLoading(true);
    setTmdbError('');
    try {
      const { data } = await api.get('/tmdb/search', { params: { query } });
      setTmdbResults(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      setTmdbError(err.response?.data?.error || 'Не удалось найти фильмы. Похоже, такого в каталоге нет! Может, пополните его?)');
    } finally {
      setTmdbLoading(false);
    }
  };

  const importTmdb = async (tmdbId) => {
    if (importingId) return;
    setImportingId(tmdbId);
    setTmdbError('');
    try {
      const { data } = await api.post('/films/import', { tmdbId });
      navigate(`/film/${data.film._id}`);
    } catch (err) {
      setTmdbError(err.response?.data?.error || 'Не удалось добавить фильм');
      setImportingId(null);
    }
  };

  const scoreField = sort === 'vibe' ? 'averageVibe' : sort === 'combined' ? 'averageCombined' : 'averageTechnical';
  const hasFilters = Boolean(q || genre || yearFrom || yearTo || rated);

  return (
    <div className="container catalog-page">
      <header className="catalog-head">
        <p className="catalog-kicker">Каталог</p>
        <div className="catalog-title-row">
          <h1 className="catalog-title">Все фильмы</h1>
          <span className="catalog-total">{total}</span>
        </div>
      </header>

      <div className="catalog-search-row">
        <form className="catalog-search" onSubmit={applySearch}>
          <input
            ref={inputRef}
            className="catalog-input"
            type="search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Поиск по каталогу"
            aria-label="Поиск по каталогу"
          />
          <button type="submit" className="btn-primary catalog-search-btn">Найти</button>
        </form>
        <button type="button" className="btn-ghost catalog-add-btn" onClick={openAdd}>
          Добавить фильм
        </button>
      </div>

      <div className="catalog-filters" aria-label="Фильтры каталога">
        <label className="catalog-field">
          <span className="catalog-label">Жанр</span>
          <select
            className="catalog-select"
            value={genre}
            onChange={(event) => updateParam('genre', event.target.value)}
          >
            <option value="">Все жанры</option>
            {facets.genres.map(item => (
              <option key={item.value} value={item.value}>{item.value}</option>
            ))}
          </select>
        </label>

        <label className="catalog-field catalog-field--years">
          <span className="catalog-label">Год</span>
          <span className="catalog-years">
            <input
              className="catalog-input catalog-input--year"
              inputMode="numeric"
              value={yearFromDraft}
              onChange={(event) => setYearFromDraft(event.target.value)}
              onBlur={() => applyYear('yearFrom', yearFromDraft)}
              onKeyDown={(event) => { if (event.key === 'Enter') applyYear('yearFrom', yearFromDraft); }}
              placeholder={facets.years.min || 'от'}
              aria-label="Год от"
            />
            <span className="catalog-dash">—</span>
            <input
              className="catalog-input catalog-input--year"
              inputMode="numeric"
              value={yearToDraft}
              onChange={(event) => setYearToDraft(event.target.value)}
              onBlur={() => applyYear('yearTo', yearToDraft)}
              onKeyDown={(event) => { if (event.key === 'Enter') applyYear('yearTo', yearToDraft); }}
              placeholder={facets.years.max || 'до'}
              aria-label="Год до"
            />
          </span>
        </label>

        <label className="catalog-field">
          <span className="catalog-label">Оценки</span>
          <select
            className="catalog-select"
            value={rated}
            onChange={(event) => updateParam('rated', event.target.value)}
          >
            <option value="">Все фильмы</option>
            <option value="1">С оценками</option>
            <option value="0">Без оценок</option>
          </select>
        </label>

        <label className="catalog-field">
          <span className="catalog-label">Сортировка</span>
          <select
            className="catalog-select"
            value={sort}
            onChange={(event) => updateParam('sort', event.target.value)}
          >
            {SORTS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>

        {hasFilters && (
          <button type="button" className="catalog-reset" onClick={resetFilters}>
            Сбросить
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="catalog-chips">
          {chips.map(chip => (
            <button key={chip.key} type="button" className="catalog-chip" onClick={() => removeChip(chip.key)}>
              {chip.label}<span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {error && <div className="catalog-error">{error}</div>}

      {loading ? (
        <div className="catalog-loading">Загрузка каталога…</div>
      ) : films.length === 0 ? (
        <div className="catalog-empty">
          <p>Ничего не найдено.</p>
          {hasFilters ? (
            <button type="button" className="btn-ghost" onClick={resetFilters}>Сбросить фильтры</button>
          ) : (
            <button type="button" className="btn-ghost" onClick={openAdd}>Добавить фильм</button>
          )}
        </div>
      ) : (
        <>
          <div className="catalog-grid">
            {films.map(film => {
              const score = film[scoreField];
              return (
                <Link to={`/film/${film._id}`} key={film._id} className="catalog-card">
                  <div className="catalog-poster">
                    <img src={getPosterUrl(film.poster)} alt={film.title} loading="lazy" onError={handleImgError} />
                  </div>
                  <div className="catalog-card-title">{film.title}</div>
                  <div className="catalog-card-meta">
                    <span>{film.year || '—'}</span>
                    <span className={`catalog-card-score${Number.isFinite(score) ? '' : ' is-empty'}`}>
                      {Number.isFinite(score) ? score.toFixed(1) : '—'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="catalog-more">
            {films.length < total ? (
              <button type="button" className="btn-ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Загрузка…' : 'Загрузить ещё'}
              </button>
            ) : (
              <span className="catalog-end">— Это все фильмы, неужели не нашлось подходящего?!) ({films.length}) —</span>
            )}
            <span className="catalog-count">Показано {films.length} из {total}</span>
          </div>
        </>
      )}

      {addOpen && (
        <div className="modal-overlay" onClick={() => setAddOpen(false)}>
          <div className="modal-content catalog-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setAddOpen(false)} aria-label="Закрыть">×</button>
            <p className="catalog-kicker">Новый фильм</p>
            <h2 className="catalog-modal-title">Найти в TMDB</h2>
            <form className="catalog-modal-search" onSubmit={searchTmdb}>
              <input
                className="catalog-input"
                type="search"
                value={tmdbQuery}
                onChange={(event) => setTmdbQuery(event.target.value)}
                placeholder="Название фильма"
                autoFocus
              />
              <button type="submit" className="btn-primary" disabled={tmdbLoading}>
                {tmdbLoading ? 'Рыскаем по архивам…' : 'Найти'}
              </button>
            </form>
            {tmdbError && <div className="catalog-error">{tmdbError}</div>}
            {tmdbResults.length > 0 && (
              <div className="catalog-tmdb-list">
                {tmdbResults.map(item => (
                  <div key={item.id} className="catalog-tmdb-row">
                    <img
                      src={item.poster_path ? getPosterUrl(`https://image.tmdb.org/t/p/w92${item.poster_path}`) : '/no-poster.jpg'}
                      alt={item.title}
                      onError={handleImgError}
                    />
                    <div className="catalog-tmdb-info">
                      <strong>{item.title}</strong>
                      <span>{item.release_date?.split('-')[0] || '—'}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => importTmdb(item.id)}
                      disabled={Boolean(importingId)}
                    >
                      {importingId === item.id ? 'Добавляем… Спасибо, очень интересный выбор' : 'Добавить'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CatalogPage;
