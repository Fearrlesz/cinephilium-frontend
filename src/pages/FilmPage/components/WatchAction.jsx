import React, { useEffect, useState } from 'react';
import api from '../../../api/client';
import WatchModal from './WatchModal';

/**
 * F4: «Просмотрено» на странице фильма.
 *
 * DECISION: F4/2C — счётчик берём из film.watchesCount. Бэкенд уже отдаёт
 * его в GET /api/films/:id; отдельный /watches/:filmId/count на каждый
 * рендер не нужен.
 * DECISION: отдельного «я смотрел этот фильм» в API нет. Поэтому активное
 * состояние определяется проходом по GET /api/watches/me (по 100 записей),
 * как и было зафиксировано в отчёте F4. Это чтение, не новая ручка.
 */
function watchesWord(count) {
  const n = Math.abs(Number(count) || 0);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'просмотр';
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return 'просмотра';
  }
  return 'просмотров';
}

async function findUserWatch(filmId) {
  let page = 1;

  for (;;) {
    const response = await api.get('/watches/me', {
      params: { page, limit: 100 }
    });
    const items = response.data?.items || [];
    const found = items.some(item => {
      const id = item?.filmId?._id || item?.filmId;
      return String(id) === String(filmId);
    });

    if (found) return true;

    const pages = Number(response.data?.pagination?.pages) || 1;
    if (page >= pages) return false;
    page += 1;
  }
}

export default function WatchAction({ film, currentUser, onRequireAuth }) {
  const filmId = film?._id;
  const [hasWatch, setHasWatch] = useState(false);
  const [watchesCount, setWatchesCount] = useState(
    Number(film?.watchesCount) || 0
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setWatchesCount(Number(film?.watchesCount) || 0);
  }, [filmId, film?.watchesCount]);

  useEffect(() => {
    let cancelled = false;

    if (!currentUser || !filmId) {
      setHasWatch(false);
      setIsChecking(false);
      return undefined;
    }

    setIsChecking(true);
    findUserWatch(filmId)
      .then(found => {
        if (!cancelled) setHasWatch(found);
      })
      .catch(() => {
        if (!cancelled) setHasWatch(false);
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, filmId]);

  const handleClick = () => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    setIsModalOpen(true);
  };

  const handleSaved = () => {
    setHasWatch(true);
    setWatchesCount(count => count + 1);
  };

  return (
    <>
      <button
        type="button"
        className={`film-action film-action--watch ${hasWatch ? 'is-on' : ''}`}
        onClick={handleClick}
        disabled={isChecking}
        title={
          isChecking
            ? 'Проверяем дневник'
            : hasWatch
              ? 'Отметить ещё один просмотр'
              : 'Отметить просмотр'
        }
        aria-pressed={hasWatch}
      >
        <svg className="film-action-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="2.6"
            fill={hasWatch ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <span>Просмотрено</span>
      </button>

      <span className="film-watch-total" aria-live="polite">
        {watchesCount} {watchesWord(watchesCount)}
      </span>

      {isModalOpen && (
        <WatchModal
          film={film}
          onSaved={handleSaved}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
