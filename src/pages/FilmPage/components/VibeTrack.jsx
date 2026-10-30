import React, { useCallback, useEffect, useRef } from 'react';
import { getVibeWord } from '../../../utils/scoring';

const VIBE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * F1/DECISION: на устройствах с coarse pointer — 10 крупных сегментов,
 * на десктопе — drag-трек. Один и тот же value/onInput/onCommit.
 *
 * Клик по уже выставленному значению — no-op: на бэкенде нет DELETE оценки,
 * а `vibe: 0` невалиден. Фальшивый «сброс» не показываем.
 */
export default function VibeTrack({
  value = 0,
  coarse = false,
  disabled = false,
  readOnly = false,
  onInput = () => {},
  onCommit = () => {}
}) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const lastEmittedRef = useRef(value);

  // После ответа сервера/отката ошибки value меняется извне — синхронизируем
  // последний эмит, иначе следующий drag на то же значение не обновит UI.
  useEffect(() => {
    lastEmittedRef.current = value;
  }, [value]);

  const isInactive = disabled || readOnly;
  const percent = value >= 1 ? ((value - 1) / 9) * 100 : 0;

  const valueFromClientX = useCallback(clientX => {
    const element = trackRef.current;
    if (!element) return value || 1;

    const rect = element.getBoundingClientRect();
    if (!rect.width) return value || 1;

    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * 9) + 1;
  }, [value]);

  const emitInput = next => {
    if (next === lastEmittedRef.current) return;
    lastEmittedRef.current = next;
    onInput(next);
  };

  const handlePointerDown = event => {
    if (isInactive) return;
    event.preventDefault();

    draggingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const next = valueFromClientX(event.clientX);
    lastEmittedRef.current = next;
    onInput(next);
  };

  const handlePointerMove = event => {
    if (!draggingRef.current || isInactive) return;
    emitInput(valueFromClientX(event.clientX));
  };

  const finishDrag = event => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    onCommit(valueFromClientX(event.clientX));
  };

  const cancelDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onCommit(value);
  };

  const handleKeyDown = event => {
    if (isInactive) return;

    const current = value >= 1 ? value : 0;
    let next = null;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = Math.min(10, Math.max(1, current + 1));
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = Math.max(1, current - 1);
        break;
      case 'Home':
        next = 1;
        break;
      case 'End':
        next = 10;
        break;
      default:
        return;
    }

    event.preventDefault();
    if (next === value) return;

    lastEmittedRef.current = next;
    onInput(next);
    onCommit(next);
  };

  if (coarse) {
    return (
      <div
        className={`vibe-segments ${isInactive ? 'is-disabled' : ''}`}
        role="group"
        aria-label="Вайб от 1 до 10"
      >
        {VIBE_VALUES.map(item => (
          <button
            key={item}
            type="button"
            className={`vibe-segment ${value === item ? 'is-active' : ''}`}
            aria-pressed={value === item}
            disabled={isInactive}
            onClick={() => {
              if (item === value) return;
              lastEmittedRef.current = item;
              onInput(item);
              onCommit(item);
            }}
          >
            {item}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className={`vibe-track ${value < 1 ? 'is-empty' : ''} ${isInactive ? 'is-disabled' : ''}`}
      role="slider"
      tabIndex={isInactive ? -1 : 0}
      aria-label="Вайб от 1 до 10"
      aria-valuemin={1}
      aria-valuemax={10}
      aria-valuenow={value >= 1 ? value : 0}
      aria-valuetext={getVibeWord(value)}
      aria-disabled={isInactive}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={cancelDrag}
      onKeyDown={handleKeyDown}
    >
      <div className="vibe-rail">
        <div className="vibe-fill" style={{ width: `${percent}%` }} />
        <div className="vibe-thumb" style={{ left: `${percent}%` }} />
      </div>
    </div>
  );
}
