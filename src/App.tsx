import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AmbientBackground, SpeedLines } from '@/components/primitives';
import { Header } from '@/components/Header';
import { InputPanel } from '@/components/controls/InputPanel';
import { ResultsCanvas } from '@/components/ResultsCanvas';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useCashflowState } from '@/hooks/useCashflowState';

function App() {
  const { inputs, results, update, updateEmirate } = useCashflowState();
  const { calc, apiData } = results;
  const [booting, setBooting] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Initial boot overlay — plays once on mount.
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 3200);
    return () => clearTimeout(t);
  }, []);

  // Debounced recalculation flash whenever inputs change (after boot).
  useEffect(() => {
    if (booting) return;
    setRecalculating(true);
    const t = setTimeout(() => setRecalculating(false), 380);
    return () => clearTimeout(t);
  }, [inputs, booting]);

  return (
    <div className="relative min-h-screen text-ink">
      <AmbientBackground />
      <LoadingOverlay active={booting} />

      <div className="relative z-10">
        <Header />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Tagline strip */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6 flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-parchment-100 px-4 py-2.5 shadow-mangaSm"
          >
            <p className="font-heading text-[12px] font-bold uppercase tracking-[0.18em] text-ink">
              Move-In Reality Engine
            </p>
            <p className="hidden font-body text-[12px] text-ink/55 sm:block">
              Audit your Day-1 cash wall before you sign — DEWA slabs, Empower capacity, deposits & brokerage.
            </p>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
              v2026.1
            </span>
          </motion.div>

          {/* Two-column layout */}
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <SpeedLines active={recalculating} />
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <InputPanel input={inputs} update={update} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="relative"
            >
              <ResultsCanvas input={inputs} calc={calc} apiData={apiData} loading={recalculating} />
            </motion.div>
          </div>

          {/* Footer disclaimer */}
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/15 pt-4">
            <p className="font-body text-[11px] text-ink/45">
              Figures are illustrative planning estimates — not quotations. Always confirm current
              DEWA, Empower & community charges with your provider.
            </p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/30">
              arugamama · 2026
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
