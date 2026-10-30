import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface HelpTooltipProps {
  /** Id of the tooltip, referenced by the trigger's aria-describedby */
  id: string;
  /** Accessible name of the "?" button */
  label: string;
  /** Position and look of the tooltip panel */
  className: string;
  children: ReactNode;
}

/**
 * "?" help button whose explanation opens on hover and on keyboard focus,
 * stays open while hovered, and closes with Escape (WCAG 1.4.13).
 */
export const HelpTooltip = ({ id, label, className, children }: HelpTooltipProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="w-6 h-6 inline-flex items-center justify-center rounded-full text-ink-muted hover:text-ink cursor-help"
      >
        <span aria-hidden="true" className="text-xs border border-current rounded-full w-4 h-4 inline-flex items-center justify-center">?</span>
      </button>
      <div id={id} role="tooltip" className={`${open ? 'block' : 'hidden'} absolute z-50 ${className}`}>
        {children}
      </div>
    </div>
  );
};
