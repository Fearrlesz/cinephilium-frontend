import React from 'react';
import {
  CRITERIA_CONFIG,
  GENRE_LABELS,
  PRESET_WEIGHTS,
  BLOCK_NAMES,
  TECHNICAL_MULTIPLIER,
  VIBE_STEP,
  MIN_SCORE,
  MAX_SCORE,
} from '../../utils/constants';
import './AboutPage.css';

function AboutPage() {
  return (
    <div className="container about-page">
      <header className="about-head">
        <p className="about-kicker">Система оценки</p>
        <h1 className="about-title">О системе оценки</h1>
        <p className="about-lead">
          Пятнадцать критериев, пять блоков и один вайб. Без рекламных рейтингов
          и вкусовщины: только то, что можно объяснить.
        </p>
      </header>

      <section className="about-intro" aria-label="Как устроена оценка">
        <p>
          Мы оцениваем фильмы по <strong>15 критериям</strong>, разбитым на 5 блоков.
          Каждый критерий — от <strong>1 до 10</strong>.
        </p>
        <p>
          Из оценок складывается «Технический балл». Затем он умножается на
          «Вайб» — личное восприятие фильма. Так одна и та же картина может
          получить разные баллы у разных людей, и это честно.
        </p>
      </section>

      <section className="about-blocks" aria-label="Блоки критериев">
        {CRITERIA_CONFIG.map((block, idx) => (
          <article className="about-block" key={block.key}>
            <header className="about-block-head">
              <span className="about-block-number">{String(idx + 1).padStart(2, '0')}</span>
              <h2 className="about-block-title">{block.name}</h2>
            </header>
            <div className="about-criteria">
              {block.criteria.map(crit => (
                <div className="about-criterion" key={crit.key}>
                  <div className="about-criterion-name">{crit.name}</div>
                  <div className="about-criterion-desc">{crit.hint}</div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="about-weights" aria-labelledby="about-weights-title">
        <header className="about-section-head">
          <p className="about-kicker">Веса</p>
          <h2 id="about-weights-title" className="about-section-title">Жанровые пресеты</h2>
          <p className="about-section-lead">
            Жанр меняет вес блоков: в мюзикле важнее звук, в байопике — сценарий
            и персонажи. Свои веса можно задать вручную под конкретный фильм.
          </p>
        </header>

        <div className="about-preset-list">
          {Object.entries(GENRE_LABELS).map(([key, label]) => {
            if (key === 'hybrid') return null;
            const weights = PRESET_WEIGHTS[key] || [];
            const total = weights.reduce((sum, weight) => sum + weight, 0);

            return (
              <article className="about-preset" key={key}>
                <div className="about-preset-head">
                  <span className="about-preset-name">{label}</span>
                  <span className="about-preset-total">{total}%</span>
                </div>
                <div className="about-preset-bars">
                  {weights.map((weight, index) => (
                    <div
                      className="about-preset-row"
                      key={index}
                      title={`${BLOCK_NAMES[index]}: ${weight}%`}
                    >
                      <span className="about-preset-label">{BLOCK_NAMES[index]}</span>
                      <span className="about-preset-track">
                        <span
                          className="about-preset-bar"
                          style={{ width: `${weight}%` }}
                        />
                      </span>
                      <span className="about-preset-value">{weight}%</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="about-formula" aria-labelledby="about-formula-title">
        <header className="about-section-head">
          <p className="about-kicker">Расчёт</p>
          <h2 id="about-formula-title" className="about-section-title">Формула</h2>
        </header>

        <ol className="about-formula-steps">
          <li>По каждому блоку считается среднее арифметическое его критериев.</li>
          <li>
            Технический балл (T) = (среднее_блока1 × вес1 + … + среднее_блока5 × вес5)
            × {TECHNICAL_MULTIPLIER}.
          </li>
          <li>«Вайб» (M) — ваша личная оценка фильма от 1 до 10.</li>
          <li>Вайб-множитель = 1 + (M − 1) × {VIBE_STEP}.</li>
          <li>Комбинированный балл = T × Вайб-множитель.</li>
        </ol>

        <p className="about-formula-note">
          Итоговая оценка всегда в диапазоне от {MIN_SCORE} до {MAX_SCORE}.
          Округление — только в самом конце, поэтому нюансы сохраняются.
        </p>
      </section>
    </div>
  );
}

export default AboutPage;
