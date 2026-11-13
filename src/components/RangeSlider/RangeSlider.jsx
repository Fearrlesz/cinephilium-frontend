import React, { useEffect, useMemo, useRef, useState } from 'react';
import './RangeSlider.css';

const THUMB_RADIUS = 10;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Ползунок формы оценки.
 *
 * DECISION: визуальный трек/бегунок рисуем сами, но ввод остаётся нативным
 * input range — клавиатура, step и тач работают из коробки.
 *
 * «Липкий» режим: после клика мышью бегунок следует за курсором, пока он
 * над шкалой, и не требует держать кнопку. Отпускают: уход курсора,
 * клик мимо, Esc, потеря фокуса.
 */
export default function RangeSlider({
  id,
  min = 1,
  max = 10,
  step = 1,
  value,
  onChange = () => {},
  color,
  ticks,
  ariaLabel,
  className = '',
  disabled = false
}) {
  const inputRef = useRef(null);
  const draggingRef = useRef(false);
  const [armed, setArmed] = useState(false);

  const percent = max === min ? 0 : clamp((value - min) / (max - min), 0, 1);
  const tickValues = useMemo(() => {
    if (Array.isArray(ticks)) return ticks;
    const result = [];
    for (let tick = min; tick <= max; tick += step) result.push(tick);
    return result;
  }, [ticks, min, max, step]);

  const valueFromClientX = clientX => {
    const element = inputRef.current;
    if (!element) return value;
    const rect = element.getBoundingClientRect();
    if (!rect.width) return value;
    const ratio = clamp(
      (clientX - rect.left - THUMB_RADIUS) / (rect.width - THUMB_RADIUS * 2),
      0,
      1
    );
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    return clamp(stepped, min, max);
  };

  useEffect(() => {
    if (!armed) return undefined;

    const releaseOnOutside = event => {
      if (!inputRef.current?.contains(event.target)) setArmed(false);
    };
    const releaseOnEscape = event => {
      if (event.key === 'Escape') setArmed(false);
    };

    document.addEventListener('pointerdown', releaseOnOutside);
    document.addEventListener('keydown', releaseOnEscape);
    return () => {
      document.removeEventListener('pointerdown', releaseOnOutside);
      document.removeEventListener('keydown', releaseOnEscape);
    };
  }, [armed]);

  const handlePointerDown = event => {
    if (disabled) return;
    draggingRef.current = true;
    if (event.pointerType === 'mouse') setArmed(true);
  };

  const handlePointerMove = event => {
    if (!armed || draggingRef.current || disabled) return;
    const next = valueFromClientX(event.clientX);
    if (next !== value) onChange(next);
  };

  const handlePointerUp = event => {
    draggingRef.current = false;
    const element = inputRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) setArmed(false);
  };

  const handlePointerLeave = () => {
    if (!draggingRef.current) setArmed(false);
  };

  const handleKeyDown = event => {
    if (event.key === 'Escape' && armed) {
      setArmed(false);
      // Escape отпускает «липкий» бегунок, но не закрывает модалку.
      event.stopPropagation();
    }
  };

  const classNameFull = [
    'rs',
    armed ? 'is-armed' : '',
    disabled ? 'is-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNameFull}
      style={{ '--p': percent, '--fc': color }}
    >
      <input
        ref={inputRef}
        id={id}
        className="rs__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={event => onChange(Number(event.target.value))}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { draggingRef.current = false; }}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
      />
      <span className="rs__track" aria-hidden="true">
        <span className="rs__fill" />
      </span>
      <span className="rs__ticks" aria-hidden="true">
        {tickValues.map(tick => (
          <i key={tick} className={tick <= value + 0.001 ? 'is-on' : ''} />
        ))}
      </span>
      <span className="rs__thumb" aria-hidden="true" />
    </div>
  );
}
