return (
  <form className="rating-form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
    <div className="genre-block glass-card">
      <h3>⚙️ Жанр и веса блоков</h3>
      <select value={genrePreset} onChange={e => onGenreChange(e.target.value)}>
        <option value="">Без жанра (базовые веса 30/25/20/15/10)</option>
        {Object.entries(GENRE_LABELS).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>

      {BLOCK_NAMES.map((name, i) => {
        const weight = blockWeights?.[i] ?? 20;
        const isDisabled = genrePreset !== 'hybrid';
        const inputId = `weight-${i}`;
        return (
          <div key={i} className="weight-slider">
            <label htmlFor={inputId}>{name}</label>
            <input
              id={inputId}
              type="range" min="0" max="100" step="1"
              value={weight}
              disabled={isDisabled}
              onChange={e => onWeightChange(i, e.target.value)}
              style={{ '--fill': `${weight}%` }}
            />
            <span className="value-display">{weight}%</span>
          </div>
        );
      })}

      <div className={`weights-sum ${weightsValid ? 'valid' : 'invalid'}`}>
        Σ = {totalWeight}% {weightsValid ? '✓' : '— нужно 100%'}
      </div>
    </div>

    {CRITERIA_CONFIG.map(block => (
      <div key={block.key} className="criteria-block">
        <h4>{block.name}</h4>
        {block.criteria.map(crit => {
          const value = getScore(block.key, crit.key);
          const hintId = `${block.key}.${crit.key}`;
          return (
            <div key={crit.key} className="criterion-slider">
              <label>
                {crit.name}{' '}
                <span className="hint-wrapper">
                  <button
                    type="button"
                    className="hint-icon"
                    onClick={() => setActiveHint(activeHint === hintId ? null : hintId)}
                    aria-expanded={activeHint === hintId}
                  >ⓘ</button>
                  {activeHint === hintId && (
                    <span className="hint-popup" role="tooltip">{crit.hint}</span>
                  )}
                </span>
              </label>
              <input
                type="range" min="1" max="10" step="1"
                value={value}
                onChange={e => onScoreChange(block.key, crit.key, e.target.value)}
                style={{ '--fill': `${(value - 1) * 10}%` }}
              />
              <span className="value-display">{value}</span>
            </div>
          );
        })}
      </div>
    ))}

    {/* ⬇️ ИСПРАВЛЕНО: h3 + .vibe-hint вместо label */}
    <div className="vibe-block">
      <h3>💫 Вайб</h3>
      <p className="vibe-hint">Субъективное впечатление. Не влияет на технический балл.</p>
      <input
        type="range" min="1" max="10" step="1"
        value={vibe}
        onChange={e => onVibeChange(Number(e.target.value))}
        style={{ '--fill': `${(vibe - 1) * 10}%` }}
      />
      <span className="value-display">{vibe}</span>
    </div>

    {/* ⬇️ УБРАН glass-card, чтобы работали свои padding/radius блока */}
    <div className="review-block">
      <label htmlFor="review-text">📝 Текстовый отзыв (опционально)</label>
      <textarea
        id="review-text"
        className="review-textarea"
        value={textReview || ''}
        onChange={e => onTextReviewChange(e.target.value)}
        placeholder="Напишите свои впечатления о фильме..."
        rows={4}
      />
    </div>

    {/* ⬇️ УБРАН glass-card */}
    <div className="preview">
      <h4>📊 Предварительный расчет</h4>
      <div className="preview-row">
        <span>⚔️ Технический балл:</span>
        <strong>{preview.tech?.toFixed(1) || '0.0'}</strong>
      </div>
      <div className="preview-row">
        <span>🚬 Вайб:</span>
        <strong>{vibe?.toFixed(1) || '0.0'}</strong>
      </div>
      <div className="preview-row">
        <span>⭐ Комбинированный:</span>
        <strong>{preview.combined?.toFixed(1) || '0.0'}</strong>
      </div>
    </div>

    <button
      type="submit"
      className="btn-save-rating"
      disabled={isSaving || !weightsValid}
    >
      {isSaving ? '⏳ Сохранение...' : '💾 Сохранить оценку'}
    </button>
  </form>
);
