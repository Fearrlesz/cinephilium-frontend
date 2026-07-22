import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// ===== КОНСТАНТЫ =====
const baseNames = [
  '🎭 Сценарий и драматургия',
  '🎭 Персонажи и актерская игра',
  '🎬 Режиссура и визуальный язык',
  '🔊 Звук и атмосфера'
];

const criteriaNames = [
  ['1.1 Логика и Запуск', '1.2 Структура и Нарастание', '1.3 Цели и Мотивация', '1.4 Диалоги и Подтекст', '1.5 Ценность и Итог'],
  ['2.1 Глубина личности', '2.2 Химия и Ансамбль', '2.3 Органика поведения', '2.4 Эволюция личности', '2.5 Перегруженность'],
  ['3.1 Композиция и Среда', '3.2 Движение камеры', '3.3 Цветовая партитура', '3.4 Монтажный ритм', '3.5 Визуальный символизм'],
  ['4.1 Музыкальная драматургия', '4.2 Тембр и Стиль', '4.3 Шумовая партитура', '4.4 Использование Тишины', '4.5 Технический баланс']
];

const baseDescriptions = [
  ['Насколько органично события вытекают друг из друга?', 'Есть ли внятное развитие: знакомство → кризис → кульминация → развязка?', 'Понятно ли, чего хочет герой и что ему мешает?', 'Есть ли в словах героев скрытый смысл?', 'Меняется ли герой или мир к финалу?'],
  ['Есть ли у героя слабости, странности, внутренние конфликты?', 'Интересно ли смотреть на общение героев друг с другом?', 'Верим ли мы мимике, паузам, взглядам, пластике?', 'Меняется ли характер героя под давлением обстоятельств?', 'Нет ли в фильме героев, которые не влияют на сюжет?'],
  ['Продумано ли, что и где стоит в кадре?', 'Обоснована ли камера: почему в одной сцене она дрожит, а в другой — плавно плывет?', 'Есть ли у фильма своя цветная атмосфера?', 'Длится ли кадр ровно столько, сколько нужно глазу?', 'Есть ли повторяющиеся образы, которые несут скрытый смысл?'],
  ['Помогает ли музыка понять чувства героя?', 'Соответствуют ли инструменты эпохе, месту и жанру?', 'Работают ли бытовые шумы на атмосферу?', 'Умеет ли режиссер вовремя выключить музыку?', 'Все ли слышно? Не перекрывает ли бас или музыка голоса актеров?']
];

// ===== API КЛИЕНТ =====
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===== УТИЛИТЫ =====
function getScoreColor(score) {
  if (score === undefined || score === null || isNaN(score)) return '#666';
  const clampedScore = Math.max(6, Math.min(90, score));
  const normalized = (clampedScore - 6) / 84;
  const hue = normalized * 120;
  return `hsl(${hue}, 85%, ${45 + normalized * 15}%)`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// ===== КОМПОНЕНТ: МОДАЛЬНОЕ ОКНО С ДЕТАЛЯМИ ОЦЕНКИ =====
function RatingDetailsModal({ rating, onClose }) {
  if (!rating) return null;

  const bases = [rating.base1, rating.base2, rating.base3, rating.base4];
  const baseAverages = bases.map(base => 
    base && base.length === 5 ? (base.reduce((a, b) => a + b, 0) / 5).toFixed(1) : '0.0'
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="modal-header">
          <h2>{rating.filmId?.title || 'Фильм'}</h2>
          <p>Оценка: <span style={{ color: getScoreColor(rating.finalScore), fontSize: '28px', fontWeight: 'bold' }}>{rating.finalScore}</span></p>
          <p className="modal-user">👤 {rating.userId?.nickname || 'Пользователь'}</p>
          <p>Субъективный множитель «Вайб»: <strong>{rating.subjectiveM}</strong></p>
          <p>Технический балл (T): <strong>{rating.technicalScore}</strong></p>
          {rating.textReview && (
            <div className="modal-review">
              <p><strong>Отзыв:</strong> {rating.textReview}</p>
            </div>
          )}
        </div>

        <div className="modal-bases">
          {[0, 1, 2, 3].map((baseIndex) => (
            <div key={baseIndex} className="modal-base">
              <h4>{baseNames[baseIndex]} <span className="modal-base-avg">(среднее: {baseAverages[baseIndex]})</span></h4>
              <div className="modal-criteria">
                {criteriaNames[baseIndex].map((name, critIndex) => (
                  <div key={critIndex} className="modal-criterion">
                    <span>{name}</span>
                    <span className="modal-criterion-score">{bases[baseIndex]?.[critIndex] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== КОМПОНЕНТ: ЛЕНТА СОБЫТИЙ =====
function ActivityFeed({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="activity-feed">
      <h3>📰 Последние события</h3>
      <div className="feed-list">
        {events.slice(0, 10).map((e, i) => (
          <div key={i} className="feed-item">
            <span className="feed-icon">
              {e.type === 'rating' ? '⭐' : e.type === 'review' ? '📝' : '➕'}
            </span>
            <span className="feed-text">
              {e.type === 'rating' 
                ? `«${e.user}» оценил «${e.film}» на ${e.score} баллов`
                : e.type === 'review'
                ? `«${e.user}» написал рецензию на «${e.film}»`
                : `«${e.user}» добавил «${e.film}» в базу`}
            </span>
            <span className="feed-time">{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== СТРАНИЦА: О СИСТЕМЕ =====
function AboutPage() {
  return (
    <div className="container about-page">
      <Link to="/" className="back-btn">← На главную</Link>
      
      <h1 className="about-title">📖 О системе оценки</h1>
      
      <div className="about-intro">
        <p>
          Мы оцениваем фильмы по <strong>20 критериям</strong>, разбитым на 4 блока.
          Каждый критерий оценивается от <strong>1 до 10</strong>.
        </p>
        <p>
          Также немаловажную роль играет ваше личное восприятие фильма в виде 
          множителя <strong>«Вайб»</strong>! Тем самым мы в одной системе оценивания 
          соединяем <strong>химию и математику</strong>. Чистый метамодернизм!
        </p>
      </div>

      <div className="about-blocks">
        {[0, 1, 2, 3].map((blockIndex) => (
          <div key={blockIndex} className="about-block">
            <h2 className="about-block-title">{baseNames[blockIndex]}</h2>
            <div className="about-criteria">
              {criteriaNames[blockIndex].map((name, critIndex) => (
                <div key={critIndex} className="about-criterion">
                  <div className="about-criterion-name">{name}</div>
                  <div className="about-criterion-desc">{baseDescriptions[blockIndex][critIndex]}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="about-formula">
        <h2>🔢 Формула расчёта</h2>
        <div className="formula-steps">
          <div className="formula-step">
            <span className="step-number">1</span>
            <span>По каждой базе считается среднее арифметическое (сумма 5 оценок ÷ 5)</span>
          </div>
          <div className="formula-step">
            <span className="step-number">2</span>
            <span>Технический балл (T) = (Средняя1 + Средняя2 + Средняя3 + Средняя4) × 1.4</span>
          </div>
          <div className="formula-step">
            <span className="step-number">3</span>
            <span>Субъективный множитель <strong>«Вайб»</strong> (M) — ваша личная оценка фильма от 1 до 10</span>
          </div>
          <div className="formula-step">
            <span className="step-number">4</span>
            <span>Итог = T + 34 × (M − 1) ÷ 9</span>
          </div>
        </div>
        <div className="formula-result">
          <p>Итоговая оценка всегда в диапазоне от <strong>6</strong> до <strong>90</strong>.</p>
        </div>
      </div>

      <div className="about-version">
        <p>Синефилиум v1.0 — Храм честного кино.</p>
      </div>
    </div>
  );
}

// ===== СТРАНИЦА: ТОП ПОЛЬЗОВАТЕЛЕЙ =====
function TopUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopUsers();
  }, []);

  const loadTopUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/top/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки топа:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  const getMedal = (index) => {
    if (index === 0) return '👑';
    if (index === 1) return '🥇';
    if (index === 2) return '🥈';
    if (index === 3) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <div className="container top-page">
      <Link to="/" className="back-btn">← На главную</Link>
      <h1 className="top-title">🏆 Топ пользователей</h1>
      <div className="top-users-list">
        {users.map((user, index) => (
          <Link to={`/user/${user._id}`} key={user._id} className="top-user-item">
            <div className="top-user-rank">{getMedal(index)}</div>
            <div className="top-user-avatar">
              <div className="avatar-placeholder-small">{user.nickname[0]}</div>
            </div>
            <div className="top-user-info">
              <div className="top-user-name">
                {user.nickname}
                {user.isAdmin && <span className="admin-badge">👑</span>}
              </div>
              <div className="top-user-stats">
                <span>⭐ {user.totalPoints} баллов</span>
                <span>🎯 {user.ratingsCount || 0} оценок</span>
                <span>📝 {user.reviewsCount || 0} рецензий</span>
                <span>💬 {user.commentsCount || 0} комментариев</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ===== СТРАНИЦА: АДМИН-ПАНЕЛЬ =====
function AdminPanel() {
  const { nickname } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pendingComments, setPendingComments] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadAdminData();
  }, [nickname, navigate]);

  const loadAdminData = async () => {
    try {
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);

      if (userResponse.data.nickname !== nickname) {
        navigate('/');
        return;
      }

      if (!userResponse.data.isAdmin) {
        navigate('/');
        return;
      }

      const [commentsRes, reviewsRes] = await Promise.all([
        api.get('/admin/pending/comments'),
        api.get('/admin/pending/reviews')
      ]);
      
      setPendingComments(commentsRes.data || []);
      setPendingReviews(reviewsRes.data || []);
    } catch (err) {
      console.error('Ошибка загрузки админ-панели:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const approveComment = async (id) => {
    try {
      await api.put(`/admin/comments/${id}/approve`);
      setPendingComments(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.error || err.message));
    }
  };

  const rejectComment = async (id) => {
    try {
      await api.put(`/admin/comments/${id}/reject`);
      setPendingComments(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.error || err.message));
    }
  };

  const approveReview = async (id) => {
    try {
      await api.put(`/admin/reviews/${id}/approve`);
      setPendingReviews(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.error || err.message));
    }
  };

  const rejectReview = async (id) => {
    try {
      await api.put(`/admin/reviews/${id}/reject`);
      setPendingReviews(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="container admin-panel">
      <button onClick={() => navigate('/')} className="back-btn">← На главную</button>
      <h1 className="admin-title">🛡️ Админ-панель</h1>
      <p className="admin-welcome">Добро пожаловать, {user?.nickname}!</p>

      <div className="admin-section">
        <h2>💬 Комментарии на модерации ({pendingComments.length})</h2>
        {pendingComments.length === 0 ? (
          <p className="admin-empty">Нет комментариев для проверки</p>
        ) : (
          <div className="admin-list">
            {pendingComments.map(c => (
              <div key={c._id} className="admin-item">
                <div className="admin-item-header">
                  <span className="admin-item-author">👤 {c.userId?.nickname}</span>
                  <span className="admin-item-film">🎬 {c.filmId?.title}</span>
                </div>
                <p className="admin-item-text">{c.text}</p>
                <div className="admin-item-actions">
                  <button className="btn-approve" onClick={() => approveComment(c._id)}>✅ Одобрить</button>
                  <button className="btn-reject" onClick={() => rejectComment(c._id)}>❌ Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-section">
        <h2>📝 Рецензии на модерации ({pendingReviews.length})</h2>
        {pendingReviews.length === 0 ? (
          <p className="admin-empty">Нет рецензий для проверки</p>
        ) : (
          <div className="admin-list">
            {pendingReviews.map(r => (
              <div key={r._id} className="admin-item">
                <div className="admin-item-header">
                  <span className="admin-item-author">👤 {r.userId?.nickname}</span>
                  <span className="admin-item-film">🎬 {r.filmId?.title}</span>
                </div>
                <h4 className="admin-item-title">{r.title}</h4>
                <p className="admin-item-text">{r.text}</p>
                <div className="admin-item-actions">
                  <button className="btn-approve" onClick={() => approveReview(r._id)}>✅ Одобрить</button>
                  <button className="btn-reject" onClick={() => rejectReview(r._id)}>❌ Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== СТРАНИЦА: ГЛАВНАЯ =====
function HomePage() {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadFilms(page);
    loadEvents();
    loadCurrentUser();
  }, [page]);

  const loadCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
        }
      }
    }
  };

  const loadFilms = async (pageNum = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/films?page=${pageNum}&limit=20`);
      if (Array.isArray(response.data.films)) {
        if (pageNum === 1) {
          setFilms(response.data.films);
        } else {
          const existingIds = new Set(films.map(f => f._id));
          const newFilms = response.data.films.filter(f => !existingIds.has(f._id));
          setFilms(prev => [...prev, ...newFilms]);
        }
        setTotalPages(response.data.totalPages || 1);
      } else {
        setFilms([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки фильмов:', err);
      setError('Не удалось загрузить фильмы. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки событий:', err);
    }
  };

  const loadMore = () => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await api.get('/tmdb/search', {
        params: { query: searchQuery }
      });
      setSearchResults(response.data.results || []);
      setShowSearch(true);
    } catch (err) {
      console.error('Ошибка поиска:', err);
      alert('Ошибка поиска: ' + (err.response?.data?.error || err.message));
    }
  };

  const importFilm = async (tmdbId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Чтобы добавить фильм, необходимо войти в систему.');
      navigate('/login');
      return;
    }
    
    if (isImporting) return;
    setIsImporting(true);
    
    try {
      await api.post('/films/import', { tmdbId });
      alert('Фильм успешно добавлен!');
      setShowSearch(false);
      setSearchQuery('');
      setPage(1);
      await loadFilms(1);
      await loadEvents();
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsImporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  const token = localStorage.getItem('token');

  if (loading && page === 1) return <div className="loading">Загрузка...</div>;

  const topFilms = [...films]
    .filter(f => f.averageRating > 0)
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 5);

  return (
    <div className="container">
      <header className="header">
        <h1>🎬 СИНЕФИЛИУМ</h1>
        <div className="header-actions">
          <Link to="/about" className="btn-about">📖 О системе</Link>
          <Link to="/top" className="btn-top">🏆 Топ</Link>
          {token && user ? (
            <>
              <Link to="/profile" className="btn-profile">👤 {user.nickname}</Link>
              {user.isAdmin && (
                <Link to={`/admin/${user.nickname}`} className="btn-admin">🛡️ Админка</Link>
              )}
              <button
                onClick={handleLogout}
                className="btn-logout"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}
              >
                Выйти
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-login">Войти</Link>
          )}
        </div>
      </header>

      <div className="hero">
        <h2>Храм честного кино — 20 критериев для подробной оценки</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Найти фильм в TMDB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch}>🔍 Найти</button>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {showSearch && searchResults.length > 0 && (
        <div className="search-results">
          <h3>Результаты поиска:</h3>
          <div className="films-grid">
            {searchResults.map((film) => (
              <div key={film.id} className="film-card">
                <img 
                  src={film.poster_path ? `https://image.tmdb.org/t/p/w200${film.poster_path}` : '/no-poster.jpg'} 
                  alt={film.title}
                />
                <h4>{film.title}</h4>
                <p>{film.release_date?.split('-')[0] || 'N/A'}</p>
                <button onClick={() => importFilm(film.id)} disabled={isImporting}>
                  {isImporting ? 'Добавление...' : '➕ Добавить'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {topFilms.length > 0 && (
        <div className="top-films">
          <h3>🏆 Топ-5 сообщества</h3>
          <div className="top-list">
            {topFilms.map((film, i) => (
              <Link to={`/film/${film._id}`} key={film._id} className="top-item">
                <span className="top-rank">#{i+1}</span>
                <span className="top-title">{film.title}</span>
                <span className="top-score" style={{ color: getScoreColor(film.averageRating) }}>
                  {film.averageRating?.toFixed(1)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <ActivityFeed events={events} />

      {films.length === 0 ? (
        <div className="no-films">Нет добавленных фильмов. Найдите и добавьте первый!</div>
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
                    <div className="rating-badge" style={{ color: getScoreColor(film.averageRating) }}>
                      {film.averageRating ? `${film.averageRating.toFixed(1)}` : 'Нет оценок'}
                    </div>
                    <span className="votes-count">👥 {film.votesCount || 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {page < totalPages && (
            <div className="load-more">
              <button onClick={loadMore} className="load-more-btn">
                Загрузить ещё
              </button>
              <span className="page-info">{page} / {totalPages}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===== СТРАНИЦА: ФИЛЬМ =====
function FilmPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [film, setFilm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(null);
  const [isRatingMode, setIsRatingMode] = useState(false);
  const [filmUsers, setFilmUsers] = useState([]);
  const [selectedRating, setSelectedRating] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ title: '', text: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [base1, setBase1] = useState([5, 5, 5, 5, 5]);
  const [base2, setBase2] = useState([5, 5, 5, 5, 5]);
  const [base3, setBase3] = useState([5, 5, 5, 5, 5]);
  const [base4, setBase4] = useState([5, 5, 5, 5, 5]);
  const [subjectiveM, setSubjectiveM] = useState(5);
  const [textReview, setTextReview] = useState('');

  useEffect(() => {
    loadFilm();
    loadFilmUsers();
    loadComments();
    loadReviews();
    loadCurrentUser();
  }, [id]);

  const loadCurrentUser = async () => {
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
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRatingMode && !isSaving) {
        e.preventDefault();
        e.returnValue = 'Вы уверены, что хотите закрыть страницу? Ваши изменения не будут сохранены.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRatingMode, isSaving]);

  const loadFilm = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/films/${id}`);
      setFilm(response.data);
      if (response.data.userRating) {
        const ur = response.data.userRating;
        setUserRating(ur);
        setBase1(ur.base1 || [5,5,5,5,5]);
        setBase2(ur.base2 || [5,5,5,5,5]);
        setBase3(ur.base3 || [5,5,5,5,5]);
        setBase4(ur.base4 || [5,5,5,5,5]);
        setSubjectiveM(ur.subjectiveM || 5);
        setTextReview(ur.textReview || '');
      } else {
        setBase1([5,5,5,5,5]);
        setBase2([5,5,5,5,5]);
        setBase3([5,5,5,5,5]);
        setBase4([5,5,5,5,5]);
        setSubjectiveM(5);
        setTextReview('');
        setUserRating(null);
      }
    } catch (err) {
      console.error('Ошибка загрузки фильма:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFilmUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await api.get(`/films/${id}/users`);
      setFilmUsers(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await api.get(`/comments/${id}`);
      setComments(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
    }
  };

  const loadReviews = async () => {
    try {
      const response = await api.get(`/reviews/${id}`);
      setReviews(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки рецензий:', err);
    }
  };

  const handleRatingChange = useCallback((baseIndex, criterionIndex, value) => {
    const setters = [setBase1, setBase2, setBase3, setBase4];
    const setter = setters[baseIndex];
    setter(prev => {
      const newArr = [...prev];
      newArr[criterionIndex] = Number(value);
      return newArr;
    });
  }, []);

  const calculatePreview = useCallback(() => {
    const avg1 = base1.reduce((a, b) => a + b, 0) / 5;
    const avg2 = base2.reduce((a, b) => a + b, 0) / 5;
    const avg3 = base3.reduce((a, b) => a + b, 0) / 5;
    const avg4 = base4.reduce((a, b) => a + b, 0) / 5;
    const T = (avg1 + avg2 + avg3 + avg4) * 1.4;
    const finalRaw = T + 34 * (subjectiveM - 1) / 9;
    return Math.min(90, Math.max(6, Math.round(finalRaw)));
  }, [base1, base2, base3, base4, subjectiveM]);

  const saveRating = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Войдите в систему, чтобы оценивать фильмы');
      navigate('/login');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const response = await api.post('/ratings', {
        filmId: id,
        base1,
        base2,
        base3,
        base4,
        subjectiveM,
        textReview
      });
      
      setUserRating(response.data.rating);
      alert('Оценка сохранена!');
      await loadFilm();
      await loadFilmUsers();
      setIsRatingMode(false);
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
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
      alert('Не удалось загрузить детали оценки.');
    }
  };

  const toggleRatingMode = () => {
    setIsRatingMode(!isRatingMode);
  };

  const addComment = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Войдите в систему, чтобы комментировать');
      navigate('/login');
      return;
    }
    if (!commentText.trim()) return;
    try {
      await api.post('/comments', { filmId: id, text: commentText });
      setCommentText('');
      await loadComments();
    } catch (err) {
      alert('Ошибка добавления комментария: ' + (err.response?.data?.error || err.message));
    }
  };

  const likeComment = async (commentId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Войдите в систему, чтобы ставить лайки');
      navigate('/login');
      return;
    }
    try {
      await api.post(`/comments/${commentId}/like`);
      await loadComments();
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.error || err.message));
    }
  };

  const addReview = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Войдите в систему, чтобы написать рецензию');
      navigate('/login');
      return;
    }
    if (!userRating) {
      alert('Сначала оцените фильм!');
      return;
    }
    if (!newReview.title.trim() || !newReview.text.trim()) {
      alert('Заполните заголовок и текст рецензии');
      return;
    }
    try {
      await api.post('/reviews', {
        filmId: id,
        ratingId: userRating._id,
        title: newReview.title,
        text: newReview.text
      });
      setNewReview({ title: '', text: '' });
      setShowReviewForm(false);
      await loadReviews();
      alert('Рецензия добавлена!');
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.error || err.message));
    }
  };

  const likeReview = async (reviewId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Войдите в систему, чтобы ставить лайки');
      navigate('/login');
      return;
    }
    try {
      await api.post(`/reviews/${reviewId}/like`);
      await loadReviews();
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!film) return <div className="error">Фильм не найден</div>;

  const previewScore = calculatePreview();

  return (
    <div className="container">
      <div className="film-page">
        <button onClick={() => navigate('/')} className="back-btn">← На главную</button>
        
        <div className="film-header">
          <img src={film.poster || '/no-poster.jpg'} alt={film.title} className="film-poster-large" />
          <div className="film-details">
            <h1>{film.title}</h1>
            <p className="film-year">{film.year}</p>
            <p className="film-description">{film.description}</p>
            <p><strong>Режиссёр:</strong> {film.director}</p>
            <p><strong>Актёры:</strong> {film.actors?.join(', ') || 'Нет данных'}</p>
            <div className="film-genres">
              {film.genres?.map((g, i) => <span key={i} className="genre-tag">{g}</span>)}
            </div>
            
            <div className="film-rating-stats">
              <div className="avg-rating" style={{ color: getScoreColor(film.averageRating) }}>
                {film.averageRating ? `${film.averageRating.toFixed(1)}` : 'Нет оценок'}
              </div>
              <span>👥 {film.votesCount || 0} оценок</span>
            </div>

            {userRating && (
              <div className="your-rating">
                <h4>Ваша оценка:</h4>
                <div className="user-rating-display" style={{ color: getScoreColor(userRating.finalScore) }}>
                  {userRating.finalScore}
                </div>
              </div>
            )}

            <button className="rate-btn" onClick={toggleRatingMode}>
              {isRatingMode ? 'Скрыть форму' : (userRating ? '✏️ Изменить оценку' : '⭐ Оценить фильм')}
            </button>
          </div>
        </div>

        <div className="reviews-section">
          <div className="reviews-header">
            <h3>📝 Рецензии ({reviews.length})</h3>
            {currentUser && (
              <button className="btn-add-review" onClick={() => setShowReviewForm(!showReviewForm)}>
                {showReviewForm ? 'Отменить' : '+ Написать рецензию'}
              </button>
            )}
          </div>

          {showReviewForm && (
            <div className="review-form">
              <input
                type="text"
                placeholder="Заголовок рецензии"
                value={newReview.title}
                onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
              />
              <textarea
                placeholder="Текст рецензии..."
                value={newReview.text}
                onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                rows="6"
              />
              <button onClick={addReview}>Опубликовать рецензию</button>
            </div>
          )}

          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review._id} className="review-card">
                <div className="review-header">
                  <div className="review-author">
                    <span className="review-nickname">{review.userId?.nickname}</span>
                    {review.userId?.isAdmin && <span className="admin-badge">👑</span>}
                  </div>
                  <div className="review-rating">
                    ⭐ {review.ratingId?.finalScore || 'Нет оценки'}
                  </div>
                </div>
                <h4 className="review-title">{review.title}</h4>
                <p className="review-text">{review.text}</p>
                <div className="review-actions">
                  <button className="like-btn" onClick={() => likeReview(review._id)}>
                    ❤️ {review.likes?.length || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {usersLoading ? (
          <div className="loading">Загрузка пользователей...</div>
        ) : filmUsers.length > 0 ? (
          <div className="film-users">
            <h3>Оценили фильм: {filmUsers.length} человек</h3>
            <div className="users-list">
              {filmUsers.map((item) => (
                <div key={`${item.user._id}-${item.rating._id}`} className="user-rating-item">
                  <Link to={`/user/${item.user._id}`} className="user-link">
                    👤 {item.user.nickname}
                  </Link>
                  <span className="user-rating-score" style={{ color: getScoreColor(item.rating.finalScore) }}>
                    {item.rating.finalScore}
                  </span>
                  <button 
                    className="details-btn"
                    onClick={() => openRatingDetails(item.rating)}
                  >
                    🔍 Детали
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isRatingMode && (
          <div className="rating-form">
            <h2>Оценка по 20 критериям</h2>
            <p className="rating-hint">Оценка от 1 до 10 (1 — ужасно, 10 — идеально)</p>
            
            {[0, 1, 2, 3].map((baseIndex) => (
              <div key={baseIndex} className="rating-base">
                <h3>{baseNames[baseIndex]}</h3>
                {criteriaNames[baseIndex].map((name, critIndex) => {
                  const values = [base1, base2, base3, base4];
                  const value = values[baseIndex][critIndex];
                  return (
                    <div key={critIndex} className="criterion">
                      <label>
                        {name}
                        <span className="criterion-hint" title={baseDescriptions[baseIndex][critIndex]}>❓</span>
                      </label>
                      <div className="slider-container">
                        <span>1</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={value}
                          onChange={(e) => handleRatingChange(baseIndex, critIndex, e.target.value)}
                        />
                        <span>10</span>
                        <span className="value-display">{value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="subjective-block">
              <h3>Субъективный множитель «Вайб»</h3>
              <p>Насколько лично вам понравился фильм, несмотря на технические оценки?</p>
              <div className="slider-container">
                <span>1</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={subjectiveM}
                  onChange={(e) => setSubjectiveM(Number(e.target.value))}
                />
                <span>10</span>
                <span className="value-display">{subjectiveM}</span>
              </div>
            </div>

            <div className="text-review">
              <h3>Текстовый отзыв (необязательно)</h3>
              <textarea
                value={textReview}
                onChange={(e) => setTextReview(e.target.value.slice(0, 1000))}
                placeholder="Напишите свои впечатления..."
                rows="4"
                maxLength={1000}
              />
              <div className="char-counter">{textReview.length}/1000</div>
            </div>

            <div className="rating-preview">
              <h3>Итоговая оценка:</h3>
              <div className="preview-score" style={{ color: getScoreColor(previewScore) }}>
                {previewScore}
              </div>
              <div className="score-bar" style={{ 
                width: `${(previewScore - 6) / 84 * 100}%`,
                background: `linear-gradient(to right, #ff1744, #ffab00, #00e676)`
              }}></div>
              <div className="score-labels">
                <span>6 (провал)</span>
                <span>90 (шедевр)</span>
              </div>
              <button onClick={saveRating} className="save-rating-btn" disabled={isSaving}>
                {isSaving ? 'Сохранение...' : '💾 Сохранить оценку'}
              </button>
            </div>
          </div>
        )}

        <div className="comments-section">
          <h3>💬 Комментарии ({comments.length})</h3>
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment._id} className="comment-item">
                <div className="comment-author">
                  <span className="comment-nickname">{comment.userId?.nickname}</span>
                  {comment.userId?.isAdmin && <span className="admin-badge">👑</span>}
                </div>
                <p className="comment-text">{comment.text}</p>
                <div className="comment-actions">
                  <button className="like-btn" onClick={() => likeComment(comment._id)}>
                    ❤️ {comment.likes?.length || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {currentUser && (
            <div className="comment-form">
              <input
                type="text"
                placeholder="Написать комментарий..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addComment()}
              />
              <button onClick={addComment}>📤</button>
            </div>
          )}
        </div>

        {film.trailer && (
          <div className="trailer">
            <h3>Трейлер</h3>
            <iframe src={film.trailer} title="Трейлер" allowFullScreen />
          </div>
        )}
      </div>

      <RatingDetailsModal 
        rating={selectedRating} 
        onClose={() => setSelectedRating(null)} 
      />
    </div>
  );
}

// ===== СТРАНИЦА: ВХОД / РЕГИСТРАЦИЯ =====
function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const data = isLogin ? { email, password } : { email, password, nickname };
      
      const response = await api.post(endpoint, data);
      localStorage.setItem('token', response.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="auth-box">
        <h1>{isLogin ? 'Вход в Синефилиум' : 'Регистрация'}</h1>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {!isLogin && (
            <input
              type="text"
              placeholder="Никнейм"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          )}
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>
        <p onClick={() => { setIsLogin(!isLogin); setError(''); }} className="toggle-auth">
          {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
        </p>
      </div>
    </div>
  );
}

// ===== СТРАНИЦА: ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ =====
function ProfilePage() {
  const [user, setUser] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(null);
  const [adminSecret, setAdminSecret] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, [navigate]);

  const loadProfile = async () => {
    try {
      const [userResponse, ratingsResponse] = await Promise.all([
        api.get('/auth/me'),
        api.get('/ratings/user')
      ]);
      
      setUser(userResponse.data);
      setRatings(ratingsResponse.data || []);
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const openRatingDetails = async (rating) => {
    try {
      const response = await api.get(`/ratings/${rating._id}/details`);
      setSelectedRating(response.data);
    } catch (err) {
      console.error('Ошибка загрузки деталей оценки:', err);
      alert('Не удалось загрузить детали оценки.');
    }
  };

  const activateAdmin = async () => {
    if (!adminSecret.trim()) {
      setAdminError('Введите секретный ключ');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    setAdminSuccess('');
    try {
      const response = await api.post('/admin/make', { secretKey: adminSecret });
      setAdminSuccess(response.data.message);
      setUser(prev => ({ ...prev, isAdmin: true, totalPoints: response.data.totalPoints }));
      setAdminSecret('');
    } catch (err) {
      setAdminError(err.response?.data?.error || 'Ошибка активации');
    } finally {
      setAdminLoading(false);
    }
  };

  const avgRating = ratings.length 
    ? (ratings.reduce((sum, r) => sum + r.finalScore, 0) / ratings.length).toFixed(1) 
    : 'Нет';

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!user) return <div className="error">Не удалось загрузить профиль</div>;

  return (
    <div className="container profile-page">
      <button onClick={() => navigate('/')} className="back-btn">← На главную</button>
      
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-placeholder">{user.nickname[0]}</div>
        </div>
        <div className="profile-info">
          <h1>
            {user.nickname}
            {user.isAdmin && <span className="admin-badge"> 👑</span>}
          </h1>
          <p>📧 {user.email}</p>
          <div className="profile-stats">
            <p>📊 Средняя оценка: <strong>{avgRating}</strong></p>
            <p>🏆 Всего оценок: <strong>{ratings.length}</strong></p>
            <p>⭐ Баллов: <strong>{user.totalPoints || 0}</strong></p>
          </div>
          {!user.isAdmin && (
            <div className="admin-activation">
              <h4>🔑 Стать администратором</h4>
              <p className="admin-hint">Введите секретный ключ, чтобы получить права администратора</p>
              <div className="admin-form">
                <input
                  type="password"
                  placeholder="Секретный ключ..."
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                />
                <button onClick={activateAdmin} disabled={adminLoading}>
                  {adminLoading ? 'Проверка...' : '👑 Активировать'}
                </button>
              </div>
              {adminError && <div className="error-msg">{adminError}</div>}
              {adminSuccess && <div className="success-msg">{adminSuccess}</div>}
            </div>
          )}
          <button onClick={logout} className="logout-btn">🚪 Выйти</button>
        </div>
      </div>

      <div className="profile-ratings">
        <h2>Мои оценки</h2>
        {ratings.length === 0 ? (
          <p>Вы еще не оценили ни одного фильма</p>
        ) : (
          <div className="ratings-list">
            {ratings.map((rating) => (
              <div key={rating._id} className="rating-item">
                <Link to={`/film/${rating.filmId._id}`}>
                  <div className="rating-film-info">
                    <img src={rating.filmId.poster || '/no-poster.jpg'} alt={rating.filmId.title} className="rating-poster-small" />
                    <div>
                      <h4>{rating.filmId.title}</h4>
                      <p>{rating.filmId.year}</p>
                    </div>
                  </div>
                </Link>
                <div className="rating-score" style={{ color: getScoreColor(rating.finalScore) }}>
                  {rating.finalScore}
                </div>
                <button 
                  className="details-btn"
                  onClick={() => openRatingDetails(rating)}
                >
                  🔍 Детали
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <RatingDetailsModal 
        rating={selectedRating} 
        onClose={() => setSelectedRating(null)} 
      />
    </div>
  );
}

// ===== СТРАНИЦА: ПРОФИЛЬ ДРУГОГО ПОЛЬЗОВАТЕЛЯ =====
function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, [id]);

  const loadUserProfile = async () => {
    try {
      const response = await api.get(`/users/${id}`);
      setUser(response.data.user);
      setRatings(response.data.ratings || []);
      setReviews(response.data.reviews || []);
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
    } finally {
      setLoading(false);
    }
  };

  const openRatingDetails = async (rating) => {
    try {
      const response = await api.get(`/ratings/${rating._id}/details`);
      setSelectedRating(response.data);
    } catch (err) {
      console.error('Ошибка загрузки деталей оценки:', err);
      alert('Не удалось загрузить детали оценки.');
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!user) return <div className="error">Пользователь не найден</div>;

  return (
    <div className="container profile-page">
      <button onClick={() => navigate('/')} className="back-btn">← На главную</button>
      
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-placeholder">{user.nickname[0]}</div>
        </div>
        <div className="profile-info">
          <h1>
            {user.nickname}
            {user.isAdmin && <span className="admin-badge"> 👑</span>}
          </h1>
          <p>📅 Зарегистрирован: {formatDate(user.registeredAt)}</p>
          <p>⭐ Всего оценок: {ratings.length}</p>
          <p>📝 Рецензий: {reviews.length}</p>
          <p>🏆 Баллов: {user.totalPoints || 0}</p>
        </div>
      </div>

      <div className="profile-ratings">
        <h2>Оценки пользователя</h2>
        {ratings.length === 0 ? (
          <p>Пользователь еще не оценил ни одного фильма</p>
        ) : (
          <div className="ratings-list">
            {ratings.map((rating) => (
              <div key={rating._id} className="rating-item">
                <Link to={`/film/${rating.film._id}`}>
                  <div className="rating-film-info">
                    <img src={rating.film.poster || '/no-poster.jpg'} alt={rating.film.title} className="rating-poster-small" />
                    <div>
                      <h4>{rating.film.title}</h4>
                      <p>{rating.film.year}</p>
                    </div>
                  </div>
                </Link>
                <div className="rating-score" style={{ color: getScoreColor(rating.finalScore) }}>
                  {rating.finalScore}
                </div>
                <button 
                  className="details-btn"
                  onClick={() => openRatingDetails(rating)}
                >
                  🔍 Детали
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="profile-reviews">
          <h2>Рецензии</h2>
          {reviews.map((review) => (
            <div key={review._id} className="review-item">
              <Link to={`/film/${review.film._id}`}>
                <h4>{review.title}</h4>
                <p>{review.film.title} ({review.film.year})</p>
              </Link>
              <p className="review-preview">{review.text.slice(0, 200)}...</p>
              <span>❤️ {review.likes || 0}</span>
            </div>
          ))}
        </div>
      )}

      <RatingDetailsModal 
        rating={selectedRating} 
        onClose={() => setSelectedRating(null)} 
      />
    </div>
  );
}

// ===== ГЛАВНОЕ ПРИЛОЖЕНИЕ =====
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/top" element={<TopUsersPage />} />
        <Route path="/admin/:nickname" element={<AdminPanel />} />
        <Route path="/film/:id" element={<FilmPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/user/:id" element={<UserProfilePage />} />
      </Routes>
    </Router>
  );
}

export default App;
