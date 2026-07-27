import { motion } from 'framer-motion';

/** Sleek anime HUD navigation bar. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-parchment-100/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        {/* Brand + title */}
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            initial={{ rotate: -8, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-ink shadow-mangaSm"
          >
            <span className="font-display text-2xl font-black leading-none text-sunset drop-shadow-[2px_2px_0px_#0D1117]">
              ~
            </span>
            <span className="absolute -right-1 -top-1 h-2 w-2 bg-sunset border border-ink" />
          </motion.div>
          <div className="min-w-0">
            <h1 className="font-heading text-base font-bold uppercase tracking-[0.18em] text-ink sm:text-lg leading-none truncate">
              UAE Renter Cashflow Engine
            </h1>
            <p className="mt-1 hidden font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-ink/40 sm:block">
              arugamama · move-in reality v2026
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
