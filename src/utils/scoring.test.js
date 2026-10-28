import { calculatePreview } from './scoring';
import { PRESET_WEIGHTS } from './constants';

const allTens = {
  scenario: { plot: 10, ideas: 10, dialogue: 10 },
  characters: { depth: 10, chemistry: 10, functionality: 10 },
  visual: { composition: 10, cinematography: 10, pacing: 10, tone: 10 },
  sound: { music: 10, design: 10, narrative: 10 },
  style: { originality: 10, boldness: 10 }
};

const withScenario = (scenario) => ({ ...allTens, scenario });

test('среднее по блоку — простое, как на сервере, а не взвешенное внутри блока', () => {
  // (1 + 10 + 10) / 3 = 7; при весе сценария 100% техника = 70.
  // Старая формула давала 1×0.35 + 10×0.35 + 10×0.30 = 6.85 → 68.5.
  const { tech } = calculatePreview(
    withScenario({ plot: 1, ideas: 10, dialogue: 10 }),
    [100, 0, 0, 0, 0],
    5
  );
  expect(tech).toBe(70);
});

test('комбинированный — 70% техники и 30% вайба', () => {
  expect(calculatePreview(allTens, [30, 25, 20, 15, 10], 1).combined).toBe(73);
  expect(calculatePreview(allTens, [30, 25, 20, 15, 10], 5).combined).toBe(85);
  expect(calculatePreview(allTens, [30, 25, 20, 15, 10], 10).combined).toBe(100);
});

test('веса блоков реально влияют на технический балл', () => {
  const scores = withScenario({ plot: 0, ideas: 0, dialogue: 0 });
  expect(calculatePreview(scores, [100, 0, 0, 0, 0], 5).tech).toBe(0);
  expect(calculatePreview(scores, [0, 100, 0, 0, 0], 5).tech).toBe(100);
});

test('веса scifi_author совпадают с бэкендом', () => {
  expect(PRESET_WEIGHTS.scifi_author).toEqual([20, 20, 25, 15, 20]);
});
