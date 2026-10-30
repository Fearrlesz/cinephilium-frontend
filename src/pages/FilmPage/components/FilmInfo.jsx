import React from 'react';
import './FilmInfo.css';

/**
 * Информационный блок героя: тэглайн, название, мета, синопсис.
 * Постер и панель оценок живут рядом, в FilmPage.
 */
function FilmInfo({ film, children }) {
  const genres = film.genres || [];
  const meta = [film.year, film.director, genres.join(', ')]
    .filter(Boolean)
    .join('· ');

  return (
    <div className="hero-info">
      <p className="tagline">{genres.length ? genres.join('· ') : 'Кино'}</p>

      <h1 className="h1 hero-title">{film.title}</h1>

      {meta && <p className="hero-meta">{meta}</p>}

      {film.description && (
        <p className="synopsis hero-synopsis">{film.description}</p>
      )}

      {children}
    </div>
  );
}

export default FilmInfo;
