import { useCallback, useState } from 'react';
import api from '../../../api/client';
import { getErrorMessage } from '../../../utils/apiError';
import { CRITERIA_CONFIG, PRESET_WEIGHTS } from '../../../utils/constants';
import {
  DEFAULT_WEIGHTS,
  calculateCombined,
  calculateTechnical,
  getInitialWeights,
  WEIGHTS_SUM
} from '../../../utils/scoring';

const createEmptyScores = () => Object.fromEntries(
  CRITERIA_CONFIG.map(block => [
    block.key,
    Object.fromEntries(block.criteria.map(criterion => [criterion.key, 5]))
  ])
);

const cloneScores = scores => {
  if (!scores || typeof scores !== 'object') return createEmptyScores();
  const result = {};
  for (const block of CRITERIA_CONFIG) {
    result[block.key] = {};
    for (const criterion of block.criteria) {
      const value = Number(scores?.[block.key]?.[criterion.key]);
      result[block.key][criterion.key] = Number.isFinite(value) ? value : 5;
    }
  }
  return result;
};

const sameWeights = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

/**
 * F1: черновик полной оценки для модалки.
 *
 * Отличия от старого useRatingForm:
 *  - формула preview совпадает с бэкендом (среднее по критериям внутри блока);
 *  - при ручных весах жанр становится `hybrid`, а смена жанра спрашивает confirm;
 *  - сохранение отдаёт ошибку наружу, а не только в notification;
 *  - текст короткой рецензии сохраняется, но в F1 не редактируется.
 */
export default function useRatingForm({ filmId, userRating, onSaved, showNotification }) {
  const initial = (() => {
    const scores = cloneScores(userRating?.scores);
    const vibe = Number(userRating?.vibe) || 5;
    const textReview = userRating?.textReview || '';

    let genrePreset = userRating?.genrePreset || '';
    const weights = getInitialWeights(userRating?.blockWeights);
    let weightsDirty = false;

    if (!genrePreset && !sameWeights(weights, DEFAULT_WEIGHTS)) {
      genrePreset = 'hybrid';
      weightsDirty = true;
    }
    if (genrePreset === 'hybrid') weightsDirty = true;

    return { scores, vibe, genrePreset, weights, textReview, weightsDirty };
  })();

  const [scores, setScores] = useState(initial.scores);
  const [vibe, setVibe] = useState(initial.vibe);
  const [genrePreset, setGenrePreset] = useState(initial.genrePreset);
  const [blockWeights, setBlockWeights] = useState(initial.weights);
  const [textReview] = useState(initial.textReview);
  const [weightsDirty, setWeightsDirty] = useState(initial.weightsDirty);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // DECISION: F1/7A — сумма весов строго 100. Фронт блокирует сохранение,
  // а не нормализует молча: пользователь должен сам увидеть и исправить вес.
  // Бэкенд всё равно проверяет сумму — это защита целостности, не дубль ради дубля.
  const weightsValid = blockWeights.reduce((sum, weight) => sum + Number(weight || 0), 0) === WEIGHTS_SUM;

  const handleGenreChange = useCallback(key => {
    if (key === genrePreset) return;

    if (weightsDirty && key !== 'hybrid') {
      const confirmed = window.confirm(
        'Вы меняли веса вручную. Сбросить их и применить выбранный жанр?'
      );
      if (!confirmed) return;
    }

    setGenrePreset(key);

    if (key === '') {
      setBlockWeights([...DEFAULT_WEIGHTS]);
      setWeightsDirty(false);
      return;
    }

    if (key === 'hybrid') {
      // «Веса вручную»: оставляем текущие значения и разрешаем их менять.
      setWeightsDirty(true);
      return;
    }

    const preset = PRESET_WEIGHTS[key];
    setBlockWeights(preset ? [...preset] : [...DEFAULT_WEIGHTS]);
    setWeightsDirty(false);
  }, [genrePreset, weightsDirty]);

  const handleWeightChange = useCallback((index, value) => {
    setGenrePreset('hybrid');
    setWeightsDirty(true);
    setBlockWeights(previous => previous.map(
      (weight, i) => (i === index ? Number(value) : weight)
    ));
  }, []);

  const handleRatingChange = useCallback((blockKey, criterionKey, value) => {
    setScores(previous => ({
      ...previous,
      [blockKey]: {
        ...previous[blockKey],
        [criterionKey]: Number(value)
      }
    }));
  }, []);

  // F1/DECISION: preview считается на фронте по формуле бэкенда и нужен только
  // до сохранения; после сохранения панель берёт combinedScore из БД.
  const calculatePreview = useCallback(() => {
    const technical = calculateTechnical(scores, blockWeights);
    return {
      tech: technical,
      vibe,
      combined: calculateCombined(technical, vibe)
    };
  }, [scores, blockWeights, vibe]);

  const saveRating = useCallback(async () => {
    if (!weightsValid) {
      setError('Сумма весов блоков должна быть ровно 100');
      return false;
    }

    if (isSaving) return false;

    setIsSaving(true);
    setError('');
    setFieldErrors({});

    try {
      const response = await api.post('/ratings', {
        filmId,
        scores,
        vibe,
        genrePreset: genrePreset || null,
        blockWeights,
        textReview
      });

      showNotification?.({
        title: 'Оценка сохранена',
        message: 'Полная оценка обновлена',
        type: 'success'
      });

      onSaved?.(response.data.rating, response.data);
      return true;
    } catch (err) {
      const details = err.response?.data?.errorDetails;
      const nextFieldErrors = {};

      if (Array.isArray(details)) {
        for (const item of details) {
          if (item?.field && item?.message) nextFieldErrors[item.field] = item.message;
        }
      }

      setFieldErrors(nextFieldErrors);
      setError(getErrorMessage(err, 'Не удалось сохранить оценку'));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    weightsValid, isSaving, filmId, scores, vibe, genrePreset,
    blockWeights, textReview, showNotification, onSaved
  ]);

  return {
    scores,
    vibe,
    setVibe,
    genrePreset,
    blockWeights,
    textReview,
    isSaving,
    weightsValid,
    weightsDirty,
    error,
    fieldErrors,
    calculatePreview,
    saveRating,
    handleGenreChange,
    handleWeightChange,
    handleRatingChange
  };
}
