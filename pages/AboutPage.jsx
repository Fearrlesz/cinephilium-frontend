import React from 'react';
import { Link } from 'react-router-dom';
import { CRITERIA_CONFIG, GENRE_LABELS, PRESET_WEIGHTS, BLOCK_NAMES, TECHNICAL_MULTIPLIER, VIBE_STEP, MIN_SCORE, MAX_SCORE } from '../utils/constants';

function AboutPage() {
  return (
    <div className="container about-page">
      <Link to="/" className="back-btn">← На главную</Link>
      <h1 className="about-title">📖 О системе оценки</h1>

      <div className="about-intro glass-card">
        <p className="neon-text">
          Мы оцениваем фильмы по <strong>15 критериям</strong>, разбитым на 5 блоков.
          Каждый критерий оценивается от <strong>1 до 10</strong>.
        </p>
        <p>
          Вашу оценку составляет «Технический Балл», который превращается в «Комбинированную оценку», умножаясь на множитель вашего личного восприятия - <strong>«Вайб»!</strong>.
        </p>
      </div>

      <div className="about-blocks">
        {CRITERIA_CONFIG.map((block, idx) => (
          <div key={block.key} className="about-block glass-card">
            <h2 className="about-block-title neon-text">{block.name}</h2>
            <div className="about-criteria">
              {block.criteria.map(crit => (
                <div key={crit.key} className="about-criterion">
                  <div className="about-criterion-name">{crit.name}</div>
                  <div className="about-criterion-desc">{crit.hint}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="about-genre-weights glass-card">
        <header className="section-header">
          <h2>⚖️ Жанровые веса</h2>
          <p>
            В системе предусмотрены <strong>жанровые пресеты</strong>, 
            которые автоматически распределяют веса между пятью блоками оценки.
            Это позволяет учитывать особенности жанра: например, в мюзикле звук важнее визуала, 
            а в байопике сценарий и персонажи выходят на первый план. 
            Также любой, даже самый причудливый фильм, к примеру, «Андалузский пёс» может быть высоко оценён в своём жанре! Сценарий будет иметь второстепенное значение, что сосредоточит оценку на стиле и визуале, одно из главных преимуществ нашей системы.
            Ниже по странице вы увидите, как выглядят жанровые пресеты в действии!  
          </p>
        </header>
        <div className="preset-list">
          {Object.entries(GENRE_LABELS).map(([key, label]) => {
            if (key === 'hybrid') return null;
            const weights = PRESET_WEIGHTS[key] || [];
            const total = weights.reduce((a, b) => a + b, 0);
            return (
              <article key={key} className="preset-item">
                <div className="preset-header">
                  <span className="preset-name">{label}</span>
                  <span className="preset-total">{total}%</span>
                </div>
                <div className="preset-bars">
                  {weights.map((weight, index) => (
                    <div key={index} className="preset-bar-row" title={`${BLOCK_NAMES[index]}: ${weight}%`}>
                      <span className="preset-bar-label">{BLOCK_NAMES[index]}</span>
                      <div className="preset-bar-container">
                        <div className="preset-bar" style={{ width: `${weight}%` }} />
                      </div>
                      <span className="preset-bar-value">{weight}%</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <div className="hybrid-note">
          <p>
            <strong>🎛 Свои веса</strong> — вы можете вручную задать распределение весов 
            под конкретный фильм, если ни один из жанровых пресетов не подходит.
          </p>
        </div>
      </div>

      <div className="about-formula glass-card">
        <h2>🔢 Формула расчёта</h2>
        <div className="formula-steps">
          <div className="formula-step">
            <span className="step-number">1.</span>
            <span>По каждому блоку считается среднее арифметическое его критериев</span>
          </div>
          <div className="formula-step">
            <span className="step-number">2.</span>
            <span>Технический балл (T) = (среднее_блока1 × вес1 + … + среднее_блока5 × вес5) × {TECHNICAL_MULTIPLIER}</span>
          </div>
          <div className="formula-step">
            <span className="step-number">3.</span>
            <span>Субъективная оценка <strong>«Вайб»</strong> (M) — ваша личная оценка фильма от 1 до 10</span>
          </div>
          <div className="formula-step">
            <span className="step-number">4.</span>
            <span>Вайб-множитель = 1 + (M − 1) × {VIBE_STEP}</span>
          </div>
          <div className="formula-step">
            <span className="step-number">5.</span>
            <span>Комбинированный балл = T × Вайб-множитель</span>
          </div>
        </div>
        <div className="formula-result">
          <p>Итоговая оценка всегда в диапазоне от <strong>{MIN_SCORE}</strong> до {MAX_SCORE}.</p>
          <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
            💡 Округление происходит только в самом конце, поэтому все нюансы оценок сохраняются.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;
