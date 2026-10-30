import { useCallback, useEffect, useRef, useState } from 'react';
import api, { getAccessToken } from '../../../api/client';
import { getErrorMessage } from '../../../utils/apiError';
import { formatRetryAt } from '../../../utils/scoring';

const VIBE_LIMIT_MESSAGE = 'Лимит 50 vibe-оценок в сутки.';

/**
 * Vibe-оценка: одна цифра, отдельное сохранение.
 *
 * F1/DECISION: сброс вайба в 0 невозможен — на бэкенде нет DELETE оценки,
 * а `vibe: 0` не проходит валидацию (1–10). Клик по уже выставленному
 * значению — no-op, а не фальшивый «сброс».
 */
export default function useVibeRating({
  filmId,
  userRating,
  setUserRating,
  reloadFilm,
  reloadUsers,
  showNotification,
  navigate
}) {
  const [localVibe, setLocalVibe] = useState(() => Number(userRating?.vibe) || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [lockedUntil, setLockedUntil] = useState(null);
  const savingRef = useRef(false);

  const serverVibe = Number(userRating?.vibe) || 0;

  // После ответа сервера (или смены фильма) подтягиваем сохранённое значение.
  // localVibe в зависимостях нет: иначе оптимистичный drag сбрасывался бы
  // на каждом движении.
  useEffect(() => {
    setLocalVibe(Number(userRating?.vibe) || 0);
    setError('');
  }, [userRating?._id, userRating?.vibe, userRating?.completeness]);

  // Разблокируем трек ровно к retryAt, без ручного обновления страницы.
  useEffect(() => {
    if (!lockedUntil) return undefined;

    const remaining = new Date(lockedUntil).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      setLockedUntil(null);
      setError('');
      return undefined;
    }

    const timer = setTimeout(() => {
      setLockedUntil(null);
      setError('');
    }, remaining);
    return () => clearTimeout(timer);
  }, [lockedUntil]);

  const commitVibe = useCallback(async value => {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 1 || next > 10) return false;

    setLocalVibe(next);

    if (!getAccessToken()) {
      showNotification?.({
        title: 'Доступ запрещён',
        message: 'Войдите в систему, чтобы оценивать фильмы',
        type: 'warning'
      });
      navigate?.('/login');
      return false;
    }

    // Full-оценка не упрощается: бэкенд ответит ALREADY_FULL_RATING.
    // В full-состоянии трек read-only, это защита от гонки. Важно: отсутствие
    // оценки (null) — не full; иначе первый же vibe упирался бы в эту ветку.
    if (userRating && (userRating.completeness || 'full') === 'full') {
      setLocalVibe(serverVibe);
      setError('Вайб меняется в критериях');
      return false;
    }

    if (next === serverVibe) return false;

    if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) return false;
    if (savingRef.current) return false;

    savingRef.current = true;
    setIsSaving(true);
    setError('');

    try {
      const response = await api.post('/ratings', { filmId, vibe: next });
      setUserRating(response.data.rating);
      // «Оценили фильм» на странице тоже должен обновиться после vibe.
      await Promise.all([
        reloadFilm?.({ silent: true }),
        reloadUsers?.()
      ]);
      return true;
    } catch (err) {
      setLocalVibe(serverVibe);

      const status = err.response?.status;
      const details = err.response?.data?.errorDetails;
      const code = err.response?.data?.errorCode;

      if (status === 429 && details?.retryAt) {
        setLockedUntil(details.retryAt);
        setError(`${VIBE_LIMIT_MESSAGE} Следующая доступна ${formatRetryAt(details.retryAt)}`);
        showNotification?.({
          title: 'Лимит vibe-оценок',
          message: `Следующая доступна ${formatRetryAt(details.retryAt)}`,
          type: 'warning'
        });
      } else if (code === 'ALREADY_FULL_RATING' || (status === 400 && /полная оценка/i.test(getErrorMessage(err, '')))) {
        // F1-fix: основной путь — errorCode из client.js; текст оставлен
        // запасным вариантом для старых нормализованных ответов.
        setError('У вас уже полная оценка этого фильма');
        await reloadFilm?.({ silent: true });
      } else {
        const message = getErrorMessage(err, 'Не удалось сохранить вайб');
        setError(message);
        showNotification?.({ title: 'Ошибка', message, type: 'error' });
      }

      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    filmId, userRating?.completeness, serverVibe, lockedUntil,
    setUserRating, reloadFilm, reloadUsers, showNotification, navigate
  ]);

  return {
    localVibe,
    setLocalVibe,
    commitVibe,
    isSaving,
    error,
    lockedUntil,
    serverVibe
  };
}
