import { useEffect, useState } from 'react';

const QUERY = '(pointer: coarse)';

/**
 * F1/DECISION: drag на десктопе, сегменты на мобильном.
 * Определяем именно тип указателя, а не ширину окна: планшет с мышью
 * остаётся drag-треком, телефон с пальцем — сегментами.
 */
export default function usePointerCoarse() {
  const [coarse, setCoarse] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const media = window.matchMedia(QUERY);
    const onChange = event => setCoarse(event.matches);

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    // Safari < 14
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  return coarse;
}
