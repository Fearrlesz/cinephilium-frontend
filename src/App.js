/* Fixed App.js
   - Cleaned syntax errors (extra semicolons, malformed JSX, duplicated imports)
   - Fixed axios client and interceptors
   - Consolidated duplicated constants
   - Restored components to valid React code
   - Kept original structure and intent
*/

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams
} from 'react-router-dom';
import axios from 'axios';
import './App.css';

// ============================================================
// СПЕЦИАЛЬНЫЕ АКЦИИ
// ============================================================

const DOGVILLE_TITLE = 'Догвилль';
const DOGVILLE_DEADLINE = new Date('2026-08-07T23:59:59+03:00');

// ============================================================
// CONSTANTS
// ============================================================

const baseNames = [
  '🎭 Сценарий и драматургия',
  '🎭 Персонажи и актерская игра',
  '🎬 Режиссура и визуальный язык',
  '🔊 Звук и атмосфера'
];

// Simplified criteria and descriptions (fill or expand as needed)
const criteriaNames = [
  ['1.1 Логика и Запуск', '1.2 Структура и Нарастание', '1.3 Цели и Мотивация', '1.4 Диалоги и Подтекст', '1.5 Ценность'],
  ['2.1 Глубина личности', '2.2 Химия и Ансамбль', '2.3 Органика поведения', '2.4 Эволюция личности', '2.5 Перегруженность'],
  ['3.1 Композиция и Среда', '3.2 Движение камеры', '3.3 Цветовой стиль', '3.4 Монтажный ритм', '3.5 Визуальный символизм'],
  ['4.1 Музыкальная драматургия', '4.2 Тембр и Стиль Музыки', '4.3 Шумовая наполненность', '4.4 Использование Тишины', '4.5 Техническая чистота звука']
];

const baseDescriptions = [
  [
    'Насколько органично события вытекают друг из друга? Вовлекает ли экспозиция [начало] в фильм? ',
    'Есть ли внятное развитие: знакомство → кризис → кульминация? Или структура филигранно нарушена? ',
    'Ясны ли цели и мотивации героев?',
    'Насколько живые и многослойные диалоги?',
    'Дает ли фильм ценность зрителю? Вы вынесли что-то из него? '
  ],
  [
    'Есть ли у героев слабости и внутренние конфликты? Не клишированны ли они? ',
    'Есть ли химия между персонажами?',
    'Органично ли поведение героев? Вы верите в персонажей? ',
    'Развиваются ли персонажи в ходе сюжета?',
    'Насколько оправданно количество сюжетных линий или персонажей?'
  ],
  [
    'Продумано ли расположение героев и их окружения в кадре?',
    'Уместно ли движение камеры и его смысл?',
    'Согласованы ли цветовая палитра и освещение?',
    'Ритм монтажа создает напряжение/покой?',
    'Есть ли визуальные символы и работают ли они?'
  ],
  [
    'Помогает ли музыка передавать настроение фильма?',
    'Совместим ли тембр музыки с жанром фильма?',
    'Работают ли шумы и звуковые слои? Окунают ли вас шум прибоя или пение птиц в фильм? ',
    'Используется ли тишина как выразительное средство? Успешно ли? ',
    'Хороша ли техническая реализация звука? Качественно ли всё слышно? '
  ]
];

const VALID_EVENT_TYPES = ['rating', 'review', 'comment', 'film_add', 'achievement'];
const VALID_FILM_TYPES = ['view', 'like', 'rating', 'comment', 'share', 'favorite'];

const TECHNICAL_MULTIPLIER = 1.4;
const VIBE_STEP = 0.06747;
const MIN_SCORE = 6;
const MAX_SCORE = 90;

// ============================================================
// API CLIENT
// ============================================================

const api = axios.create({
  baseURL: 'https://cinephilium-backend.onrender.com/api',
  timeout: 10000
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

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================
// CONTEXTS
// ============================================================

const NotificationContext = createContext();

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

// ============================================================
// UTILITIES
// ============================================================

export function getScoreColor(score) {
  if (score === undefined || score === null || isNaN(score)) return '#666';
  const clampedScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
  const normalized = (clampedScore - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
  const hue = normalized * 120;
  return `hsl(${hue}, 85%, ${45 + normalized * 15}%)`;
}

export function formatDate(date) {
  if (!date) return 'Неизвестно';
  try {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return 'Неизвестно';
  }
}

export function getTimeAgo(date) {
  if (!date) return 'только что';
  try {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
    return formatDate(date);
  } catch {
    return 'только что';
  }
}

export function sanitizeText(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function truncateText(text, maxLength = 200) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password) {
  return password && password.length >= 6;
}

export function validateNickname(nickname) {
  return nickname && nickname.length >= 2 && nickname.length <= 20;
}

// ============================================================
// HOOK: useActivityEvents
// ============================================================

function useActivityEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingEvents, setPendingEvents] = useState(new Map());

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/events');
      if (response.data && Array.isArray(response.data)) {
        const formattedEvents = response.data.map(e => ({
          ...e,
          time: e.time || getTimeAgo(e.createdAt) || 'только что',
          _synced: true
        }));
        setEvents(formattedEvents);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки событий:', err?.message || err);
      setError('Не удалось загрузить события');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEvent = useCallback(async (eventData) => {
    if (!eventData.type || !VALID_EVENT_TYPES.includes(eventData.type)) {
      console.error('Некорректный тип события:', eventData.type);
      return false;
    }
    if (!eventData.user) {
      console.error('Не указан пользователь события');
      return false;
    }

    // filmId derivation
    let filmId = eventData.filmId || eventData.metadata?.filmId || eventData.film?._id || eventData.film;
    if (eventData.type !== 'achievement' && !filmId) {
      console.error('Для события типа', eventData.type, 'не указан filmId');
      return false;
    }
    if (eventData.type === 'achievement' && !filmId) {
      filmId = 'system';
    }

    // duplicate guard (within 5s)
    const duplicate = events.some(e =>
      e.type === eventData.type &&
      e.user === eventData.user &&
      e.film === eventData.film &&
      e.score === eventData.score &&
      (Date.now() - new Date(e.createdAt || e.time).getTime() < 5000)
    );
    if (duplicate) {
      console.warn('Обнаружен дубликат события, пропускаем');
      return false;
    }

    const payload = {
      type: eventData.type,
      user: eventData.user,
      film: eventData.film,
      filmId: filmId,
      score: eventData.score || null,
      metadata: eventData.metadata || null
    };

    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newEvent = {
      _id: localId,
      _synced: false,
      time: 'только что',
      ...eventData,
      filmId
    };

    setEvents(prev => [newEvent, ...prev].slice(0, 50));
    setPendingEvents(prev => {
      const m = new Map(prev);
      m.set(localId, payload);
      return m;
    });

    try {
      const response = await api.post('/events', payload);
      if (response.data && response.data._id) {
        setEvents(prev => prev.map(e =>
          e._id === localId ? { ...e, _id: response.data._id, _synced: true, createdAt: response.data.createdAt || e.createdAt } : e
        ));
        setPendingEvents(prev => {
          const m = new Map(prev);
          m.delete(localId);
          return m;
        });
        return true;
      } else {
        throw new Error('Сервер не вернул _id');
      }
    } catch (err) {
      console.error('Ошибка сохранения события:', err?.message || err);
      return false;
    }
  }, [events]);

  const syncPendingEvents = useCallback(async () => {
    const pending = Array.from(pendingEvents.entries());
    if (pending.length === 0) return;

    for (const [localId, payload] of pending) {
      try {
        const response = await api.post('/events', payload);
        if (response.data && response.data._id) {
          setEvents(prev => prev.map(e =>
            e._id === localId ? { ...e, _id: response.data._id, _synced: true } : e
          ));
          setPendingEvents(prev => {
            const m = new Map(prev);
            m.delete(localId);
            return m;
          });
        }
      } catch (err) {
        console.error(`Ошибка синхронизации ${localId}:`, err?.message || err);
      }
    }
  }, [pendingEvents]);

  const removeEvent = useCallback(async (eventId) => {
    const isLocal = String(eventId).startsWith('local_');
    if (isLocal) {
      setEvents(prev => prev.filter(e => e._id !== eventId));
      setPendingEvents(prev => {
        const m = new Map(prev);
        m.delete(eventId);
        return m;
      });
      return;
    }
    try {
      await api.delete(`/events/${eventId}`);
      setEvents(prev => prev.filter(e => e._id !== eventId));
    } catch (err) {
      console.error('Ошибка удаления события:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const interval = setInterval(syncPendingEvents, 30000);
    return () => clearInterval(interval);
  }, [syncPendingEvents]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingEvents.size > 0) {
        // Potential place to implement navigator.sendBeacon or fallback
        console.log('Отправка несинхронизированных событий перед выгрузкой...');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingEvents]);

  return {
    events,
    loading,
    error,
    addEvent,
    removeEvent,
    refresh: loadEvents,
    pendingEvents: pendingEvents.size,
    syncPendingEvents
  };
}

// ============================================================
// COMPONENTS
// ============================================================

function NotificationModal({ isOpen, onClose, title, message, type = 'success' }) {
  if (!isOpen) return null;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  const typeLabels = {
    success: 'Успешно',
    error: 'Ошибка',
    info: 'Информация',
    warning: 'Внимание'
  };

  const buttonLabels = {
    success: 'Отлично',
    error: 'Понятно',
    info: 'Закрыть',
    warning: 'Понял'
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-glass" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-content">
          <div className={`modal-icon ${type}`}>
            <span style={{ fontSize: '32px' }}>{icons[type] || 'ℹ️'}</span>
          </div>
          <h3 className="modal-title">{title || typeLabels[type] || 'Уведомление'}</h3>
          <p className="modal-message">{message}</p>
          <button className="btn-modal btn-primary" onClick={onClose}>
            {buttonLabels[type] || 'Закрыть'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RatingDetailsModal({ rating, onClose }) {
  if (!rating) return null;

  const bases = [rating.base1 || [], rating.base2 || [], rating.base3 || [], rating.base4 || []];
  const baseAverages = bases.map(base =>
    (Array.isArray(base) && base.length === 5)
      ? (base.reduce((a, b) => a + b, 0) / 5).toFixed(1)
      : '0.0'
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>{rating.film?.title || rating.filmId?.title || 'Фильм'}</h2>
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
          {[0, 1, 2, 3].map(baseIndex => (
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

function ActivityFeed({ events, loading }) {
  if (loading) {
    return (
      <div className="activity-feed">
        <h3>📰 Последние события</h3>
        <div className="feed-loading" style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>
          Загрузка событий...
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="activity-feed">
        <h3>📰 Последние события</h3>
        <div className="feed-empty" style={{
          textAlign: 'center',
          padding: '30px 20px',
          color: 'var(--text-muted)',
          fontSize: '14px'
        }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🌊</span>
          Пока нет событий в сообществе.<br />
          Оцените фильм, напишите рецензию или комментарий!
        </div>
      </div>
    );
  }

  const getEventIcon = (type) => {
    const icons = {
      'rating': '⭐',
      'review': '📝',
      'comment': '💬',
      'film_add': '🎬',
      'achievement': '🏆'
    };
    return icons[type] || '📌';
  };

  const getEventText = (event) => {
    const user = sanitizeText(event.user || 'Кто-то');
    if (event.type === 'achievement') {
      const list = event.metadata?.achievements?.join(', ') || '';
      return `🏆 ${user} получил достижение: ${list}`;
    }
    const film = sanitizeText(event.film || 'фильм');
    const score = event.score || '';

    const templates = {
      'rating': `«${user}» оценил «${film}» на ${score} баллов`,
      'review': `«${user}» написал рецензию на «${film}»`,
      'comment': `«${user}» прокомментировал «${film}»`,
      'film_add': `«${user}» добавил фильм «${film}» в каталог`
    };

    return templates[event.type] || `«${user}» сделал что-то с «${film}»`;
  };

  return (
    <div className="activity-feed">
      <h3>📰 Последние события</h3>
      <div className="feed-list">
        {events.slice(0, 10).map((event, index) => {
          const hasFilmId = event.filmId && event.filmId !== 'undefined' && event.filmId !== 'system' && event.filmId !== null && event.filmId !== 'null';

          const content = (
            <div className="feed-item" key={event._id || index}>
              <span className="feed-icon">{getEventIcon(event.type)}</span>
              <span className="feed-text">{getEventText(event)}</span>
              <span className="feed-time">{event.time || 'только что'}</span>
            </div>
          );

          return hasFilmId ? (
            <Link
              to={`/film/${event.filmId}`}
              key={event._id || index}
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              {content}
            </Link>
          ) : (
            <div key={event._id || index} style={{ display: 'block' }}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <header className="header">
      <h1>🎬 СИНЕФИЛИУМ</h1>
      <div className="header-actions">
        <Link to="/about" className="btn-about">📖 О системе</Link>
        <Link to="/top" className="btn-top">🏆 Топ</Link>
     <a href="https://t.me/Cinephilium" target="_blank" rel="noopener noreferrer" className="btn-telegram">📱 Telegram</a>
        {user ? (
          <>
            <Link to={`/user/${user._id}`} className="btn-profile">👤 {user.nickname}</Link>
            {user.isAdmin && <Link to="/admin" className="btn-admin">🛡️ Админка</Link>}
            <button onClick={onLogout} className="btn-logout">Выйти</button>
          </>
        ) : (
          <Link to="/login" className="btn-login">Войти</Link>
        )}
      </div>
    </header>
  );
}

// ============================================================
// PAGES (About, TopUsers, Admin, Home, Film, Login, Profile, UserProfile)
// Due to length, pages are implemented with cleaned syntax and the original logic preserved.
// ============================================================

function AboutPage() {
  return (
    <div className="container about-page">
      <Link to="/" className="back-btn">← На главную</Link>

      <h1 className="about-title">📖 О системе оценки</h1>

      <div className="about-intro glass-card">
        <p className="neon-text">
          Мы оцениваем фильмы по <strong>20 критериям</strong>, разбитым на 4 блока.
          Каждый критерий оценивается от <strong>1 до 10</strong>.
        </p>
        <p>
          Также немаловажную роль играет ваше личное восприятие фильма в виде множителя <strong>«Вайб»</strong>.
        </p>
      </div>

      <div className="about-blocks">
        {[0, 1, 2, 3].map(blockIndex => (
          <div key={blockIndex} className="about-block glass-card">
            <h2 className="about-block-title neon-text">{baseNames[blockIndex]}</h2>
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

      <div className="about-formula glass-card">
        <h2>🔢 Формула расчёта</h2>
        <div className="formula-steps">
          <div className="formula-step">
            <span className="step-number">1.</span>
            <span>По каждой базе считается среднее арифметическое (сумма 5 оценок ÷ 5)</span>
          </div>
          <div className="formula-step">
            <span className="step-number">2.</span>
            <span>Технический балл (T) = (Средняя1 + Средняя2 + Средняя3 + Средняя4) × {TECHNICAL_MULTIPLIER}</span>
          </div>
          <div className="formula-step">
            <span className="step-number">3.</span>
            <span>Субъективная оценка <strong>«Вайб»</strong> (M) — ваша личная оценка фильма от 1 до 10</span>
          </div>
          <div className="formula-step">
            <span className="step-number">4.</span>
            <span>Вайб-множитель = 1 + (M − 1) × {VIBE_STEP}</span>
          </div>
          <div className="formula-step">
            <span className="step-number">5.</span>
            <span>Итог = T × Вайб-множитель</span>
          </div>
        </div>
        <div className="formula-result">
          <p>Итоговая оценка всегда в диапазоне от <strong>{MIN_SCORE}</strong> до {MAX_SCORE}.</p>
          <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
            💡 Округление происходит только в самом конце, поэтому все нюансы оценок сохраняются.
          </p>
        </div>
      </div>
    </div>
  );
}

function TopUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTopUsers();
     
  }, []);

  const loadTopUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/top/users');
      setUsers(response.data || []);
    } catch (err) {
      console.error('Ошибка загрузки топа:', err);
      setError('Не удалось загрузить топ пользователей');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error-msg">{error}</div>;

  const getMedal = (index) => {
    const medals = ['👑', '🥇', '🥈', '🥉'];
    return medals[index] || `#${index + 1}`;
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
              <div className="avatar-placeholder-small">{user.nickname?.[0] || '?'}</div>
            </div>
            <div className="top-user-info">
              <div className="top-user-name">
                {user.nickname || 'Пользователь'}
                {user.isAdmin && <span className="admin-badge">👑</span>}
              </div>
              <div className="top-user-stats">
                <span>⭐ {user.totalPoints || 0} баллов</span>
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

function AdminPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [pendingComments, setPendingComments] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadAdminData();
    
  }, [navigate]);

  const loadAdminData = async () => {
    try {
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);

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
      showNotification({ title: 'Одобрено', message: 'Комментарий опубликован', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось одобрить комментарий', type: 'error' });
    }
  };

  const rejectComment = async (id) => {
    try {
      await api.put(`/admin/comments/${id}/reject`);
      setPendingComments(prev => prev.filter(c => c._id !== id));
      showNotification({ title: 'Отклонено', message: 'Комментарий отклонён', type: 'info' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось отклонить комментарий', type: 'error' });
    }
  };

  const approveReview = async (id) => {
    try {
      await api.put(`/admin/reviews/${id}/approve`);
      setPendingReviews(prev => prev.filter(r => r._id !== id));
      showNotification({ title: 'Одобрено', message: 'Рецензия опубликована', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось одобрить рецензию', type: 'error' });
    }
  };

  const rejectReview = async (id) => {
    try {
      await api.put(`/admin/reviews/${id}/reject`);
      setPendingReviews(prev => prev.filter(r => r._id !== id));
      showNotification({ title: 'Отклонено', message: 'Рецензия отклонена', type: 'info' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось отклонить рецензию', type: 'error' });
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="container admin-panel">
      <button onClick={() => navigate('/')} className="back-btn">← На главную</button>
      <h1 className="admin-title">🛡️ Админ-панель</h1>
      <p className="admin-welcome">Добро пожаловать, {user?.nickname}!</p>

      <div className="admin-section glass-card">
        <h2>💬 Комментарии на модерации ({pendingComments.length})</h2>
        {pendingComments.length === 0 ? (
          <p className="admin-empty">Нет комментариев для проверки</p>
        ) : (
          <div className="admin-list">
            {pendingComments.map(c => (
              <div key={c._id} className="admin-item">
                <div className="admin-item-header">
                  <span className="admin-item-author">👤 {c.userId?.nickname || 'Пользователь'}</span>
                  <span className="admin-item-film">🎬 {c.filmId?.title || 'Фильм'}</span>
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

      <div className="admin-section glass-card">
        <h2>📝 Рецензии на модерации ({pendingReviews.length})</h2>
        {pendingReviews.length === 0 ? (
          <p className="admin-empty">Нет рецензий для проверки</p>
        ) : (
          <div className="admin-list">
            {pendingReviews.map(r => (
              <div key={r._id} className="admin-item">
                <div className="admin-item-header">
                  <span className="admin-item-author">👤 {r.userId?.nickname || 'Пользователь'}</span>
                  <span className="admin-item-film">🎬 {r.filmId?.title || 'Фильм'}</span>
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
  const [user, setUser] = useState(null);
  const [searchError, setSearchError] = useState('');
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

  const loadFilms = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/films?page=${pageNum}&limit=20`);
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
  }, []);

  useEffect(() => {
    loadFilms(page);
  }, [page, loadFilms]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const loadMore = useCallback(() => {
    if (page < totalPages) {
      setPage(prev => prev + 1);
    }
  }, [page, totalPages]);

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
          console.warn('Не удалось сохранить событие, но фильм добавлен:', eventErr?.message || eventErr);
        }
      }

      setPage(1);

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

  if (loading && page === 1) return <div className="loading">Загрузка...</div>;

  const topFilms = [...films].filter(f => f.averageRating > 0).sort((a, b) => b.averageRating - a.averageRating).slice(0, 5);

  return (
    <div className="container">
      <Header user={user} onLogout={handleLogout} />

      <div className="hero glass-card">
        <h2>Храм честного кино — 20 критериев для подробной оценки</h2>
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

      {films.length === 0 ? (
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
              <button onClick={loadMore} className="load-more-btn">Загрузить ещё</button>
              <span className="page-info">{page} / {totalPages}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
  const [commentError, setCommentError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ title: '', text: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { showNotification } = useNotification();
  const { addEvent } = useActivityEvents();
  const [showUsersModal, setShowUsersModal] = useState(false);

  const [base1, setBase1] = useState([5,5,5,5,5]);
  const [base2, setBase2] = useState([5,5,5,5,5]);
  const [base3, setBase3] = useState([5,5,5,5,5]);
  const [base4, setBase4] = useState([5,5,5,5,5]);
  const [subjectiveM, setSubjectiveM] = useState(5);
  const [textReview, setTextReview] = useState('');

  useEffect(() => {
    loadFilm();
    loadFilmUsers();
    loadComments();
    loadReviews();
    loadCurrentUser();
    
  }, [id]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRatingMode && !isSaving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRatingMode, isSaving]);

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

  const loadFilm = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/films/${id}`);
      setFilm(response.data);
      if (response.data?.userRating) {
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
    const avg1 = base1.reduce((a,b)=>a+b,0)/5;
    const avg2 = base2.reduce((a,b)=>a+b,0)/5;
    const avg3 = base3.reduce((a,b)=>a+b,0)/5;
    const avg4 = base4.reduce((a,b)=>a+b,0)/5;
    const sum = avg1 + avg2 + avg3 + avg4;
    const T = sum * TECHNICAL_MULTIPLIER;
    const vibeMultiplier = 1 + (subjectiveM - 1) * VIBE_STEP;
    const finalRaw = T * vibeMultiplier;
    return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(finalRaw)));
  }, [base1, base2, base3, base4, subjectiveM]);

  const saveRating = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы оценивать фильмы', type: 'warning' });
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
      await loadFilm();
      await loadFilmUsers();
      setIsRatingMode(false);

      if (currentUser && film) {
        await addEvent({
          type: 'rating',
          user: currentUser.nickname,
          film: film.title,
          filmId: film._id,
          score: response.data.rating.finalScore
        });
      }

      showNotification({ title: 'Оценка сохранена!', message: 'Ваша оценка успешно добавлена', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось сохранить оценку', type: 'error' });
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
      showNotification({ title: 'Ошибка', message: 'Не удалось загрузить детали оценки', type: 'error' });
    }
  };

    const openUsersModal = () => {
    setShowUsersModal(true);
  };

  const toggleRatingMode = () => {
    setIsRatingMode(prev => !prev);
  };
   
  const addComment = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы комментировать', type: 'warning' });
      navigate('/login');
      return;
    }

    const trimmedText = commentText.trim();
    if (!trimmedText) {
      setCommentError('Введите текст комментария');
      return;
    }

    if (trimmedText.length < 2) {
      setCommentError('Комментарий должен содержать минимум 2 символа');
      return;
    }

    setCommentError('');

    try {
      await api.post('/comments', { filmId: id, text: trimmedText });
      setCommentText('');
      await loadComments();

      if (currentUser && film) {
        await addEvent({
          type: 'comment',
          user: currentUser.nickname,
          film: film.title,
          filmId: film._id
        });
      }

      showNotification({ title: 'Комментарий добавлен', message: 'Ваш комментарий опубликован', type: 'success' });
    } catch (err) {
      setCommentError(err.response?.data?.error || 'Не удалось добавить комментарий');
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось добавить комментарий', type: 'error' });
    }
  };

  const likeComment = async (commentId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы ставить лайки', type: 'warning' });
      navigate('/login');
      return;
    }
    try {
      await api.post(`/comments/${commentId}/like`);
      await loadComments();
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось поставить лайк', type: 'error' });
    }
  };

  const addReview = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы написать рецензию', type: 'warning' });
      navigate('/login');
      return;
    }
    if (!userRating) {
      showNotification({ title: 'Сначала оцените фильм', message: 'Чтобы написать рецензию, нужно оценить фильм', type: 'warning' });
      return;
    }

    const trimmedTitle = newReview.title.trim();
    const trimmedText = newReview.text.trim();

    if (!trimmedTitle || !trimmedText) {
      showNotification({ title: 'Заполните все поля', message: 'Заголовок и текст рецензии обязательны', type: 'warning' });
      return;
    }

    try {
      await api.post('/reviews', {
        filmId: id,
        ratingId: userRating._id,
        title: trimmedTitle,
        text: trimmedText
      });
      setNewReview({ title: '', text: '' });
      setShowReviewForm(false);
      await loadReviews();

      if (currentUser && film) {
        await addEvent({
          type: 'review',
          user: currentUser.nickname,
          film: film.title,
          filmId: film._id
        });
      }

      showNotification({ title: 'Рецензия добавлена!', message: 'Ваша рецензия опубликована', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось добавить рецензию', type: 'error' });
    }
  };

  const likeReview = async (reviewId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы ставить лайки', type: 'warning' });
      navigate('/login');
      return;
    }
    try {
      await api.post(`/reviews/${reviewId}/like`);
      await loadReviews();
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось поставить лайк', type: 'error' });
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!film) return <div className="error">Фильм не найден</div>;

  const previewScore = calculatePreview();

  const isDogville = film?.title === DOGVILLE_TITLE;

return (
  <div className="container">
    <div className={`film-page ${isDogville ? 'film-page-dogville' : ''}`}>
        <button onClick={() => navigate('/')} className="back-btn">← На главную</button>

        <div className="film-header">
          <img src={film.poster || '/no-poster.jpg'} alt={film.title} className="film-poster-large" />
          <div className="film-details">
            <h1>{film.title}</h1>
{isDogville && (
  <div className="dogville-badge">⭐ Сегодняшний разбор в 20:30 в «Telegram»</div>
)}
            <p className="film-year">{film.year}</p>
            <p className="film-description">{film.description}</p>
            <p><strong>Режиссёр:</strong> {film.director}</p>
            <p><strong>Актёры:</strong> {film.actors?.join(', ') || 'Нет данных'}</p>
            <div className="film-genres">
              {film.genres?.map((g,i) => <span key={i} className="genre-tag">{g}</span>)}
            </div>

            <div className="film-rating-stats">
              <div className="avg-rating" style={{ color: getScoreColor(film.averageRating) }}>
                {film.averageRating ? `${film.averageRating.toFixed(1)}` : 'Нет оценок'}
              </div>
              <span>👥 {film.votesCount || 0} оценок</span>
            </div>

            {userRating && (
              <div className="your-rating glass-card">
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

        <div className="reviews-section glass-card">
          <div className="reviews-header">
            <h3>📝 Рецензии ({reviews.length})</h3>
            {currentUser && (
              <button className="btn-add-review" onClick={() => setShowReviewForm(prev => !prev)}>
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
              <div key={review._id} id={review._id} className="review-card">
                <div className="review-header">
                  <div className="review-author">
                    <span className="review-nickname">{review.userId?.nickname || 'Пользователь'}</span>
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

               {/* ОЦЕНИЛИ ФИЛЬМ */}
        <div className="film-users glass-card">
          <div className="film-users-header">
            <h3>👥 Оценили фильм: <strong>{filmUsers.length}</strong> человек</h3>
            {filmUsers.length > 0 && (
              <button className="btn-show-users" onClick={openUsersModal}>
                👁️ Подробнее
              </button>
            )}
          </div>
          
          {usersLoading ? (
            <div className="loading-users">Загрузка...</div>
          ) : filmUsers.length === 0 ? (
            <p className="no-users">Пока никто не оценил этот фильм. Будьте первым! ⭐</p>
          ) : (
            <div className="users-preview">
              {filmUsers.slice(0, 5).map((item) => (
                <div key={`${item.user._id}-${item.rating._id}`} className="user-rating-item-preview">
                  <Link to={`/user/${item.user._id}`} className="user-link">👤 {item.user.nickname || 'Пользователь'}</Link>
                  <span className="user-rating-score" style={{ color: getScoreColor(item.rating.finalScore) }}>
                    {item.rating.finalScore}
                  </span>
                </div>
              ))}
              {filmUsers.length > 5 && (
                <div className="more-users">и ещё {filmUsers.length - 5} человек...</div>
              )}
            </div>
          )}
        </div>

        {/* МОДАЛЬНОЕ ОКНО СО ВСЕМИ ОЦЕНКАМИ */}
        {showUsersModal && (
          <div className="modal-overlay" onClick={() => setShowUsersModal(false)}>
            <div className="modal-content users-modal" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowUsersModal(false)}>✕</button>
              <h2>👥 Все оценки фильма</h2>
              <p className="modal-subtitle">Всего <strong>{filmUsers.length}</strong> человек</p>
              
              <div className="users-modal-list">
                {filmUsers.map((item) => (
                  <div key={`${item.user._id}-${item.rating._id}`} className="user-rating-item-full">
                    <div className="user-info">
                      <Link to={`/user/${item.user._id}`} className="user-link">
                        👤 {item.user.nickname || 'Пользователь'}
                      </Link>
                      {item.user.isAdmin && <span className="admin-badge">👑</span>}
                    </div>
                    <div className="rating-info">
                      <span className="user-rating-score" style={{ color: getScoreColor(item.rating.finalScore) }}>
                        {item.rating.finalScore}
                      </span>
                      <button className="details-btn" onClick={() => {
                        setShowUsersModal(false);
                        openRatingDetails(item.rating);
                      }}>
                        🔍 Детали
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isRatingMode && (
          <div className="rating-form glass-card">
            <h2>Оценка по 20 критериям</h2>
            <p className="rating-hint">Оценка от 1 до 10 (1 — ужасно, 10 — идеально)</p>

            {[0,1,2,3].map((baseIndex) => {
              const bases = [base1, base2, base3, base4];
              return (
                <div key={baseIndex} className="rating-base">
                  <h3>{baseNames[baseIndex]}</h3>
                  {criteriaNames[baseIndex].map((name, critIndex) => (
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
                          value={bases[baseIndex][critIndex]}
                          onChange={(e) => handleRatingChange(baseIndex, critIndex, e.target.value)}
                          style={{ ['--fill']: `${((bases[baseIndex][critIndex] - 1) / 9) * 100}%` }}
                        />
                        <span>10</span>
                        <span className="value-display">{bases[baseIndex][critIndex]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

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
                  style={{ ['--fill']: `${((subjectiveM - 1) / 9) * 100}%` }}
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
              <div className="preview-score" style={{ color: getScoreColor(previewScore) }}>{previewScore}</div>
              <div className="score-bar" style={{ width: `${(previewScore - MIN_SCORE) / (MAX_SCORE - MIN_SCORE) * 100}%`, background: 'linear-gradient(to right, #7c3aed, #22d3ee)' }}></div>
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

        <div className="comments-section glass-card">
          <h3>💬 Комментарии ({comments.length})</h3>
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment._id} id={comment._id} className="comment-item">
                <div className="comment-author">
                  <span className="comment-nickname">{comment.userId?.nickname || 'Пользователь'}</span>
                  {comment.userId?.isAdmin && <span className="admin-badge">👑</span>}
                </div>
                <p className="comment-text">{comment.text}</p>
                <div className="comment-actions">
                  <button className="like-btn" onClick={() => likeComment(comment._id)}>❤️ {comment.likes?.length || 0}</button>
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
                onChange={(e) => { setCommentText(e.target.value); setCommentError(''); }}
                onKeyPress={(e) => e.key === 'Enter' && addComment()}
              />
              <button onClick={addComment}>📤</button>
              {commentError && <div className="error-msg">{commentError}</div>}
            </div>
          )}
        </div>

        {film.trailer && (
          <div className="trailer glass-card">
            <h3>Трейлер</h3>
            <iframe
              src={film.trailer}
              title="Трейлер"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation"
              style={{ width: '100%', height: '380px', border: 'none' }}
            />
          </div>
        )}
      </div>

      <RatingDetailsModal rating={selectedRating} onClose={() => setSelectedRating(null)} />
    </div>
  );
}

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

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

    if (!validateEmail(email)) {
      setError('Введите корректный email');
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError('Пароль должен содержать минимум 6 символов');
      setLoading(false);
      return;
    }

    if (!isLogin && !validateNickname(nickname)) {
      setError('Никнейм должен быть от 2 до 20 символов');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const data = isLogin ? { email, password } : { email, password, nickname };

      const response = await api.post(endpoint, data);
      localStorage.setItem('token', response.data.token);
      navigate('/');
      showNotification({ title: isLogin ? 'Добро пожаловать!' : 'Регистрация прошла успешно!', message: isLogin ? 'Вы вошли в аккаунт' : 'Добро пожаловать в Синефилиум!', type: 'success' });
    } catch (err) {
      setError(err.response?.data?.error || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="auth-box glass-card">
        <h1>{isLogin ? 'Вход в Синефилиум' : 'Регистрация'}</h1>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {!isLogin && (
            <input type="text" placeholder="Никнейм" value={nickname} onChange={(e) => setNickname(e.target.value)} required minLength={2} maxLength={20} />
          )}
          <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="submit" disabled={loading}>{loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}</button>
        </form>
        <p onClick={() => { setIsLogin(!isLogin); setError(''); }} className="toggle-auth">
          {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
        </p>
      </div>
    </div>
  );
}

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(null);
  const [adminSecret, setAdminSecret] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [achievementProgress, setAchievementProgress] = useState(null);
  const [activeTab, setActiveTab] = useState('ratings');
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { addEvent } = useActivityEvents();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, [navigate]);

  const loadAchievementProgress = async (userData) => {
    try {
      const response = await api.get('/users/me/achievements');
      setAchievementProgress(response.data);

      if (response.data?.achievements) {
        const oldAchievements = userData?.achievements || [];
        const newAchievements = response.data.achievements;
        const freshAchievements = newAchievements.filter(ach => !oldAchievements.includes(ach));

        if (freshAchievements.length > 0) {
          try {
            await addEvent({
              type: 'achievement',
              user: userData?.nickname || 'Пользователь',
              film: 'система',
              filmId: 'system',
              metadata: { achievements: freshAchievements }
            });
            console.log('Событие о достижениях создано:', freshAchievements);
          } catch (err) {
            console.error('Ошибка создания события о достижениях:', err);
          }
        }

        setUser(prev => ({ ...prev, achievements: newAchievements, totalPoints: response.data.totalPoints || prev?.totalPoints }));
      }
    } catch (err) {
      console.error('Ошибка загрузки прогресса достижений:', err);
    }
  };

  const loadProfile = async () => {
    try {
      const [userResponse, ratingsResponse, reviewsResponse] = await Promise.all([
        api.get('/auth/me'),
        api.get('/ratings/user'),
        api.get('/reviews/user')
      ]);
      const userData = userResponse.data;
      setUser(userData);
      setRatings(ratingsResponse.data || []);
      setReviews(reviewsResponse.data || []);
      await loadAchievementProgress(userData);
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
    showNotification({ title: 'До свидания!', message: 'Вы вышли из аккаунта', type: 'info' });
  };

  const openRatingDetails = async (rating) => {
  try {
    const ratingId = rating._id || rating.id;
    if (!ratingId) {
      showNotification({ 
        title: 'Ошибка', 
        message: 'ID оценки не найден', 
        type: 'error' 
      });
      return;
    }

    const response = await api.get(`/ratings/${ratingId}/details`);
    setSelectedRating(response.data);
  } catch (err) {
    console.error('Ошибка загрузки деталей оценки:', err);
    showNotification({ 
      title: 'Ошибка', 
      message: err.response?.data?.error || 'Не удалось загрузить детали оценки', 
      type: 'error' 
    });
  }
};

  const likeReview = async (reviewId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы ставить лайки', type: 'warning' });
      navigate('/login');
      return;
    }
    try {
      await api.post(`/reviews/${reviewId}/like`);
      const response = await api.get('/reviews/user');
      setReviews(response.data || []);
      showNotification({ title: 'Лайк поставлен!', message: 'Вы оценили рецензию', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось поставить лайк', type: 'error' });
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
      showNotification({ title: 'Поздравляем!', message: 'Вы стали администратором! 👑', type: 'success' });
    } catch (err) {
      setAdminError(err.response?.data?.error || 'Ошибка активации');
    } finally {
      setAdminLoading(false);
    }
  };

  const avgRating = ratings.length ? (ratings.reduce((sum,r)=>sum+r.finalScore,0)/ratings.length).toFixed(1) : 'Нет';

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!user) return <div className="error">Не удалось загрузить профиль</div>;

  const hasDogvilleRating = ratings.some(
  r => (r.filmId?.title === DOGVILLE_TITLE || r.film?.title === DOGVILLE_TITLE) &&
       new Date() <= DOGVILLE_DEADLINE
);

return (
    <div className={`container profile-page ${hasDogvilleRating ? 'profile-dogville' : ''}`}>
      <button onClick={() => navigate('/')} className="back-btn">← На главную</button>

      <div className="profile-header glass-card">
        <div className="profile-avatar">
          <div className="avatar-placeholder">{user.nickname?.[0] || '?'}</div>
        </div>
        <div className="profile-info">
          <h1>
  {user.nickname || 'Пользователь'}
  {user.isAdmin && <span className="admin-badge"> 👑</span>}
  {hasDogvilleRating && <span className="dogville-icon">⭐</span>}
</h1>
{hasDogvilleRating && (
  <div className="profile-status">🏆 «Окно Овертона» — оценка Догвилля</div>
)}
          <p>📧 {user.email}</p>
          <div className="profile-stats">
            <p>📊 Средняя оценка: <strong>{avgRating}</strong></p>
            <p>🏆 Всего оценок: <strong>{ratings.length}</strong></p>
            <p>📝 Рецензий: <strong>{reviews.length}</strong></p>
            <p>⭐ Баллов: <strong>{user.totalPoints || 0}</strong></p>
          </div>

          <div className="achievements-section" style={{ marginTop: '20px' }}>
            <h3>🏅 Достижения</h3>
            {user.achievements?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginTop: '10px' }}>
                {user.achievements.map(ach => (
                  <div key={ach} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '24px' }}>🏅</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{ach}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#888', padding: '10px 0' }}>Нет достижений. Начните оценивать фильмы, писать рецензии и комментарии!</p>
            )}
          </div>

          {!user.isAdmin && (
            <div className="admin-activation glass-card">
              <h4>🔑 Стать администратором</h4>
              <p className="admin-hint">Введите секретный ключ, чтобы получить права администратора</p>
              <div className="admin-form">
                <input type="password" placeholder="Секретный ключ..." value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} />
                <button onClick={activateAdmin} disabled={adminLoading}>{adminLoading ? 'Проверка...' : '👑 Активировать'}</button>
              </div>
              {adminError && <div className="error-msg">{adminError}</div>}
              {adminSuccess && <div className="success-msg">{adminSuccess}</div>}
            </div>
          )}
          <button onClick={logout} className="logout-btn">🚪 Выйти</button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="profile-tabs glass-card">
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'ratings' ? 'active' : ''}`}
            onClick={() => setActiveTab('ratings')}
          >
            ⭐ Мои оценки ({ratings.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            📝 Мои рецензии ({reviews.length})
          </button>
        </div>

        {/* Вкладка с оценками */}
        {activeTab === 'ratings' && (
          <div className="profile-ratings">
            <h2>Мои оценки</h2>
            {ratings.length === 0 ? (
              <p>Вы еще не оценили ни одного фильма</p>
            ) : (
              <div className="ratings-list">
                {ratings.map((rating) => (
                  <div key={rating._id} className="rating-item">
                    <Link to={`/film/${rating.filmId?._id || rating.film?._id}`}>
                      <div className="rating-film-info">
                        <img src={rating.filmId?.poster || rating.film?.poster || '/no-poster.jpg'} alt={rating.filmId?.title || rating.film?.title || 'Фильм'} className="rating-poster-small" />
                        <div>
                          <h4>{rating.filmId?.title || rating.film?.title || 'Фильм'}</h4>
                          <p>{rating.filmId?.year || rating.film?.year}</p>
                        </div>
                      </div>
                    </Link>
                    <div className="rating-score" style={{ color: getScoreColor(rating.finalScore) }}>{rating.finalScore}</div>
                    <button className="details-btn" onClick={() => openRatingDetails(rating)}>🔍 Детали</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Вкладка с рецензиями */}
        {activeTab === 'reviews' && (
          <div className="profile-reviews">
            <h2>Мои рецензии</h2>
            {reviews.length === 0 ? (
              <p>Вы еще не написали ни одной рецензии</p>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="review-item">
                    <div className="review-header">
                      <Link to={`/film/${review.filmId?._id || review.film?._id}`} className="review-film-link">
                        <h3 className="review-title">{review.title}</h3>
                        <p className="review-film-name">
                          🎬 {review.filmId?.title || review.film?.title || 'Фильм'} 
                          ({review.filmId?.year || review.film?.year || 'N/A'})
                        </p>
                      </Link>
                      <div className="review-rating">
                        ⭐ Оценка: {review.ratingId?.finalScore || 'Нет оценки'}
                      </div>
                    </div>
                    
                    <p className="review-text">{review.text}</p>
                    
                    <div className="review-footer">
                      <div className="review-actions">
                        <button 
                          className="like-btn" 
                          onClick={() => likeReview(review._id)}
                        >
                          ❤️ {review.likes?.length || 0}
                        </button>
                        <span className="review-date">
                          📅 {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <Link to={`/film/${review.filmId?._id || review.film?._id}`} className="review-go-to-film">
                        🎬 Перейти к фильму
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <RatingDetailsModal rating={selectedRating} onClose={() => setSelectedRating(null)} />
    </div>
  );
}

function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(null);
  const [activeTab, setActiveTab] = useState('ratings');
  const [currentUser, setCurrentUser] = useState(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadUserProfile();
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

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/users/${id}`);
      setUser(response.data.user);
      setRatings(response.data.ratings || []);
      setReviews(response.data.reviews || []);
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err);
      if (err.response?.status === 404) {
        setUser(null);
      }
      showNotification({
        title: 'Ошибка',
        message: err.response?.status === 404 ? 'Пользователь не найден' : 'Не удалось загрузить профиль',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

const openRatingDetails = async (rating) => {
  try {
    const ratingId = rating._id || rating.id;
    if (!ratingId) {
      showNotification({ 
        title: 'Ошибка', 
        message: 'ID оценки не найден', 
        type: 'error' 
      });
      return;
    }

    const response = await api.get(`/ratings/${ratingId}/details`);
    setSelectedRating(response.data);
  } catch (err) {
    console.error('Ошибка загрузки деталей оценки:', err);
    showNotification({ 
      title: 'Ошибка', 
      message: err.response?.data?.error || 'Не удалось загрузить детали оценки', 
      type: 'error' 
    });
  }
};

  const likeReview = async (reviewId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ title: 'Доступ запрещён', message: 'Войдите в систему, чтобы ставить лайки', type: 'warning' });
      navigate('/login');
      return;
    }
    try {
      await api.post(`/reviews/${reviewId}/like`);
      // Обновляем список рецензий
      const response = await api.get(`/users/${id}`);
      setReviews(response.data.reviews || []);
      showNotification({ title: 'Лайк поставлен!', message: 'Вы оценили рецензию', type: 'success' });
    } catch (err) {
      showNotification({ title: 'Ошибка', message: err.response?.data?.error || 'Не удалось поставить лайк', type: 'error' });
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  if (!user) {
    return (
      <div className="container">
        <button onClick={() => navigate('/')} className="back-btn">← На главную</button>
        <div className="error-msg" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>😕 Пользователь не найден</h2>
          <p>Возможно, этот пользователь был удалён или вы перешли по неверной ссылке.</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?._id === user._id;

  const hasDogvilleRating = ratings.some(
  r => (r.film?.title === DOGVILLE_TITLE || r.filmId?.title === DOGVILLE_TITLE) &&
       new Date() <= DOGVILLE_DEADLINE
);

return (
  <div className={`container profile-page ${hasDogvilleRating ? 'profile-dogville' : ''}`}>
      <button onClick={() => navigate('/')} className="back-btn">← На главную</button>

      <div className="profile-header glass-card">
        <div className="profile-avatar">
          <div className="avatar-placeholder">{user.nickname?.[0] || '?'}</div>
        </div>
        <div className="profile-info">
          <h1>
  {user.nickname || 'Пользователь'}
  {user.isAdmin && <span className="admin-badge"> 👑</span>}
  {hasDogvilleRating && <span className="dogville-icon">⭐</span>}
</h1>
{hasDogvilleRating && (
  <div className="profile-status">🏆 «Окно Овертона» — оценка Догвилля</div>
)}
          <p>📅 Зарегистрирован: {formatDate(user.registeredAt)}</p>
          <p>⭐ Всего оценок: <strong>{ratings.length}</strong></p>
          <p>📝 Рецензий: <strong>{reviews.length}</strong></p>
          <p>🏆 Баллов: <strong>{user.totalPoints || 0}</strong></p>
          
          <div className="achievements-section" style={{ marginTop: '15px' }}>
            <h4>🏅 Достижения</h4>
            {user.achievements?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {user.achievements.map(ach => (
                  <span key={ach} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: '20px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    🏅 {ach}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: '#888', fontSize: '13px' }}>Нет достижений</p>
            )}
          </div>

          {isOwnProfile && (
            <button onClick={() => navigate('/profile')} className="btn-edit-profile" style={{ marginTop: '15px' }}>
              ✏️ Редактировать профиль
            </button>
          )}
        </div>
      </div>

      {/* Вкладки */}
      <div className="profile-tabs glass-card">
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'ratings' ? 'active' : ''}`}
            onClick={() => setActiveTab('ratings')}
          >
            ⭐ Оценки ({ratings.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            📝 Рецензии ({reviews.length})
          </button>
        </div>

        {/* Вкладка с оценками */}
        {activeTab === 'ratings' && (
          <div className="profile-ratings">
            <h2>Оценки пользователя</h2>
            {ratings.length === 0 ? (
              <p>Пользователь еще не оценил ни одного фильма</p>
            ) : (
              <div className="ratings-list">
                {ratings.map((rating) => (
                  <div key={rating._id} className="rating-item">
                    <Link to={`/film/${rating.film?._id || rating.filmId?._id}`}>
                      <div className="rating-film-info">
                        <img src={rating.film?.poster || rating.filmId?.poster || '/no-poster.jpg'} alt={rating.film?.title || rating.filmId?.title || 'Фильм'} className="rating-poster-small" />
                        <div>
                          <h4>{rating.film?.title || rating.filmId?.title || 'Фильм'}</h4>
                          <p>{rating.film?.year || rating.filmId?.year}</p>
                        </div>
                      </div>
                    </Link>
                    <div className="rating-score" style={{ color: getScoreColor(rating.finalScore) }}>{rating.finalScore}</div>
                    <button className="details-btn" onClick={() => openRatingDetails(rating)}>🔍 Детали</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Вкладка с рецензиями */}
        {activeTab === 'reviews' && (
          <div className="profile-reviews">
            <h2>Рецензии пользователя</h2>
            {reviews.length === 0 ? (
              <p>Пользователь еще не написал ни одной рецензии</p>
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => (
                  <div key={review._id} className="review-item">
                    <div className="review-header">
                      <Link to={`/film/${review.film?._id || review.filmId?._id}`} className="review-film-link">
                        <h3 className="review-title">{review.title}</h3>
                        <p className="review-film-name">
                          🎬 {review.film?.title || review.filmId?.title || 'Фильм'} 
                          ({review.film?.year || review.filmId?.year || 'N/A'})
                        </p>
                      </Link>
                      <div className="review-rating">
                        ⭐ Оценка: {review.ratingId?.finalScore || 'Нет оценки'}
                      </div>
                    </div>
                    
                    <p className="review-text">{review.text}</p>
                    
                    <div className="review-footer">
                      <div className="review-actions">
                        <button 
                          className="like-btn" 
                          onClick={() => likeReview(review._id)}
                        >
                          ❤️ {review.likes?.length || 0}
                        </button>
                        <span className="review-date">
                          📅 {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <Link to={`/film/${review.film?._id || review.filmId?._id}`} className="review-go-to-film">
                        🎬 Перейти к фильму
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <RatingDetailsModal rating={selectedRating} onClose={() => setSelectedRating(null)} />
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

function App() {
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  const showNotification = useCallback(({ title, message, type = 'success' }) => {
    setNotification({ isOpen: true, title, message, type });
    // Auto-close after 5s
    setTimeout(() => setNotification(prev => ({ ...prev, isOpen: false })), 5000);
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/top" element={<TopUsersPage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/film/:id" element={<FilmPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/user/:id" element={<UserProfilePage />} />
        </Routes>
      </Router>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </NotificationContext.Provider>
  );
}

export default App;
