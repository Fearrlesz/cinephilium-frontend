import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildShareCardModel, renderShareCard } from './shareCardRenderer';
import './ShareCardModal.css';

/**
 * Показывает готовую share-карточку сразу после сохранения полной оценки.
 *
 * DECISION: карточка — это canvas → PNG, поэтому в модалке нет «скачивания
 * скриншота DOM»: превью и файл — один и тот же data URL. Пока картинка
 * рендерится, показываем скелетон того же размера, чтобы модалка не прыгала.
 */
export default function ShareCardModal({
  film,
  rating,
  payload,
  currentUser,
  justSaved = false,
  onClose
}) {
  const [dataUrl, setDataUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const closeRef = useRef(null);

  const model = useMemo(
    () => buildShareCardModel({ film, rating, payload, user: currentUser }),
    [film, rating, payload, currentUser]
  );

  useEffect(() => {
    let alive = true;
    setDataUrl('');
    setFailed(false);

    renderShareCard(model)
      .then(url => {
        if (alive) setDataUrl(url);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
    };
  }, [model]);

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

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const fileName = `cinephilium-rating-${film?.year || 'film'}.png`;

  return (
    <div className="modal-overlay share-overlay" onClick={() => onClose?.()}>
      <div
        className="modal-content share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shareCardTitle"
        onClick={event => event.stopPropagation()}
      >
        <div className="share-modal__head">
          <p className="share-modal__kicker">{justSaved ? 'Оценка сохранена' : 'Ваша оценка'}</p>
          <h2 className="share-modal__title" id="shareCardTitle">
            {justSaved ? 'Карточка готова' : 'Карточка оценки'}
          </h2>
          <p className="share-modal__sub">Скачайте PNG и поделитесь впечатлением о фильме.</p>
        </div>

        <div className="share-modal__body">
          <div className="share-card-frame" style={{ aspectRatio: '4 / 5' }}>
            {dataUrl ? (
              <img src={dataUrl} alt={`Карточка оценки фильма «${model.title}»`} />
            ) : (
              <div className="share-card-skeleton" aria-live="polite">
                {failed ? 'Не удалось собрать карточку' : 'Собираем карточку…'}
              </div>
            )}
          </div>
        </div>

        <div className="share-modal__foot">
          <button
            type="button"
            className="share-btn share-btn--ghost"
            ref={closeRef}
            onClick={() => onClose?.()}
          >
            Закрыть
          </button>
          {dataUrl ? (
            <a className="share-btn share-btn--primary" href={dataUrl} download={fileName}>
              Скачать PNG
            </a>
          ) : (
            <button type="button" className="share-btn share-btn--primary" disabled>
              Скачать PNG
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
