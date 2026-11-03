import React, { useEffect, useState } from 'react';
import api from '../../../../api/client';
import './WatchModal.css';

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTags(raw) {
  const tags = [];
  const seen = new Set();

  for (const part of String(raw || '').split(',')) {
    const tag = part.trim();
    if (!tag) continue;
    if (tag.length > 30) {
      return { tags: [], error: 'Тег длиннее 30 символов' };
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  if (tags.length > 10) {
    return { tags: [], error: 'Не больше 10 тегов на запись' };
  }

  return { tags, error: '' };
}

/**
 * F4: «Отметить просмотр».
 *
 * DECISION: F4/3A — теги вводятся одной строкой через запятую, разбиваются
 * на массив при отправке. Это дешевле chips-редактора и работает на мобиле.
 * DECISION: F4/4A — дата по умолчанию сегодня; пустую дату не отправляем.
 * DECISION: F4/7A — «Пересмотр» — нейтральная плашка в ленте, не pink.
 * DECISION: F4/9A — форма живёт в модалке поверх страницы, как CriteriaModal.
 * Ошибки 400 (будущая дата, лимиты тегов) показываются inline: форма не
 * закрывается, введённые значения остаются на месте.
 */
export default function WatchModal({ film, onClose, onSaved }) {
  const today = todayInputValue();
  const [watchedAt, setWatchedAt] = useState(today);
  const [isRewatch, setIsRewatch] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape' && !isSaving) onClose?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, isSaving]);

  const handleSubmit = async event => {
    event.preventDefault();
    if (isSaving) return;

    if (!watchedAt) {
      setError('Укажите дату просмотра');
      return;
    }
    if (watchedAt > today) {
      setError('Дата просмотра не может быть в будущем');
      return;
    }

    const parsed = parseTags(tagsInput);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      const response = await api.post('/watches', {
        filmId: film?._id,
        watchedAt,
        isRewatch,
        tags: parsed.tags
      });
      onSaved?.(response.data);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось сохранить просмотр');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay watch-overlay"
      onClick={() => { if (!isSaving) onClose?.(); }}
    >
      <div
        className="modal-content watch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="watchModalTitle"
        onClick={event => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={() => onClose?.()}
          disabled={isSaving}
          aria-label="Закрыть"
        >
          ×
        </button>

        <div className="modal-head">
          <p className="modal-kicker">Дневник</p>
          <h2 className="modal-title" id="watchModalTitle">Отметить просмотр</h2>
          <p className="modal-sub">
            {[film?.title, film?.year].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* DECISION: F4/4A — валидируем дату сами, чтобы показать inline-ошибку
            вместо нативного пузыря браузера. */}
        <form className="watch-form" onSubmit={handleSubmit} noValidate>
          <div className="watch-field">
            <label className="lbl" htmlFor="watchDate">Дата просмотра</label>
            <input
              id="watchDate"
              className="watch-input"
              type="date"
              value={watchedAt}
              max={today}
              onChange={event => {
                setWatchedAt(event.target.value);
                setError('');
              }}
              required
            />
          </div>

          <label className="watch-check">
            <input
              type="checkbox"
              checked={isRewatch}
              onChange={event => {
                setIsRewatch(event.target.checked);
                setError('');
              }}
            />
            <span>Повторный просмотр</span>
          </label>

          <div className="watch-field">
            <label className="lbl" htmlFor="watchTags">Теги</label>
            <input
              id="watchTags"
              className="watch-input"
              type="text"
              value={tagsInput}
              onChange={event => {
                setTagsInput(event.target.value);
                setError('');
              }}
              placeholder="в кино, с друзьями"
              aria-describedby="watchTagsHint"
            />
            <p className="watch-hint" id="watchTagsHint">
              До 10 тегов, каждый до 30 символов. Через запятую.
            </p>
          </div>

          {error && <p className="watch-error" role="alert">{error}</p>}

          <div className="watch-foot">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => onClose?.()}
              disabled={isSaving}
            >
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
