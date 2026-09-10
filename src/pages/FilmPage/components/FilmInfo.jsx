import React from 'react';
import { getScoreColor } from '../../../utils/constants';

function FilmInfo({ film, userRating, onToggleRating, isRatingMode }) {
  return (
    <div className="film-header">
      <img src={film.poster || '/no-poster.jpg'} alt={film.title} className="film-poster-large" />
      <div className="film-details">
        <h1>{film.title}</h1>
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
        <button className="rate-btn" onClick={onToggleRating}>
          {isRatingMode ? 'Скрыть форму' : (userRating ? '✏️ Изменить оценку' : '⭐ Оценить фильм')}
        </button>
      </div>
    </div>
  );
}

export default FilmInfo;
