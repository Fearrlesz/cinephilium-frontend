import React from 'react';
import { getPosterUrl, handleImgError } from '../../../utils/posterUrl';
import './FilmInfo.css';

/**
 * F1: из шапки убраны старые averageRating/votesCount, «Ваша оценка»
 * и кнопка «Оценить фильм» — их заменяет RatingSection. Здесь остаются
 * постер, заголовок и метаданные фильма.
 */
function FilmInfo({ film }) {
  return (
    <div className="film-header">
      <img
        src={getPosterUrl(film.poster)}
        alt={film.title}
        className="film-poster-large"
        onError={handleImgError}
      />

      <div className="film-details">
        <h1>{film.title}</h1>
        <p className="film-year">{film.year}</p>
        <p className="film-description">{film.description}</p>
        <p><strong>Режиссёр:</strong> {film.director}</p>
        <p><strong>Актёры:</strong> {film.actors?.join(', ') || 'Нет данных'}</p>
        <div className="film-genres">
          {film.genres?.map((genre, index) => (
            <span key={index} className="genre-tag">{genre}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FilmInfo;
