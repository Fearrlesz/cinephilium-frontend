import React, { useEffect } from 'react';
import useRatingForm from '../hooks/useRatingForm';
import RatingForm from './RatingForm';
import './CriteriaModal.css';

/**
 * F1: модалка полной оценки. Черновик и preview живут внутри;
 * сохранение — full-payload (включая vibe), поэтому full-оценка
 * редактируется здесь целиком, а не отдельным vibe-запросом.
 *
 * DECISION: F1/6A — full read-only в панели, изменения только здесь:
 * vibe и 15 критериев уходят одним POST /ratings.
 */
export default function CriteriaModal({
  film,
  userRating,
  onClose,
  onSaved,
  showNotification
}) {
  const form = useRatingForm({
    filmId: film?._id,
    userRating,
    showNotification,
    onSaved
  });

  const handleSave = async () => {
    const saved = await form.saveRating();
    if (saved) onClose?.();
  };

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-overlay criteria-modal-overlay" onClick={() => onClose?.()}>
      <div
        className="modal-content criteria-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="criteriaModalTitle"
        onClick={event => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={() => onClose?.()}
          aria-label="Закрыть"
        >
          ✕
        </button>

        <div className="criteria-modal__head">
          <p className="criteria-modal__kicker">Философия Cinephilium</p>
          <h2 className="criteria-modal__title" id="criteriaModalTitle">Авторская система</h2>
          <p className="criteria-modal__sub">15 критериев · 5 блоков · веса</p>
        </div>

        <RatingForm
          scores={form.scores}
          vibe={form.vibe}
          genrePreset={form.genrePreset}
          blockWeights={form.blockWeights}
          weightsValid={form.weightsValid}
          isSaving={form.isSaving}
          error={form.error}
          fieldErrors={form.fieldErrors}
          onScoreChange={form.handleRatingChange}
          onVibeChange={form.setVibe}
          onGenreChange={form.handleGenreChange}
          onWeightChange={form.handleWeightChange}
          onSave={handleSave}
          calculatePreview={form.calculatePreview}
        />
      </div>
    </div>
  );
}
