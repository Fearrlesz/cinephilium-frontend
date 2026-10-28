// Расчёт баллов на клиенте — точная копия серверной формулы
// (cinephilium-backend/src/config/scoring.js). Нужен только для предпросмотра:
// сохраняет баллы всегда сервер, поэтому любое расхождение здесь — баг.
import { CRITERIA_CONFIG } from './constants';

export function averageByBlock(block, criteriaKeys) {
  const values = criteriaKeys
    .map(key => block?.[key])
    .filter(Number.isFinite);
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * @param {object} scores — 15 оценок по блокам
 * @param {number[]} blockWeights — 5 весов, сумма 100
 * @param {number} vibe — 1..10
 * @returns {{ tech: number, vibe: number, combined: number }}
 */
export function calculatePreview(scores, blockWeights, vibe) {
  const blockAverages = CRITERIA_CONFIG.map(block =>
    averageByBlock(scores?.[block.key], block.criteria.map(criterion => criterion.key))
  );

  const weightedAverage = blockAverages.reduce(
    (sum, average, index) => sum + average * ((Number(blockWeights?.[index]) || 0) / 100),
    0
  );

  const technicalScore = Number((weightedAverage * 10).toFixed(1));
  // 70% техники + 30% вайба: вайб 1..10 переводим в 3..30 той же шкалы.
  const combinedScore = Number((technicalScore * 0.7 + Number(vibe) * 3).toFixed(1));

  return { tech: technicalScore, vibe: Number(vibe), combined: combinedScore };
}
