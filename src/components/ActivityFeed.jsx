import React from 'react';
import { Link } from 'react-router-dom';
import { sanitizeText } from '../utils/ratingUtils';

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

export default ActivityFeed;
