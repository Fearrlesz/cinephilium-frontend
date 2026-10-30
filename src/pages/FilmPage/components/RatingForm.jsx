import React, { useMemo, useState } from 'react';
import { CRITERIA_CONFIG, GENRE_LABELS } from '../../../utils/constants';
import {
  BLOCK_COLORS,
  WEIGHT_SLIDER_MAX,
  formatScore,
  getGrade
} from '../../../utils/scoring';
import './RatingForm.css';

const MIN_SCORE = 1;
const MAX_SCORE = 10;
const DEFAULT_SCORE = 5;
const SCORE_STEP = 1;
const RANGE = MAX_SCORE - MIN_SCORE;

const fillPercent = value => ((value - MIN_SCORE) / RANGE) * 100;

const normalizeWeightsArray = weights => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) return [30, 25, 20, 15, 10];

  const raw = weights.map(weight => (weight / total) * 100);
  const ints = raw.map(value => Math.floor(value));
  const remainder = 100 - ints.reduce((sum, value) => sum + value, 0);

  const fractions = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let k = 0; k < remainder; k += 1) ints[fractions[k % ints.length].index] += 1;
  return ints;
};

/**
 * Содержимое модалки критериев. Компонент презентационный:
 * состояние, confirm по весам и отправка живут в useRatingForm.
 */
function RatingForm({
  scores = {},
  vibe = DEFAULT_SCORE,
  genrePreset = '',
  blockWeights = [30, 25, 20, 15, 10],
  weightsValid = false,
  isSaving = false,
  error = '',
  fieldErrors = {},
  onScoreChange = () => {},
  onVibeChange = () => {},
  onGenreChange = () => {},
  onWeightChange = () => {},
  onSave = () => {},
  onClose = () => {},
  calculatePreview = () => ({ tech: null, vibe: 0, combined: null })
}) {
  const [activeHint, setActiveHint] = useState(null);
  const [openBlocks, setOpenBlocks] = useState({ scenario: true });

  const totalWeight = useMemo(
    () => (blockWeights || []).reduce((sum, weight) => sum + (Number(weight) || 0), 0),
    [blockWeights]
  );

  const getScore = (blockKey, criterionKey) =>
    scores?.[blockKey]?.[criterionKey] ?? DEFAULT_SCORE;

  const preview = useMemo(
    () => calculatePreview(scores, vibe, blockWeights, genrePreset),
    [scores, vibe, blockWeights, genrePreset, calculatePreview]
  );

  const grade = useMemo(() => getGrade(preview?.combined), [preview]);

  const blockScores = useMemo(() => CRITERIA_CONFIG.map((config, index) => {
    const values = config.criteria.map(
      criterion => scores?.[config.key]?.[criterion.key] ?? DEFAULT_SCORE
    );
    const average = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
    const color = BLOCK_COLORS[config.key] || BLOCK_COLORS.scenario;
    return {
      key: config.key,
      name: config.name,
      average,
      fillPct: (average / MAX_SCORE) * 100,
      color,
      weight: blockWeights?.[index] ?? 0
    };
  }), [scores, blockWeights]);

  const handleNormalize = () => {
    const next = normalizeWeightsArray(blockWeights);
    next.forEach((value, index) => onWeightChange(index, value));
  };

  const isHybrid = genrePreset === 'hybrid';

  const toggleBlock = key => {
    setOpenBlocks(previous => ({ ...previous, [key]: !previous[key] }));
  };

  const fieldError = (blockKey, criterionKey) => (
    fieldErrors?.[`${blockKey}.${criterionKey}`]
    || fieldErrors?.[`scores.${blockKey}.${criterionKey}`]
    || fieldErrors?.[criterionKey]
    || ''
  );

  return (
    <div className="rating-form">
      {error && <div className="form-error" role="alert">{error}</div>}

      <div className="form-sec">
        <span className="lbl">Жанр</span>

        <div className="select-wrap">
          <select
            className="field-select" value={genrePreset}
            onChange={event => onGenreChange(event.target.value)}
            aria-label="Жанр"
          >
            <option value="">Без жанра — базовые веса</option>
            {Object.entries(GENRE_LABELS).map(([key, label]) => (
              <option value={key} key={key}>{label}</option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        <div className="weights-viz" role="img" aria-label="Распределение весов по блокам">
          {blockScores.map(block => (
            <div
              key={block.key}
              className="weights-viz__seg" data-empty={block.weight < 6}
              style={{
                flexGrow: block.weight || 0.0001,
                background: block.color.solid
              }}
              title={`${block.name}: ${block.weight}%`}
            >
              {block.weight}%
            </div>
          ))}
        </div>

        <div className={`weights-sum ${weightsValid ? 'is-valid' : 'is-invalid'}`}>
          <span>
            Σ = <b>{totalWeight}</b>%{' '}
            {weightsValid ? 'ровно 100' : 'нужно ровно 100'}
          </span>
          {!weightsValid && isHybrid && (
            <button type="button" className="link-btn" onClick={handleNormalize}>
              Уровнять
            </button>
          )}
        </div>

        {!isHybrid ? (
          <button
            type="button" className="link-btn manual-weights" onClick={() => onGenreChange('hybrid')}
          >
            Веса вручную
          </button>
        ) : (
          <div className="weight-rows">
            {blockScores.map((block, index) => {
              const weight = blockWeights?.[index] ?? 0;
              const sliderMax = Math.max(WEIGHT_SLIDER_MAX, weight);
              return (
                <div className="weight-row" key={block.key}>
                  <label htmlFor={`weight-${index}`}>
                    <span
                      className="crit-mark" style={{ background: block.color.solid }}
                      aria-hidden="true"
                    />
                    {block.name}
                  </label>
                  <input
                    id={`weight-${index}`}
                    type="range" min="0" max={sliderMax}
                    step="1" value={weight}
                    onChange={event => onWeightChange(index, Number(event.target.value))}
                    style={{ '--fill': `${Math.min(100, (weight / sliderMax) * 100)}%` }}
                    aria-label={`Вес блока ${block.name}`}
                  />
                  <span className="value-display">{weight}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="form-sec">
        <span className="lbl">Критерии</span>

        {CRITERIA_CONFIG.map(block => {
          const color = BLOCK_COLORS[block.key] || BLOCK_COLORS.scenario;
          const isOpen = Boolean(openBlocks[block.key]);
          const average = blockScores.find(item => item.key === block.key)?.average ?? DEFAULT_SCORE;

          return (
            <div className={`crit ${isOpen ? 'is-open' : ''}`} key={block.key}>
              <button
                type="button" className="crit-summary" onClick={() => toggleBlock(block.key)}
                aria-expanded={isOpen}
              >
                <span
                  className="crit-mark" style={{ background: color.solid }}
                  aria-hidden="true"
                />
                <span className="crit-title">{block.name}</span>
                <span className="crit-avg">{average.toFixed(1)}</span>
                <span className="crit-plus" aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>

              {isOpen && (
                <div className="crit-body">
                  {block.criteria.map(criterion => {
                    const value = getScore(block.key, criterion.key);
                    const hintId = `${block.key}.${criterion.key}`;
                    const currentError = fieldError(block.key, criterion.key);

                    return (
                      <React.Fragment key={criterion.key}>
                        <div className="crit-row">
                          <label htmlFor={`crit-${hintId}`}>
                            {criterion.name}
                            <span className="hint-wrapper">
                              <button
                                type="button" className="hint-icon" onClick={() => setActiveHint(activeHint === hintId ? null : hintId)}
                                aria-expanded={activeHint === hintId}
                                aria-label={`Подсказка: ${criterion.name}`}
                              >
                                i
                              </button>
                              {activeHint === hintId && (
                                <span className="hint-popup" role="tooltip">{criterion.hint}</span>
                              )}
                            </span>
                          </label>

                          <input
                            id={`crit-${hintId}`}
                            type="range" min={MIN_SCORE}
                            max={MAX_SCORE}
                            step={SCORE_STEP}
                            value={value}
                            onChange={event => onScoreChange(
                              block.key,
                              criterion.key,
                              Number(event.target.value)
                            )}
                            style={{
                              '--fill': `${fillPercent(value)}%`,
                              '--fc': color.solid
                            }}
                          />
                          <span className="value-display">{value}</span>
                        </div>

                        {currentError && (
                          <span className="field-error" role="alert">{currentError}</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="form-sec vibe-sec">
        <div className="vibe-head">
          <span className="lbl">Вайб</span>
          <span className="vibe-value">{vibe}</span>
        </div>
        <input
          id="vibeSlider" type="range" min={MIN_SCORE}
          max={MAX_SCORE}
          step={SCORE_STEP}
          value={vibe}
          onChange={event => onVibeChange(Number(event.target.value))}
          style={{ '--fill': `${fillPercent(vibe)}%`, '--fc': 'var(--cyan-bright)' }}
          aria-label="Вайб от 1 до 10"
        />
        <p className="vibe-note">Субъективное впечатление. Не влияет на технический балл.</p>
      </div>

      <div className="preview">
        <div className="preview-head">
          <span className="lbl">Предварительный расчёт</span>
          {grade && (
            <span className="preview-grade" style={{ color: grade.color }}>
              {grade.letter} · {grade.label}
            </span>
          )}
        </div>

        <div className="block-bars">
          {blockScores.map(block => (
            <div key={block.key} className="block-bar">
              <span className="block-bar__label">{block.name}</span>
              <span className="block-bar__track">
                <span
                  className="block-bar__fill" style={{ width: `${block.fillPct}%`, background: block.color.solid }}
                />
              </span>
              <span className="block-bar__value">{block.average.toFixed(1)}</span>
            </div>
          ))}
        </div>

        <div className="preview-row">
          <span>Технический</span>
          <b>{Number.isFinite(Number(preview?.tech)) ? formatScore(preview.tech) : '—'}</b>
        </div>
        <div className="preview-row">
          <span>Вайб</span>
          <b>{vibe}</b>
        </div>
        <div className="preview-row is-primary">
          <span>Комбинированный</span>
          <b>{Number.isFinite(Number(preview?.combined)) ? formatScore(preview.combined) : '—'}</b>
        </div>
      </div>

      <div className="modal-foot">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Отмена
        </button>
        <button
          type="button" className="btn-primary" disabled={isSaving || !weightsValid}
          onClick={onSave}
        >
          {isSaving ? 'Сохраняем…' : 'Сохранить оценку'}
        </button>
      </div>
    </div>
  );
}

export default RatingForm;
