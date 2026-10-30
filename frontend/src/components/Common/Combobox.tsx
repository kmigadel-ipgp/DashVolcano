import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

interface ComboboxProps<T> {
  /** Input id, used by an external <label htmlFor> */
  id?: string;
  /** Current text of the input */
  value: string;
  /** Called when the user types */
  onValueChange: (value: string) => void;
  /** Suggestions to show (already filtered by the caller) */
  options: T[];
  getOptionKey: (option: T) => string | number;
  getOptionLabel: (option: T) => string;
  /** Called when a suggestion is chosen (click, or Enter on the highlighted one) */
  onSelect: (option: T) => void;
  placeholder?: string;
  /** Accessible name when there is no visible label */
  ariaLabel?: string;
  inputClassName: string;
  inputStyle?: CSSProperties;
  optionClassName?: string;
  /** Classes of the highlighted suggestion (keyboard or pointer) */
  activeOptionClassName?: string;
}

/**
 * Text input with a suggestion list, following the WAI-ARIA combobox pattern:
 * ArrowDown/ArrowUp move through suggestions, Enter selects, Escape closes.
 * The list is rendered as a sibling of the input, so the caller's wrapper
 * must be `relative` (as before).
 */
export function Combobox<T>({
  id,
  value,
  onValueChange,
  options,
  getOptionKey,
  getOptionLabel,
  onSelect,
  placeholder,
  ariaLabel,
  inputClassName,
  inputStyle,
  optionClassName = 'w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer',
  activeOptionClassName = 'bg-volcano-50',
}: ComboboxProps<T>) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const isOpen = open && options.length > 0;
  const active = isOpen && activeIndex < options.length ? activeIndex : -1;

  // Keep the highlighted suggestion visible while navigating with the keyboard
  useEffect(() => {
    if (active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const select = (option: T) => {
    onSelect(option);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setOpen(true);
        setActiveIndex(event.key === 'ArrowDown' ? 0 : options.length - 1);
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((active + step + options.length) % options.length);
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      select(options[active]);
    } else if (event.key === 'Escape' && isOpen) {
      // Close the list only; do not let page-level Escape handlers run
      event.stopPropagation();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        style={inputStyle}
      />
      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel ? `${ariaLabel} suggestions` : 'Suggestions'}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {options.map((option, index) => (
            <li
              key={getOptionKey(option)}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // Keep focus in the input so the list is not closed before the click
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(option)}
              className={`${optionClassName} ${index === active ? activeOptionClassName : ''}`}
            >
              {getOptionLabel(option)}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
