import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BLOCK_NAMES,
  CRITERIA_CONFIG,
  GENRE_LABELS
} from '../../../../utils/constants';
import {
  BLOCK_COLORS,
  DEFAULT_WEIGHTS,
  WEIGHTS_SUM,
  WEIGHT_SLIDER_MAX,
  formatScore,
  getGrade,
  getVibeWord
} from '../../../../utils/scoring';
import CustomSelect from '../../../../components/CustomSelect/CustomSelect';
import RangeSlider from '../../../../components/RangeSlider/RangeSlider';
import './RatingForm.css';

const MIN_SCORE = 1;
const MAX_SCORE = 10;
const DEFAULT_SCORE = 1;
const DEFAULT_VIBE = 5;
const SCORE_STEP = 1;

const CRITERIA_COUNT = CRITERIA_CONFIG.reduce(
  (sum, block) => sum + block.criteria.length,
  0
);

const GENRE_OPTIONS = [
  { value: '', label: 'Без жанра — базовые веса' },
  ...Object.entries(GENRE_LABELS).map(([value, label]) => ({ value, label }))
];

const normalizeWeightsArray = weights => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total === 0) return DEFAULT_WEIGHTS;

  const raw = weights.map(weight => (weight / total) * 100);
  const ints = raw.map(value => Math.floor(value));
  const remainder = WEIGHTS_SUM - ints.reduce((sum, value) => sum + value, 0);

  const fractions = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let k = 0; k < remainder; k += 1) ints[fractions[k % ints.length].index] += 1;
  return ints;
};

const weightTicks = max => Array.from(
  { length: 6 },
  (_, index) => Math.round((max * index) / 5)
);

/** Одинаковая «еле заметная» анимация смены числа во всей форме. */
function AnimatedNumber({ value }) {
  return <span key={String(value)} className="rf-num-in">{value}</span>;
}

/**
 * Содержимое модалки критериев. Компонент презентационный:
 * состояние, confirm по весам и отправка живут в useRatingForm.
 */
function RatingForm({
  scores = {},
  vibe = DEFAULT_VIBE,
  genrePreset = '',
  blockWeights = DEFAULT_WEIGHTS,
  weightsValid = true,
  isSaving = false,
  error = '',
  fieldErrors = {},
  onScoreChange = () => {},
  onVibeChange = () => {},
  onGenreChange = () => {},
  onWeightChange = () => {},
  onSave = () => {},
  onClose = () => {},
  calculatePreview = () => ({ tech: null, vibe, combined: null }),
  hasSavedRating = false
}) {
  const [openBlocks, setOpenBlocks] = useState({ scenario: true });

  const totalWeight = useMemo(
    () => blockWeights.reduce((sum, weight) => sum + weight, 0),
    [blockWeights]
  );

  const preview = calculatePreview();
  const grade = preview.combined == null ? null : getGrade(preview.combined);

  const blockScores = useMemo(() => CRITERIA_CONFIG.map((block, index) => {
    const values = block.criteria.map(
      criterion => Number(scores?.[block.key]?.[criterion.key] ?? DEFAULT_SCORE)
    );
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
      key: block.key,
      name: block.name,
      average,
      rounded: Math.round(average),
      color: BLOCK_COLORS[block.key],
      weight: Number(blockWeights[index] ?? 0)
    };
  }), [scores, blockWeights]);

  const getScore = (blockKey, criterionKey) => Number(
    scores?.[blockKey]?.[criterionKey] ?? DEFAULT_SCORE
  );

  const getFieldError = (blockKey, criterionKey) => (
    fieldErrors?.[`${blockKey}.${criterionKey}`]
    || fieldErrors?.[`scores.${blockKey}.${criterionKey}`]
    || fieldErrors?.[criterionKey]
    || ''
  );

  const allOpen = CRITERIA_CONFIG.every(block => openBlocks[block.key]);

  // Пока не тронута ни одна оценка, не показываем «10 / Провал»:
  // дефолт 1 — это «ещё не оценивал», а не приговор фильму.
  const untouched = useMemo(() => {
    if (hasSavedRating) return false;
    if (Number(vibe) !== DEFAULT_VIBE) return false;
    return CRITERIA_CONFIG.every(block => block.criteria.every(
      criterion => getScore(block.key, criterion.key) === MIN_SCORE
    ));
  }, [hasSavedRating, vibe, scores]);

  const showResult = !untouched;

  const toggleBlock = key => {
    setOpenBlocks(previous => ({ ...previous, [key]: !previous[key] }));
  };

  const toggleAll = () => {
    setOpenBlocks(allOpen
      ? {}
      : CRITERIA_CONFIG.reduce((next, block) => ({ ...next, [block.key]: true }), {}));
  };

  const handleNormalize = () => {
    normalizeWeightsArray(blockWeights).forEach((weight, index) => {
      onWeightChange(index, weight);
    });
  };

  const totalWeightLabel = weightsValid ? 'ровно 100' : 'нужно ровно 100';
  const combinedText = showResult ? formatScore(preview.combined) : '—';
  const technicalText = formatScore(preview.tech);

  return (
    <div className="rating-form">
      <div className="rf-scroll">
        {error && <div className="form-error" role="alert">{error}</div>}

        <Link
          className="rf-howto"
          to="/about"
          target="_blank"
          rel="noreferrer"
        >
          <span className="rf-howto__mark" aria-hidden="true">?</span>
          <span className="rf-howto__body">
            <span className="rf-howto__title">Как оценивать</span>
            <span className="rf-howto__text">
              15 критериев, веса блоков и формула — в памятке
            </span>
          </span>
          <span className="rf-howto__arrow" aria-hidden="true">→</span>
        </Link>

        <section className="rf-card" aria-labelledby="rfWeightsTitle">
          <div className="rf-card__head">
            <span className="rf-lbl" id="rfWeightsTitle">Жанр и веса</span>
            <div className={`rf-sum ${weightsValid ? '' : 'is-invalid'}`}>
              <span>
                Σ <b>{totalWeight}</b>% · {totalWeightLabel}
              </span>
              {!weightsValid && (
                <button type="button" className="rf-link" onClick={handleNormalize}>
                  Уровнять
                </button>
              )}
            </div>
          </div>

          <div className="rf-genre">
            <CustomSelect
              className="rf-genre__select"
              value={genrePreset}
              onChange={onGenreChange}
              options={GENRE_OPTIONS}
              ariaLabel="Жанр и веса блоков"
            />
          </div>

          <div
            className="rf-weights-viz"
            role="img"
            aria-label={`Распределение весов: ${blockScores.map(
              block => `${block.name} ${block.weight}%`
            ).join(', ')}`}
          >
            {blockScores.map(block => (
              <span
                key={block.key}
                className="rf-weights-viz__seg"
                data-empty={block.weight < 6 ? 'true' : 'false'}
                style={{
                  flexGrow: Math.max(block.weight, 0.0001),
                  background: block.color.solid
                }}
              >
                {block.weight}%
              </span>
            ))}
          </div>

          <div className="rf-weight-cells">
            {blockScores.map((block, index) => {
              const sliderMax = Math.max(WEIGHT_SLIDER_MAX, block.weight);

              return (
                <div className="rf-weight-cell" key={block.key}>
                  <div className="rf-weight-cell__top">
                    <span className="rf-weight-cell__name">
                      <span className="rf-dot" style={{ background: block.color.solid }} />
                      {BLOCK_NAMES[index]}
                    </span>
                    <span className="rf-weight-cell__val">
                      <AnimatedNumber value={block.weight} />
                      <span className="rf-weight-cell__unit">%</span>
                    </span>
                  </div>
                  <RangeSlider
                    min={0}
                    max={sliderMax}
                    step={1}
                    value={block.weight}
                    color={block.color.solid}
                    ticks={weightTicks(sliderMax)}
                    ariaLabel={`Вес блока ${block.name}`}
                    onChange={value => onWeightChange(index, value)}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <div className="rf-criteria-head">
          <span className="rf-lbl">Критерии</span>
          <div className="rf-criteria-meta">
            <span>{CRITERIA_COUNT} параметров · {CRITERIA_CONFIG.length} блоков</span>
            <button type="button" className="rf-link" onClick={toggleAll}>
              {allOpen ? 'Свернуть все' : 'Развернуть все'}
            </button>
          </div>
        </div>

        <div className="rf-blocks">
          {CRITERIA_CONFIG.map(block => {
            const info = blockScores.find(item => item.key === block.key);
            const isOpen = Boolean(openBlocks[block.key]);

            return (
              <section
                className={`rf-block ${isOpen ? 'is-open' : ''}`}
                key={block.key}
                style={{ '--bc': info.color.solid }}
              >
                <button
                  type="button"
                  className="rf-block__head"
                  aria-expanded={isOpen}
                  onClick={() => toggleBlock(block.key)}
                >
                  <span className="rf-block__name">{block.name}</span>
                  <span className="rf-meter" aria-hidden="true">
                    {Array.from({ length: 10 }, (_, index) => (
                      <i key={index} className={index < info.rounded ? 'is-on' : ''} />
                    ))}
                  </span>
                  <span
                    className="rf-block__avg"
                    title={`среднее ${info.average.toFixed(1)}`}
                  >
                    <AnimatedNumber value={info.rounded} />
                  </span>
                  <svg className="rf-block__chev" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="rf-block__body">
                    {block.criteria.map(criterion => {
                      const inputId = `crit-${block.key}-${criterion.key}`;
                      const currentError = getFieldError(block.key, criterion.key);

                      return (
                        <React.Fragment key={criterion.key}>
                          <div className="rf-crit">
                            <label className="rf-crit__label" htmlFor={inputId}>
                              {criterion.name}
                            </label>
                            <RangeSlider
                              id={inputId}
                              min={MIN_SCORE}
                              max={MAX_SCORE}
                              step={SCORE_STEP}
                              value={getScore(block.key, criterion.key)}
                              color={info.color.solid}
                              ariaLabel={criterion.name}
                              onChange={value => onScoreChange(block.key, criterion.key, value)}
                            />
                            <span className="rf-crit__num" aria-hidden="true">
                              <AnimatedNumber value={getScore(block.key, criterion.key)} />
                            </span>
                          </div>
                          {currentError && (
                            <span className="rf-field-error" role="alert">{currentError}</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <section className="rf-card rf-vibe" aria-labelledby="rfVibeTitle">
          <div className="rf-vibe__top">
            <div className="rf-vibe__label">
              <span className="rf-lbl" id="rfVibeTitle">Вайб</span>
              <span className="rf-vibe__word">{getVibeWord(vibe)}</span>
            </div>
            <div className="rf-vibe__value">
              <span className="rf-vibe__num">
                <AnimatedNumber value={vibe} />
              </span>
              <span className="rf-vibe__unit">/ 10</span>
            </div>
          </div>

          <RangeSlider
            min={MIN_SCORE}
            max={MAX_SCORE}
            step={SCORE_STEP}
            value={vibe}
            color="var(--cyan-bright)"
            ariaLabel="Вайб от 1 до 10"
            onChange={onVibeChange}
          />

          <p className="rf-vibe__note">
            Субъективное впечатление. Не влияет на технический балл.
          </p>
        </section>
      </div>

      <footer className="rf-foot">
        <div className="rf-foot__result">
          <span className="rf-foot__label">Комбинированный</span>
          <span className="rf-foot__num">
            <AnimatedNumber value={combinedText} />
          </span>
          {showResult && <span className="rf-foot__unit">/100</span>}
          {showResult && grade && (
            <span className="rf-foot__grade" style={{ color: grade.color }}>
              {grade.letter} · {grade.label}
            </span>
          )}
          <span className={`rf-foot__meta${showResult ? '' : ' is-empty'}`}>
            {showResult
              ? `технический ${technicalText} · вайб ${vibe}`
              : 'оценок пока нет'}
          </span>
        </div>

        <div className="rf-foot__actions">
          <button type="button" className="rf-btn rf-btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="rf-btn rf-btn--primary"
            onClick={onSave}
            disabled={isSaving || !weightsValid}
          >
            {isSaving ? 'Сохраняем…' : 'Сохранить оценку'}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default RatingForm;
