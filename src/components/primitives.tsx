import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type CornerAccentProps = {
  className?: string;
};

/** Single sharp L-bracket manga HUD corner decal. */
export function CornerBracket({ className = '' }: CornerAccentProps) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path d="M1 5V1H5" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

type MangaPanelProps = {
  children: ReactNode;
  className?: string;
  inset?: boolean;
  corners?: boolean;
  hover?: boolean;
  glowOnHover?: boolean;
};

/**
 * Core framing component. Every major surface in the app renders as a
 * manga panel: sharp 2px ink border + offset solid drop shadow + L-bracket
 * corner decals. `inset` swaps the drop shadow for an inset bevel.
 */
export function MangaPanel({
  children,
  className = '',
  inset = false,
  corners = true,
  hover = false,
  glowOnHover = false,
}: MangaPanelProps) {
  const shadow = inset ? 'shadow-mangaInset' : 'shadow-manga';
  return (
    <div
      className={[
        'relative bg-parchment-100 border-2 border-ink',
        shadow,
        hover ? 'transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5' : '',
        className,
      ].join(' ')}
    >
      {corners && (
        <>
          <CornerBracket className="absolute -top-[3px] -left-[3px] text-ink" />
          <CornerBracket className="absolute -top-[3px] -right-[3px] text-ink rotate-90" />
          <CornerBracket className="absolute -bottom-[3px] -left-[3px] text-ink -rotate-90" />
          <CornerBracket className="absolute -bottom-[3px] -right-[3px] text-ink rotate-180" />
        </>
      )}
      {glowOnHover && (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 hover:opacity-100 bg-gradient-to-br from-sunset/5 to-transparent" />
      )}
      {children}
    </div>
  );
}

type SectionLabelProps = {
  index?: number;
  children: ReactNode;
  className?: string;
};

/** Manga-chapter style label with a leading index ticker. */
export function SectionLabel({ index, children, className = '' }: SectionLabelProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {typeof index === 'number' && (
        <span className="font-mono text-[10px] font-bold text-parchment-100 bg-ink px-1.5 py-0.5 tabular-nums">
          {String(index).padStart(2, '0')}
        </span>
      )}
      <span className="font-heading text-[11px] font-bold uppercase tracking-[0.22em] text-ink">
        {children}
      </span>
      <span className="h-px flex-1 bg-ink/15" />
    </div>
  );
}

/** Ambient floating dust particles — Shinkai atmospheric layer. */
export function AmbientBackground() {
  const particles = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-br from-parchment-50 via-parchment-100 to-parchment-200" />
      <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-sunset/10 blur-3xl" />
      <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-sunset/5 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-ink/5 blur-3xl" />
      {particles.map((i) => {
        const left = (i * 73) % 100;
        const top = (i * 37 + 11) % 100;
        const size = 1 + (i % 3);
        const delay = (i % 7) * 1.4;
        const duration = 9 + (i % 5) * 2;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-ink/30"
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
            animate={{ y: [0, -24, 0], x: [0, 12, 0], opacity: [0.15, 0.5, 0.15] }}
            transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        );
      })}
    </div>
  );
}

/** Speed-line particle burst used during recalculations. */
export function SpeedLines({ active }: { active: boolean }) {
  const lines = Array.from({ length: 14 }, (_, i) => i);
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
      {lines.map((i) => {
        const angle = (i / lines.length) * Math.PI * 2;
        const len = 80 + (i % 4) * 50;
        const x = Math.cos(angle) * len;
        const y = Math.sin(angle) * len;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 h-[2px] bg-gradient-to-r from-sunset to-transparent"
            style={{ width: 40 + (i % 3) * 20, transformOrigin: 'left center' }}
            initial={{ x: 0, y: 0, rotate: (angle * 180) / Math.PI, opacity: 0.8, scaleX: 0 }}
            animate={{ x, y, scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

type MangaBadgeProps = {
  children: ReactNode;
  tone?: 'warning' | 'danger' | 'info';
  className?: string;
  icon?: ReactNode;
  /** Spike burst scale-in. */
  burst?: boolean;
};

const badgeToneClasses = {
  warning: 'bg-sunset-200 border-ink text-sunset-600',
  danger: 'bg-sunset border-ink text-cream',
  info: 'bg-ink border-ink text-cream',
} as const;

/**
 * Cell-shaded manga callout badge. Sharp 2px border + offset shadow +
 * a burst-in entrance with a subtle rotation, like a manga sound-effect
 * bubble. Used for critical warnings ("EMPOWER CAPACITY TRAP DETECTED").
 */
export function MangaBadge({
  children,
  tone = 'warning',
  className = '',
  icon,
  burst = true,
}: MangaBadgeProps) {
  return (
    <motion.div
      initial={burst ? { scale: 0.4, rotate: -6, opacity: 0 } : false}
      animate={burst ? { scale: 1, rotate: 0, opacity: 1 } : undefined}
      transition={burst ? { type: 'spring', stiffness: 360, damping: 18 } : undefined}
      className={`relative inline-flex items-center gap-2 border-2 px-3 py-1.5 shadow-mangaSm ${badgeToneClasses[tone]} ${className}`}
    >
      {/* Notched corner accents for the manga-cell feel */}
      <span className="absolute -top-[3px] -left-[3px] h-2 w-2 border-2 border-ink bg-current opacity-90" />
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="font-heading text-[11px] font-bold uppercase tracking-[0.16em] leading-none">
        {children}
      </span>
    </motion.div>
  );
}

type SpeedLineBurstProps = {
  /** Trigger key — changing this re-fires the burst. */
  trigger: string | number;
  className?: string;
  /** Direction: 'horizontal' (left↔right) or 'radial' (all around). */
  direction?: 'horizontal' | 'radial';
};

/**
 * Speed-line motion FX overlay. Renders a burst of motion-trail lines
 * behind a container whenever `trigger` changes — used behind the
 * Day-1 Cash Wall chart when toggling cheque frequency. The lines
 * streak horizontally for "cheque vs cheque" comparison energy.
 */
export function SpeedLineBurst({ trigger, className = '', direction = 'horizontal' }: SpeedLineBurstProps) {
  return (
    <div
      key={trigger}
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: direction === 'horizontal' ? 9 : 14 }, (_, i) => {
        if (direction === 'horizontal') {
          const top = 8 + (i / 9) * 84;
          const fromLeft = i % 2 === 0;
          return (
            <motion.div
              key={i}
              className="absolute h-[2px] bg-gradient-to-r from-sunset via-sunset/40 to-transparent"
              style={{ top: `${top}%`, width: '55%' }}
              initial={{ x: fromLeft ? '-60%' : '60%', opacity: 0 }}
              animate={{ x: fromLeft ? '120%' : '-120%', opacity: [0, 0.85, 0] }}
              transition={{ duration: 0.55, delay: i * 0.025, ease: 'easeOut' }}
            />
          );
        }
        const angle = (i / 14) * Math.PI * 2;
        const len = 70 + (i % 4) * 40;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 h-[2px] bg-gradient-to-r from-sunset to-transparent"
            style={{ width: 50 + (i % 3) * 18, transformOrigin: 'left center' }}
            initial={{ x: 0, y: 0, rotate: (angle * 180) / Math.PI, opacity: 0.8, scaleX: 0 }}
            animate={{ x: Math.cos(angle) * len, y: Math.sin(angle) * len, scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
