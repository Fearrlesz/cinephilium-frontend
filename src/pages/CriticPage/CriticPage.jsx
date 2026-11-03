import { useCallback, useEffect } from 'react';
import useCriticData from '../../hooks/useCriticData';
import CriticHero from '../../components/Critic/CriticHero/CriticHero';
import CriticTopMovies from '../../components/Critic/CriticTopMovies/CriticTopMovies';
import CriticReviews from '../../components/Critic/CriticReviews/CriticReviews';
import { CRITIC_META, CRITIC_REVIEWS } from '../../utils/mockCriticData';
import './CriticPage.css';

const PAGE_TITLE = `${CRITIC_META?.name ?? 'Критик'} — рецензии и топ фильмов`;

/* ---------- Переиспользуемые куски ---------- */

function CriticPageSkeleton() {
  return (
    <main className="container critic-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Загрузка страницы критика…</span>
      <div className="skeleton skeleton--hero" />
      <div className="skeleton skeleton--row" />
      <div className="skeleton skeleton--row" />
    </main>
  );
}

function CriticPageError({ message, onRetry }) {
  return (
    <main className="container critic-page">
      <div className="error-msg" role="alert">
        <h2> {message}</h2>
        <p>Не удалось загрузить данные критика. Попробуйте ещё раз.</p>
        {onRetry && (
          <button type="button" className="retry-btn" onClick={onRetry}>
            Повторить
          </button>
        )}
      </div>
    </main>
  );
}

/* ---------- Страница ---------- */

export default function CriticPage() {
  // refetch безопасно деструктурируется, даже если хук его пока не возвращает
  const { critic, topMovies, reviewPosters, loading, error, refetch } = useCriticData();

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleRetry = useCallback(() => {
    refetch?.();
  }, [refetch]);

  if (loading) return <CriticPageSkeleton />;

  if (error) {
    return <CriticPageError message={error} onRetry={refetch ? handleRetry : undefined} />;
  }

  return (
    <main className="container critic-page">
      <CriticHero
        critic={critic}
        tagline={CRITIC_META.tagline}
        bio={CRITIC_META.bio}
      />

      {topMovies?.length > 0 && <CriticTopMovies movies={topMovies} />}

      {CRITIC_REVIEWS?.length > 0 && (
        <CriticReviews reviews={CRITIC_REVIEWS} posters={reviewPosters} />
      )}
    </main>
  );
}
