import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type SegmentedOption<T extends string | number> = {
  id: T;
  label: ReactNode;
  sub?: string;
};

type SegmentedControlProps<T extends string | number> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
  compact?: boolean;
  ariaLabel?: string;
};

/**
 * Segmented control with a sliding manga-panel highlighter that travels
 * between options using layoutId animation.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  columns,
  compact = false,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const gridStyle = columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined;
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="relative grid gap-1.5 bg-ink/5 border-2 border-ink p-1.5"
      style={gridStyle}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={String(opt.id)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={[
              'relative z-10 flex flex-col items-center justify-center py-2 px-2',
              'font-heading font-bold uppercase tracking-wider transition-colors duration-150 press-physics',
              compact ? 'text-[12px]' : 'text-[13px]',
              active ? 'text-cream' : 'text-ink/60 hover:text-ink',
            ].join(' ')}
          >
            {active && (
              <motion.span
                layoutId={`seg-${ariaLabel ?? 'control'}`}
                className="absolute inset-0 z-[-1] bg-ink shadow-mangaSm"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="leading-none">{opt.label}</span>
            {opt.sub && (
              <span className={[
                'mt-1 font-body font-medium normal-case tracking-normal',
                compact ? 'text-[9px]' : 'text-[9.5px]',
                active ? 'text-cream/70' : 'text-ink/40',
              ].join(' ')}>
                {opt.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

type SearchableDropdownProps = {
  options: { value: string; label: string; code?: string; tag?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
};

/**
 * Anime-styled searchable dropdown. Custom manga-panel popover with
 * code-badge list items, keyboard nav, and click-outside dismissal.
 */
export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  ariaLabel,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = options.filter((o) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      o.label.toLowerCase().includes(q) ||
      (o.code?.toLowerCase().includes(q) ?? false) ||
      (o.tag?.toLowerCase().includes(q) ?? false)
    );
  });

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={[
          'group flex w-full items-center justify-between gap-2 bg-parchment-100 border-2 border-ink',
          'px-3 py-2.5 text-left shadow-mangaSm press-physics',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.code && (
            <span className="font-mono text-[10px] font-bold text-cream bg-ink px-1.5 py-0.5 shrink-0">
              {selected.code}
            </span>
          )}
          <span className="truncate font-heading text-sm font-semibold text-ink">
            {selected?.label ?? 'Select…'}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, rotateX: -8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -6, rotateX: -8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute z-50 mt-2 w-full bg-parchment-100 border-2 border-ink shadow-mangaLg origin-top"
            style={{ transformPerspective: 600 }}
          >
            <div className="flex items-center gap-2 border-b-2 border-ink/10 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-ink/50 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlight((h) => Math.min(h + 1, filtered.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlight((h) => Math.max(h - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filtered[highlight]) select(filtered[highlight].value);
                  } else if (e.key === 'Escape') {
                    setOpen(false);
                  }
                }}
                placeholder={placeholder}
                className="w-full bg-transparent font-body text-sm text-ink placeholder:text-ink/40 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-ink/40 hover:text-ink"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <ul className="max-h-60 overflow-y-auto thin-scroll">
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center font-body text-xs text-ink/40">
                  No matches found
                </li>
              )}
              {filtered.map((opt, i) => {
                const active = opt.value === value;
                const hi = i === highlight;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => select(opt.value)}
                      className={[
                        'flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors',
                        hi ? 'bg-sunset/10' : '',
                        active ? 'bg-ink/5' : '',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {opt.code && (
                          <span className="font-mono text-[10px] font-bold text-cream bg-ink px-1.5 py-0.5 shrink-0">
                            {opt.code}
                          </span>
                        )}
                        <span className="truncate font-heading text-sm font-semibold text-ink">
                          {opt.label}
                        </span>
                      </span>
                      {opt.tag && (
                        <span className="font-body text-[10px] font-medium uppercase tracking-wider text-ink/40 shrink-0">
                          {opt.tag}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type MonthDropdownProps = {
  options: { id: string; label: string; peak: boolean }[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
};

/** Custom dropdown for month selection with peak-summer flagging. */
export function MonthDropdown({
  options,
  value,
  onChange,
  ariaLabel,
}: MonthDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={[
          'group flex w-full items-center justify-between gap-2 bg-parchment-100 border-2 border-ink',
          'px-3 py-2.5 text-left shadow-mangaSm press-physics',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate font-heading text-sm font-semibold text-ink">
            {selected?.label ?? 'Select…'}
          </span>
          {selected?.peak && (
            <span className="font-mono text-[9px] font-bold text-cream bg-sunset px-1 py-0.5 shrink-0">
              PEAK
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, rotateX: -8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: -6, rotateX: -8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute z-50 mt-2 w-full bg-parchment-100 border-2 border-ink shadow-mangaLg origin-top grid grid-cols-3"
            style={{ transformPerspective: 600 }}
          >
            {options.map((opt) => {
              const active = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={[
                    'relative flex flex-col items-center justify-center gap-1 py-2.5 px-1',
                    'border-r border-b border-ink/10 last:border-r-0',
                    'font-heading text-[12px] font-semibold transition-colors',
                    active ? 'bg-sunset text-cream' : 'text-ink hover:bg-sunset/10',
                  ].join(' ')}
                >
                  <span>{opt.label.slice(0, 3)}</span>
                  {opt.peak && (
                    <span className={[
                      'font-mono text-[8px] font-bold px-1 py-0.5',
                      active ? 'bg-sunset text-cream' : 'bg-sunset/15 text-sunset-600',
                    ].join(' ')}>
                      PEAK
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
