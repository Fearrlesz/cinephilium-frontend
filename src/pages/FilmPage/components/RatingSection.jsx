import React, { useState } from 'react';
import { getAccessToken } from '../../../api/client';
import { communityValue, yourCombined } from '../../../utils/scoring';
import usePointerCoarse from '../hooks/usePointerCoarse';
import useVibeRating from '../hooks/useVibeRating';
import RatingContext from './RatingContext';
import RatingPanel from './RatingPanel';
import CriteriaModal from './CriteriaModal';
import './RatingPanel.css';

/**
 * F1: контейнер блока оценки. Держит vibe-состояние и модалку,
 * не смешивая их с остальной страницей фильма.
 *
 * DECISION: F1/5A — структура VibeRating (hook + VibeTrack), FullRatingModal
 * (CriteriaModal + useRatingForm) и RatingSection-контейнер. Старый
 * useRatingForm переписан под черновик модалки, а не расширен stage-флагами.
 */
export default function RatingSection({
  film,
  userRating,
  setUserRating,
  reloadFilm,
  reloadUsers,
  showNotification,
  navigate
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const coarse = usePointerCoarse();
  const authenticated = Boolean(getAccessToken());

  const vibe = useVibeRating({
    filmId: film?._id,
    userRating,
    setUserRating,
    reloadFilm,
    reloadUsers,
    showNotification,
    navigate
  });

  // DECISION: F1-fix — «Ваша» существует только для full. Vibe-only не даёт
  // combinedScore на бэке (0 = «не вычислено»), поэтому здесь прочерк и пустая delta.
  const yourValue = yourCombined(userRating);

  const communityCombined = communityValue(film?.averageCombined, film?.fullCount);
  const vibeLocked = Boolean(
    vibe.lockedUntil && new Date(vibe.lockedUntil).getTime() > Date.now()
  );

  const requireAuth = () => {
    showNotification?.({
      title: 'Доступ запрещён',
      message: 'Войдите в систему, чтобы оценивать фильмы',
      type: 'warning'
    });
    navigate?.('/login');
  };

  const openCriteria = () => {
    if (!authenticated) {
      requireAuth();
      return;
    }
    setModalOpen(true);
  };

  const handleSaved = rating => {
    setUserRating(rating);
    reloadFilm?.({ silent: true });
    // F1-fix: после full список «Оценили фильм» должен показать новую оценку,
    // иначе счётчик и список остаются старыми до перезагрузки страницы.
    reloadUsers?.();
  };

  return (
    <section className="rating-section" aria-label="Оценка фильма">
      <RatingContext
        community={communityCombined}
        yours={yourValue}
      />

      <RatingPanel
        film={film}
        userRating={userRating}
        authenticated={authenticated}
        coarse={coarse}
        vibe={vibe.localVibe}
        onVibeInput={vibe.setLocalVibe}
        onVibeCommit={vibe.commitVibe}
        isSavingVibe={vibe.isSaving}
        vibeError={vibe.error}
        vibeLocked={vibeLocked}
        onOpenCriteria={openCriteria}
        onRequireAuth={requireAuth}
      />

      {modalOpen && (
        <CriteriaModal
          film={film}
          userRating={userRating}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
          showNotification={showNotification}
        />
      )}
    </section>
  );
}
