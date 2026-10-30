import React from 'react';
import { BLOCK_NAMES } from '../../../utils/constants';
import {
  BLOCK_COLORS,
  BLOCK_KEYS,
  blockAverages,
  communityValue,
  formatScore,
  getGrade,
  getVibeWord
} from '../../../utils/scoring';
import VibeTrack from './VibeTrack';

function CommunityHint({ value }) {
  // DECISION: F1/community-hint — в тихой справке показываем среднее
  // сообщества (как в прототипе), а не количество людей. Количество остаётся
  // в счётчиках фильма и не дублирует смысл колонки.
  return (
    <span className="rp-community">
      сообщество · {Number.isFinite(Number(value)) && Number(value) > 0 ? formatScore(value) : '—'}
    </span>
  );
}

function GradeBadge({ grade }) {
  if (!grade) return null;
  return (
    <span className="rp-grade" style={{ '--gc': grade.color }}>
      <span className="rp-grade__letter">{grade.letter}</span>
      <span className="rp-grade__label">{grade.label}</span>
    </span>
  );
}

/**
 * F1: панель трёх баллов.
 *  - full: всё из userRating (combinedScore не пересчитываем);
 *  - vibe-only: техника и combined — прочерки (на бэке оба 0 = «не вычислено»);
 *  - нет оценки: все прочерки.
 *
 * DECISION: F1-fix — combined и technical существуют только для full.
 * Никакого `vibe × 10` и «на основе вайба»: фронт не доизобретает баллы.
 * DECISION: F1/4A — соцдоказательство выше показывает только комбинированный.
 * DECISION: F1/6A — в full трек вайба read-only: бэкенд не принимает
 * vibe-only для full (ALREADY_FULL_RATING), изменение — в модалке вместе
 * с критериями. Это отличается от прототипа, но честно по контракту API.
 */
export default function RatingPanel({
  film,
  userRating,
  authenticated,
  coarse,
  vibe,
  onVibeInput,
  onVibeCommit,
  isSavingVibe,
  vibeError,
  vibeLocked,
  onOpenCriteria,
  onRequireAuth
}) {
  const isFull = (userRating?.completeness || '') === 'full';
  const hasVibe = Number(vibe) >= 1;
  const hasTechnical = isFull && Number(userRating?.technicalScore) > 0;

  const technical = hasTechnical ? Number(userRating.technicalScore) : null;
  // DECISION: F1-fix — combined только для full и только из БД.
  const combined = isFull && Number(userRating?.combinedScore) > 0
    ? Number(userRating.combinedScore)
    : null;

  const technicalGrade = getGrade(technical);
  const combinedGrade = getGrade(combined);
  const averages = isFull ? blockAverages(userRating?.scores) : null;

  const communityVibe = communityValue(film?.averageVibe, film?.votesCount);
  const communityTechnical = communityValue(film?.averageTechnical, film?.fullCount);
  const communityCombined = communityValue(film?.averageCombined, film?.fullCount);

  const vibeReadOnly = isFull;
  const vibeDisabled = !authenticated || Boolean(vibeLocked) || isSavingVibe;

  return (
    <div className="rating-panel" role="group" aria-label="Три балла фильма">
      {/* ── ВАЙБ ─────────────────────────────────────────────── */}
      <div className="rp-col" data-col="vibe">
        <div className="rp-col-head">
          <span className="rp-label">Вайб</span>
          <CommunityHint value={communityVibe} />
        </div>

        <div className="rp-val">
          <span className={`rp-num ${hasVibe ? '' : 'is-empty'}`}>
            {hasVibe ? formatScore(vibe) : '—'}
          </span>
          <span className="rp-max">/ 10</span>
        </div>

        <div className="rp-word">{getVibeWord(vibe)}</div>

        <VibeTrack
          value={vibe}
          coarse={coarse}
          disabled={vibeDisabled}
          readOnly={vibeReadOnly}
          onInput={onVibeInput}
          onCommit={onVibeCommit}
        />

        <div className="rp-foot">
          <span>{vibeReadOnly ? 'вайб меняется в критериях' : '5 секунд'}</span>
          {isSavingVibe && <span className="rp-saving">сохраняем…</span>}
        </div>

        {!authenticated && (
          <button type="button" className="rp-link" onClick={onRequireAuth}>
            Войдите, чтобы оценить
          </button>
        )}

        {vibeError && <p className="rp-error" role="alert">{vibeError}</p>}
      </div>

      {/* ── ТЕХНИЧЕСКИЙ ──────────────────────────────────────── */}
      <div className="rp-col" data-col="tech">
        <div className="rp-col-head">
          <span className="rp-label">Технический</span>
          <CommunityHint value={communityTechnical} />
        </div>

        <div className="rp-val">
          <span className={`rp-num ${hasTechnical ? '' : 'is-empty'}`}>
            {hasTechnical ? formatScore(technical) : '—'}
          </span>
          <span className="rp-max">/ 100</span>
        </div>

        <GradeBadge grade={technicalGrade} />

        {isFull && averages && (
          <div className="rp-spectrum" aria-label="Средние по блокам">
            {BLOCK_KEYS.map((key, index) => {
              const value = averages[key];
              const color = BLOCK_COLORS[key];
              const width = Number.isFinite(Number(value)) ? Math.min(100, Number(value) * 10) : 0;
              return (
                <div className="rp-spectrum__row" key={key}>
                  <span className="rp-spectrum__name">{BLOCK_NAMES[index]}</span>
                  <span className="rp-spectrum__track">
                    <span
                      className="rp-spectrum__fill"
                      style={{
                        width: `${width}%`,
                        background: `linear-gradient(90deg, ${color.from}, ${color.to})`
                      }}
                    />
                  </span>
                  <span className="rp-spectrum__value">
                    {Number.isFinite(Number(value)) ? value.toFixed(1) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {isFull ? (
          <button type="button" className="rp-cta rp-cta--link" onClick={onOpenCriteria}>
            Изменить критерии →
          </button>
        ) : (
          <button
            type="button"
            className={`rp-cta ${hasVibe ? 'rp-cta--accent' : ''}`}
            onClick={authenticated ? onOpenCriteria : onRequireAuth}
          >
            {authenticated ? 'Оценить' : 'Войти и оценить'}
          </button>
        )}

        <span className="rp-meta">15 критериев · 5 блоков</span>
      </div>

      {/* ── КОМБИНИРОВАННЫЙ ──────────────────────────────────── */}
      <div className="rp-col" data-col="combined">
        <div className="rp-col-head">
          <span className="rp-label">Комбинированный</span>
          <CommunityHint value={communityCombined} />
        </div>

        <div className="rp-val">
          <span className={`rp-num ${combined ? '' : 'is-empty'}`}>
            {combined ? formatScore(combined) : '—'}
          </span>
          <span className="rp-max">/ 100</span>
        </div>

        <GradeBadge grade={combinedGrade} />

        <div className="rp-formula">
          {isFull && technical && combined ? (
            <>0.7 × {formatScore(technical)} + 0.3 × {formatScore(Number(vibe) * 10)} = {formatScore(combined)}</>
          ) : (!isFull && hasVibe) ? (
            // Vibe-only: combined не вычисляется. Никакой формулы/подписи
            // «на основе вайба» — только прочерк и мета ниже.
            null
          ) : (
            <em>нужны вайб и техника</em>
          )}
        </div>

        <span className="rp-meta">
          {isFull ? 'полная оценка' : hasVibe ? 'нужна полная оценка' : ''}
        </span>
      </div>
    </div>
  );
}
