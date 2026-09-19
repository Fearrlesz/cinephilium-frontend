import { useState } from 'react';
import { getPosterUrl, handleImgError, PLACEHOLDER } from '../../utils/posterUrl';
import './CriticReviews.css';

export default function CriticReviews({ reviews, posters = {} }) {
  const [openId, setOpenId] = useState(null);

  return (
    <section className="critic-reviews">
      <h2>Рецензии</h2>

      {reviews.length === 0 ? (
        <p className="critic-reviews__empty">Пока пусто</p>
      ) : (
        <div className="critic-reviews__list">
          {reviews.map((rev) => {
            const open = openId === rev.id;
            const poster = posters[rev.filmId]
              ? getPosterUrl(posters[rev.filmId])
              : PLACEHOLDER;

            return (
              <article
                key={rev.id}
                className={`critic-reviews__item ${open ? 'open' : ''}`}
              >
                <button
                  className="critic-reviews__header"
                  onClick={() => setOpenId(open ? null : rev.id)}
                >
                  <div className="critic-reviews__poster">
                    <img
                      src={poster}
                      alt={rev.title}
                      onError={handleImgError}
                      loading="lazy"
                    />
                  </div>

                  <div className="critic-reviews__headline">
                    <h3>{rev.title}</h3>
                    {rev.meta && <p className="critic-reviews__meta">{rev.meta}</p>}
                  </div>

                  <span className="critic-reviews__toggle">{open ? '−' : '+'}</span>
                </button>

                {open && (
                  <div className="critic-reviews__text">
                    {rev.text.split('\n\n').map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
