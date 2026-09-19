import { Link } from 'react-router-dom';
import { getPosterUrl, handleImgError, PLACEHOLDER } from '../../utils/posterUrl';
import { getScoreColor } from '../../utils/constants';
import './CriticTopMovies.css';

export default function CriticTopMovies({ movies }) {
  return (
    <section className="critic-top">
      <h2>Топ-5 любимых фильмов</h2>

      {movies.length === 0 ? (
        <p className="critic-top__empty">Пока нет оценок</p>
      ) : (
        <div className="critic-top__grid">
          {movies.map((r) => {
            const film = r.film || {};
            const poster = film.poster ? getPosterUrl(film.poster) : PLACEHOLDER;
            return (
              <Link
                key={r.id || r._id}
                to={`/film/${film._id}`}
                className="critic-top__card"
              >
                <div className="critic-top__poster">
                  <img
                    src={poster}
                    alt={film.title}
                    onError={handleImgError}
                    loading="lazy"
                  />
                </div>
                <div className="critic-top__body">
                  <div className="critic-top__title">{film.title}</div>
                  <div className="critic-top__year">{film.year}</div>
                  <div className="critic-top__scores">
                    <span
                      className="critic-top__score"
                      style={{ color: getScoreColor(r.combinedScore) }}
                    >
                      ⭐ {r.combinedScore}
                    </span>
                    <span className="critic-top__sub">
                      ТБ {r.technicalScore} · 💫 {r.vibe}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
