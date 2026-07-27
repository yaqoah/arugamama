import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';

const STATUS_CYCLE = [
  'Auditing DEWA Slab Tariffs…',
  'Predicting Empower Capacity Overhead…',
  'Calculating Day-1 Liquid Cash Wall…',
  'Cross-referencing Ejari Fee Schedules…',
  'Modeling Peak-Summer Cooling Load…',
  'Indexing Brokerage & Service Charges…',
];

type LoadingOverlayProps = {
  active: boolean;
};

/**
 * Full-screen anime loading overlay. Renders shimmering manga-panel
 * cutouts, a cycling status line, and a radial speed-line burst. Shown
 * only on the initial engine boot — not during incremental recalcs.
 */
export function LoadingOverlay({ active }: LoadingOverlayProps) {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_CYCLE.length);
    }, 900);
    return () => clearInterval(id);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-parchment-100/95 backdrop-blur-sm"
        >
          {/* Radial speed lines */}
          <SpeedBurst />

          <div className="relative flex flex-col items-center gap-6 px-6 max-w-md">
            {/* Logo pulse */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex h-16 w-16 items-center justify-center border-2 border-ink bg-ink text-cream shadow-mangaLg"
            >
              <Zap className="h-8 w-8 text-sunset" fill="currentColor" />
              <motion.span
                className="absolute -right-1.5 -top-1.5 h-3 w-3 bg-sunset border-2 border-ink"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </motion.div>

            <div className="text-center">
              <h2 className="font-heading text-xl font-bold uppercase tracking-[0.18em] text-ink">
                arugamama
              </h2>
              <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-ink/40">
                UAE Renter Cashflow Engine
              </p>
            </div>

            {/* Shimmering manga-panel cutouts */}
            <div className="w-full grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-16 border-2 border-ink/20 shimmer-skeleton"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </div>
            <div className="w-full space-y-2">
              <div className="h-6 w-full border-2 border-ink/20 shimmer-skeleton" />
              <div className="h-6 w-3/4 border-2 border-ink/20 shimmer-skeleton" />
            </div>

            {/* Cycling status text */}
            <div className="flex min-h-[2.5rem] items-center gap-2 border-2 border-ink bg-ink px-4 py-2 shadow-mangaSm">
              <Sparkles className="h-3.5 w-3.5 text-sunset animate-glow shrink-0" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={statusIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="font-mono text-[12px] font-medium text-cream"
                >
                  {STATUS_CYCLE[statusIndex]}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Progress ticks */}
            <div className="flex gap-1.5">
              {STATUS_CYCLE.map((_, i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-6 border border-ink"
                  animate={{
                    backgroundColor:
                      i === statusIndex ? '#6D2A8D' : i < statusIndex ? '#0D1117' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Continuous radial speed-line burst for the boot overlay. */
function SpeedBurst() {
  const lines = Array.from({ length: 20 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {lines.map((i) => {
        const angle = (i / lines.length) * Math.PI * 2;
        const len = 160 + (i % 5) * 60;
        const x = Math.cos(angle) * len;
        const y = Math.sin(angle) * len;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 h-[2px] bg-gradient-to-r from-sunset via-sunset/40 to-transparent"
            style={{ width: 80 + (i % 4) * 40, transformOrigin: 'left center' }}
            initial={{ x: 0, y: 0, rotate: (angle * 180) / Math.PI, opacity: 0, scaleX: 0 }}
            animate={{ x, y, scaleX: 1, opacity: [0, 0.7, 0] }}
            transition={{
              duration: 1.4,
              delay: (i % 6) * 0.1,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
}
