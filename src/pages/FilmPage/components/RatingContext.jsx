import React from 'react';
import { formatDelta, formatScore, roundTenth } from '../../../utils/scoring';

/**
 * F1: соцдоказательство — одна строка, только комбинированный балл.
 *
 * DECISION: F1-fix — «Ваша» существует только для full: vibe-only даёт
 * combinedScore = 0 на бэке, и фронт не доизобретает vibe × 10.
 * DECISION: F1/4A — не добавляем сюда вайб/технику: строка сравнивает
 * «что народ думает» с «что думаешь ты» одной цифрой.
 * Delta выводится только когда есть и «Сообщество», и «Ваша» (full).
 * Прочерк, а не 0, когда данных нет.
 */
export default function RatingContext({ community = null, yours = null }) {
  const hasCommunity = Number.isFinite(Number(community)) && Number(community) > 0;
  const hasYours = Number.isFinite(Number(yours)) && Number(yours) > 0;
  const delta = hasCommunity && hasYours ? roundTenth(Number(yours) - Number(community)) : null;

  const deltaClass = delta === null
    ? 'is-empty'
    : delta > 0
      ? 'is-positive'
      : delta < 0
        ? 'is-negative'
        : 'is-neutral';

  return (
    <div className="rating-context" aria-label="Сравнение с сообществом">
      <div className="rc-item">
        <span className="rc-label">Сообщество</span>
        <span className="rc-val rc-val--community">{hasCommunity ? formatScore(community) : '—'}</span>
      </div>

      <span className="rc-sep" aria-hidden="true" />

      <div className="rc-item">
        <span className="rc-label">Ваша</span>
        <span className="rc-val rc-val--yours">
          {hasYours ? formatScore(yours) : '—'}
        </span>
      </div>

      <div className={`rc-delta ${deltaClass}`} aria-live="polite">
        {delta !== null ? formatDelta(delta) : ''}
      </div>
    </div>
  );
}
