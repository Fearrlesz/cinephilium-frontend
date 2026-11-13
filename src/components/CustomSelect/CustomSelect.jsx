import React, {
  useCallback, useEffect, useId, useRef, useState
} from 'react';
import './CustomSelect.css';

/**
 * Один кастомный селект для всего сайта: каталог, модалка оценки.
 *
 * DECISION: системный <select> не используем — его список рисует ОС
 * (на Windows он занимает пол-экрана и ломает тёмную панель).
 * Здесь кнопка + listbox в стиле сайта, с клавиатурой и aria.
 */
export default function CustomSelect({
  value = '',
  onChange = () => {},
  options = [],
  placeholder = 'Выберите…',
  ariaLabel,
  className = '',
  size = 'md',
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const optionRefs = useRef([]);
  const listId = useId();

  const selectedIndex = options.findIndex(option => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    setActiveIndex(-1);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  const openList = useCallback(() => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }, [selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;

    const onDocumentPointerDown = event => {
      if (!rootRef.current?.contains(event.target)) close();
    };

    document.addEventListener('pointerdown', onDocumentPointerDown);
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
  }, [open, close]);

  // Держим активный пункт в поле зрения, не двигая скролл модалки.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const list = listRef.current;
    const option = optionRefs.current[activeIndex];
    if (!list || !option) return;

    const optionTop = option.offsetTop;
    const optionBottom = optionTop + option.offsetHeight;

    if (optionTop < list.scrollTop) list.scrollTop = optionTop;
    else if (optionBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = optionBottom - list.clientHeight;
    }
  }, [open, activeIndex]);

  const selectOption = useCallback(index => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close(true);
  }, [options, onChange, close]);

  const moveActive = delta => {
    if (!options.length) return;
    setActiveIndex(previous => {
      const start = previous < 0 ? (selectedIndex >= 0 ? selectedIndex : 0) : previous;
      const next = start + delta;
      if (next < 0) return 0;
      if (next > options.length - 1) return options.length - 1;
      return next;
    });
  };

  const handleButtonKeyDown = event => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openList();
        else moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openList();
        else moveActive(-1);
        break;
      case 'Home':
        if (!open) return;
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        if (!open) return;
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) openList();
        else if (activeIndex >= 0) selectOption(activeIndex);
        break;
      case 'Escape':
        if (!open) return;
        event.preventDefault();
        // Не даём Escape одновременно закрыть модалку оценки.
        event.stopPropagation();
        close(true);
        break;
      case 'Tab':
        if (open) close();
        break;
      default:
        break;
    }
  };

  const rootClass = [
    'cselect',
    `cselect--${size}`,
    open ? 'is-open' : '',
    disabled ? 'is-disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="cselect__btn"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleButtonKeyDown}
      >
        <span className={`cselect__value ${selected ? '' : 'is-placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="cselect__chev" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="cselect__list" id={listId} role="listbox" ref={listRef} aria-label={ariaLabel}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value || `empty-${index}`}
                id={`${listId}-${index}`}
                ref={element => { optionRefs.current[index] = element; }}
                role="option"
                aria-selected={isSelected}
                className={`cselect__opt ${isSelected ? 'is-selected' : ''} ${isActive ? 'is-active' : ''}`}
                onPointerEnter={() => setActiveIndex(index)}
                onPointerDown={event => event.preventDefault()}
                onClick={() => selectOption(index)}
              >
                <span className="cselect__opt-label">{option.label}</span>
                {isSelected && <span className="cselect__check" aria-hidden="true">✓</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
