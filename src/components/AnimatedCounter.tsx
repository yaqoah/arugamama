import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { formatAed } from '@/lib/constants';

type AnimatedCounterProps = {
  value: number;
  className?: string;
  compact?: boolean;
  prefix?: string;
  /** Show a fighting-game COMBO popup on value increase. */
  comboPopup?: boolean;
  /** Combo popup label template; {delta} is substituted. */
  comboLabel?: (delta: number) => string;
  /** Combo popup tone. */
  comboTone?: 'sunset' | 'red' | 'emerald';
};

const comboToneClasses = {
  sunset: 'bg-sunset border-ink text-cream',
  red: 'bg-ink border-ink text-cream',
  emerald: 'bg-emeraldRisk border-ink text-cream',
} as const;

/**
 * Count-up number that springs to its target on every value change.
 * Optionally emits a fighting-game "COMBO INCREASE" popup when the
 * value rises, showing the delta as "+AED X HIDDEN FEES ADDED!".
 */
export function AnimatedCounter({
  value,
  className = '',
  compact = false,
  prefix = 'AED ',
  comboPopup = false,
  comboLabel,
  comboTone = 'sunset',
}: AnimatedCounterProps) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (latest) => Math.round(latest));
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const [combo, setCombo] = useState<{ id: number; text: string } | null>(null);
  const comboId = useRef(0);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    const delta = value - prev;

    const controls = animate(mv, value, {
      type: 'spring',
      stiffness: 140,
      damping: 22,
      duration: 0.6,
    });

    if (comboPopup && delta > 0) {
      comboId.current += 1;
      const id = comboId.current;
      const text = comboLabel
        ? comboLabel(delta)
        : `+${formatAed(delta, { compact: delta >= 100000 })} ADDED!`;
      setCombo({ id, text });
      const t = setTimeout(() => {
        setCombo((c) => (c && c.id === id ? null : c));
      }, 1700);
      return () => {
        controls.stop();
        clearTimeout(t);
      };
    }

    return () => controls.stop();
  }, [value, comboPopup, comboLabel, mv]);

  useEffect(() => {
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return () => unsub();
  }, [rounded]);

  return (
    <span className={`relative inline-block tnum ${className}`}>
      <span>{prefix}{formatAed(display, { compact, decimals: 0 }).replace('AED ', '')}</span>

      {comboPopup && (
        <motion.span
          key={combo?.id}
          initial={{ opacity: 0, y: 6, scale: 0.6, rotate: -8 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-2, -18, -24, -30], scale: [0.6, 1.15, 1, 0.9], rotate: [-8, 4, 0, -2] }}
          transition={{ duration: 1.7, times: [0, 0.15, 0.7, 1], ease: 'easeOut' }}
          className={`pointer-events-none absolute -top-3 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap border-2 px-2 py-0.5 font-heading text-[10px] font-bold uppercase tracking-wider shadow-mangaSm ${comboToneClasses[comboTone]}`}
        >
          {combo?.text}
        </motion.span>
      )}
    </span>
  );
}
