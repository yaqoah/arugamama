import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { formatAed, RENT_MAX, RENT_MIN, RENT_STEP } from '@/lib/constants';

type RentSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

/**
 * Annual rent slider. The native range input is visually masked behind a
 * custom manga track + thumb; a speech-bubble badge floats above the thumb
 * showing the live formatted currency, shifting position with the value.
 */
export function RentSlider({ value, onChange }: RentSliderProps) {
  const pct = ((value - RENT_MIN) / (RENT_MAX - RENT_MIN)) * 100;
  const clampedPct = Math.max(0, Math.min(100, pct));

  const ticks = useMemo(() => {
    const stops = [0, 25, 50, 75, 100];
    return stops.map((s) => ({
      pct: s,
      label: formatAed(RENT_MIN + (RENT_MAX - RENT_MIN) * (s / 100), { compact: true }),
    }));
  }, []);

  return (
    <div className="relative pt-14 pb-2 select-none">
      {/* Speech-bubble currency badge — tracks the thumb position */}
      <motion.div
        className="pointer-events-none absolute top-0 z-10 flex flex-col items-center"
        style={{ left: `${clampedPct}%`, transform: 'translateX(-50%)' }}
        animate={{ left: `${clampedPct}%` }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        <div className="relative bg-sunset border-2 border-ink shadow-mangaSm px-3 py-1.5">
          <span className="font-mono text-[13px] font-bold text-cream tnum">
            {formatAed(value, { compact: value >= 100000 })}
          </span>
          {/* tail */}
          <span className="absolute left-1/2 -bottom-[7px] h-[8px] w-[8px] -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-ink bg-sunset" />
        </div>
      </motion.div>

      {/* Custom track behind the native input */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-3 bg-ink/10 border-2 border-ink">
        <div
          className="absolute inset-y-0 left-0 bg-sunset"
          style={{ width: `${clampedPct}%` }}
        />
      </div>

      {/* Native input — transparent track, custom thumb */}
      <input
        type="range"
        min={RENT_MIN}
        max={RENT_MAX}
        step={RENT_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Annual rent"
        className="absolute inset-x-0 top-1/2 h-8 w-full -translate-y-1/2"
        style={{
          // WebKit track transparent so custom track shows
          background: 'transparent',
        }}
      />

      {/* Tick labels */}
      <div className="mt-6 flex justify-between">
        {ticks.map((t) => (
          <div key={t.pct} className="flex flex-col items-center">
            <span className="h-1.5 w-px bg-ink/30" />
            <span className="mt-1 font-mono text-[9px] font-medium text-ink/40 tnum">
              {t.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
