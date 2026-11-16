import React from 'react';
import {
  CRITERIA_CONFIG,
  GENRE_LABELS,
  PRESET_WEIGHTS,
  BLOCK_NAMES,
  MIN_SCORE,
  MAX_SCORE,
} from '../../utils/constants';
import './AboutPage.css';

function AboutPage() {
  return (
    <div className="container about-page">
      <header className="about-head">
        <p className="about-kicker">Система оценки</p>
        <h1 className="about-title">Архитектура вкуса</h1>
        <p className="about-lead">
          Кино — это многогранное искусство. А его часто сводят к одной цифре без объяснения, откуда она взялась.
        </p>
      </header>

      <section className="about-philosophy" aria-label="Философия проекта">
        <div className="philosophy-text">
          <h2>Почему мы это делаем?</h2>
          <p>
            Мы привыкли к псевдоконстантам. К цифре «8.7» на IMDb или «87» на Metacritic. Мы безусловно верим этим источникам, но они сводят сложное к упрощённому.
          </p>
          <p>
            Проблема не в том, что агрегаторы есть. Проблема в том, что они <strong>почти не показывают, из чего складывается оценка</strong>. Мы разложили кино на 15 критериев не ради усложнения, а потому что искусство заслуживает внимательного разбора. Мы хотим, чтобы зритель видел: «А что именно делает фильм хорошим?»
          </p>
          <p>
            Но самое интересное начинается, когда аналитика встречается с эмоцией. Мы даём три балла: Технический, Вайб и Комбинированный. Вы можете поставить технике 95, а вайбу 2 (фильм гениален, но не ваш). И система это увидит. Это ваш личный когнитивный диссонанс, зафиксированный в цифрах.
          </p>
        </div>
      </section>

      <section className="about-blocks" aria-label="Блоки критериев">
        <header className="about-section-head">
          <p className="about-kicker">Критерии</p>
          <h2 className="about-section-title">15 граней кино</h2>
          <p className="about-section-lead">
            Каждый критерий оценивается от <strong>1 до 10</strong>. Чтобы вам было проще, мы составили шкалу ориентиров для каждой оценки.
          </p>
        </header>

        {CRITERIA_CONFIG.map((block, idx) => (
          <article className="about-block" key={block.key}>
            <header className="about-block-head">
              <span className="about-block-number">{String(idx + 1).padStart(2, '0')}</span>
              <h2 className="about-block-title">{block.name}</h2>
            </header>
            <div className="about-criteria">
              {block.criteria.map(crit => (
                <div className="about-criterion-card" key={crit.key}>
                  <div className="about-criterion-header">
                    <h3 className="about-criterion-name">{crit.name}</h3>
                  </div>
                  
                  <p className="about-criterion-desc">{crit.desc || crit.hint}</p>
                  
                  {crit.anchors && (
                    <div className="about-criterion-anchors">
                      <div className="anchor-item anchor-low">
                        <span className="anchor-score">1</span>
                        <span className="anchor-text">{crit.anchors[1]}</span>
                      </div>
                      <div className="anchor-item anchor-mid">
                        <span className="anchor-score">5</span>
                        <span className="anchor-text">{crit.anchors[5]}</span>
                      </div>
                      <div className="anchor-item anchor-high">
                        <span className="anchor-score">10</span>
                        <span className="anchor-text">{crit.anchors[10]}</span>
                      </div>
                    </div>
                  )}
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
            В боевике важнее визуал, в байопике — сценарий. Система подстраивается под контекст. Свои веса можно задать вручную.
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
          <h2 id="about-formula-title" className="about-section-title">Математика честности</h2>
        </header>

        <ol className="about-formula-steps">
          <li>По каждому из 5 блоков считается среднее арифметическое его критериев.</li>
          <li>Технический балл (T) = (среднее_блока1 × вес1 + … + среднее_блока5 × вес5) ÷ 100 × 10.</li>
          <li>«Вайб» (M) — ваша личная оценка фильма от 1 до 10.</li>
          <li>Комбинированный балл = T × 0.7 + M × 3 — это 70% техники и 30% вайба, приведённого к шкале 10–100.</li>
        </ol>
        <p className="about-formula-note">
          Итоговая оценка всегда в диапазоне от {MIN_SCORE} до {MAX_SCORE}.
          Округление — только в самом конце, поэтому нюансы сохраняются.
        </p>
      </section>

      <p className="about-repo">
        <a
          href="https://github.com/Fearrlesz/cinephilium-frontend"
          target="_blank"
          rel="noopener noreferrer"
        >
          Исходный код сайта на GitHub
        </a>
      </p>
    </div>
  );
}

export default AboutPage;
