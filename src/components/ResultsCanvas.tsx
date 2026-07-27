import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Calendar,
  CheckCircle2,
  Coins,
  Flame,
  Gauge,
  Home,
  Snowflake,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { emirateLabel, monthLabel, riskLabel } from '@/lib/engine';
import { seasonLabel, type CalculatorResult } from '@/utils/calculatorEngine';
import { type CashflowApiResponse } from '@/lib/api';
import { formatAed, type ScenarioInput } from '@/lib/constants';
import { MangaPanel, SectionLabel } from '@/components/primitives';
import { CashWallVisualizer } from '@/components/results/CashWallVisualizer';
import { OverheadGauge } from '@/components/results/OverheadGauge';
import { LiquidityWave } from '@/components/results/LiquidityWave';
import { ActionDrawer } from '@/components/results/ActionDrawer';
import { AnimatedCounter } from '@/components/AnimatedCounter';

type ResultsCanvasProps = {
  input: ScenarioInput;
  calc: CalculatorResult;
  apiData: CashflowApiResponse | null;
  loading: boolean;
};

const toneStyles = {
  safe: { bg: 'bg-emeraldRisk', text: 'text-emeraldRisk', bar: 'bg-emeraldRisk' },
  caution: { bg: 'bg-sunset', text: 'text-sunset', bar: 'bg-sunset' },
  stress: { bg: 'bg-ink', text: 'text-ink', bar: 'bg-ink' },
} as const;

const pressureTone = {
  Low: { bg: 'bg-emeraldRisk', text: 'text-emeraldRisk-600', border: 'border-emeraldRisk' },
  Moderate: { bg: 'bg-sunset', text: 'text-sunset-600', border: 'border-sunset' },
  High: { bg: 'bg-ink', text: 'text-ink', border: 'border-ink' },
} as const;

export function ResultsCanvas({ input, calc, apiData, loading }: ResultsCanvasProps) {
  const riskScore = apiData?.predicted_overhead?.liquidity_risk_score ?? 0;
  // Convert 0-10 score to pressure string Low/Moderate/High
  const liquidityPressure = riskScore < 4 ? 'Low' : riskScore < 7 ? 'Moderate' : 'High';
  
  const risk = riskLabel(riskScore);
  const tone = toneStyles[risk.tone];
  const pressure = pressureTone[liquidityPressure as keyof typeof pressureTone];
  const modelInfo = { name: 'ONNX Runtime', version: '2026.1' };

  return (
    <MangaPanel className="p-5 sm:p-6" corners>
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-bold uppercase tracking-tight text-ink">
          Results Canvas
        </h2>
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
          <span className={`h-1.5 w-1.5 ${tone.bg} animate-glow`} />
          live · onnx
        </span>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <ResultsSkeleton key="skeleton" />
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-7"
          >
            {/* Scenario banner */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-2 border-ink bg-ink/5 px-3 py-2">
              <span className="flex items-center gap-1.5 font-heading text-[12px] font-bold uppercase tracking-wider text-ink">
                <Home className="h-3.5 w-3.5 text-sunset" />
                {emirateLabel(input.emirate)}
              </span>
              <span className="text-ink/30">·</span>
              <span className="font-body text-[12px] font-medium text-ink/70">{input.location}</span>
              <span className="text-ink/30">·</span>
              <span className="font-body text-[12px] font-medium text-ink/70">
                {input.layout.replace('br', ' BR').toUpperCase()}
              </span>
              <span className="text-ink/30">·</span>
              <span className="font-body text-[12px] font-medium text-ink/70">{input.propertyType}</span>
              <span className="text-ink/30">·</span>
              <span className="flex items-center gap-1 font-body text-[12px] font-medium text-ink/70">
                <Calendar className="h-3 w-3" />
                {monthLabel(input.moveInMonth)}
              </span>
              <span className="text-ink/30">·</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sunset">
                {seasonLabel(calc.season)}
              </span>
            </div>

            {/* Day-1 hero summary */}
            <div className="relative overflow-hidden border-2 border-ink bg-ink p-5 shadow-mangaLg">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sunset/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-sunset" />
                    <span className="font-heading text-[11px] font-bold uppercase tracking-[0.25em] text-cream/60">
                      Day-1 Liquid Cash Wall
                    </span>
                  </div>
                  <motion.div
                    key={calc.day1Total}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                    className="mt-2 font-display text-4xl font-bold text-cream tnum sm:text-5xl"
                  >
                    <AnimatedCounter
                      value={calc.day1Total}
                      compact={calc.day1Total >= 100000}
                      comboPopup
                      comboTone="sunset"
                      comboLabel={(delta) => `+${formatAed(delta, { compact: delta >= 100000 })} HIDDEN FEES!`}
                      prefix="AED "
                      className="text-cream"
                    />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-3 gap-3">
              <StatTile
                icon={<Coins className="h-4 w-4" />}
                label="First Cheque"
                value={formatAed(calc.firstInstallment, { compact: true })}
                sub={`${input.chequeFreq} cheques/yr`}
              />
              <StatTile
                icon={<TrendingUp className="h-4 w-4" />}
                label="Monthly Overhead"
                value={formatAed(calc.monthlyRecurring, { compact: true })}
                sub="Recurring bills"
              />
              <StatTile
                icon={<Gauge className="h-4 w-4" />}
                label="Cash / Rent"
                value={`${Math.round((calc.day1Total / input.annualRent) * 100)}%`}
                sub="Liquidity ratio"
              />
            </div>

            {/* ML prediction panel */}
            <section className="border-2 border-ink bg-ink/[0.03] p-4">
              <div className="flex items-center justify-between">
                <SectionLabel>PyTorch Inference · {modelInfo.name}</SectionLabel>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
                  v{modelInfo.version}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {/* Liquidity Risk Score */}
                <div className="border-2 border-ink/20 bg-parchment-50 p-3">
                  <p className="font-heading text-[9px] font-bold uppercase tracking-widest text-ink/50">
                    Liquidity Risk Score
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-bold text-ink tnum">
                      {riskScore.toFixed(1)}
                    </span>
                    <span className="font-mono text-[10px] text-ink/40">/ 10</span>
                  </div>
                  {/* Score bar */}
                  <div className="mt-2 flex gap-0.5">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span
                        key={i}
                        className={[
                          'h-1.5 flex-1 border',
                          i < Math.round(riskScore)
                            ? Math.round(riskScore) >= 7
                              ? 'bg-ink border-ink'
                              : Math.round(riskScore) >= 4
                              ? 'bg-sunset border-sunset'
                              : 'bg-emeraldRisk border-emeraldRisk'
                            : 'bg-transparent border-ink/15',
                        ].join(' ')}
                      />
                    ))}
                  </div>
                  <p className="mt-2 font-heading text-[10px] font-bold uppercase tracking-wider text-sunset-600">
                    {liquidityPressure} Pressure
                  </p>
                </div>

                {/* Predicted Utility */}
                <div className="border-2 border-ink/20 bg-parchment-50 p-3">
                  <p className="font-heading text-[9px] font-bold uppercase tracking-widest text-ink/50">
                    Peak Summer Utility
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-bold text-ink tnum">
                      {formatAed(apiData?.predicted_overhead.peak_summer_utility ?? 0, { compact: true })}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-ink/45 tnum">
                    Winter Baseline: {formatAed(apiData?.predicted_overhead.winter_baseline_utility ?? 0)}
                  </p>
                </div>
              </div>

              {/* Pressure badge */}
              <div className={`mt-3 flex items-center justify-center gap-2 border-2 ${pressure.border} ${pressure.bg}/10 px-3 py-2`}>
                <Brain className={`h-3.5 w-3.5 ${pressure.text}`} />
                <span className={`font-heading text-[12px] font-bold uppercase tracking-[0.18em] ${pressure.text}`}>
                  Day-1 Liquidity Pressure · {liquidityPressure}
                </span>
              </div>
            </section>

            {/* Component A — Day-1 Cash Wall visualizer */}
            <CashWallVisualizer apiData={apiData} calc={calc} chequeFreq={input.chequeFreq} />

            {/* Component B — True Monthly Overhead gauge */}
            <OverheadGauge apiData={apiData} calc={calc} input={input} />

            {/* Component C — 12-Month Liquidity Wave */}
            <LiquidityWave apiData={apiData} calc={calc} input={input} />

            {/* Move-in cost breakdown list */}
            <section>
              <SectionLabel>Move-In Cost Breakdown</SectionLabel>
              <ul className="mt-3 space-y-1.5">
                {calc.upfrontLines.map((item) => (
                  <motion.li
                    key={item.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center justify-between gap-3 border-l-2 border-ink/20 bg-parchment-50 px-3 py-2 hover:border-sunset hover:bg-sunset/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={[
                        'h-1.5 w-1.5 shrink-0',
                        item.risk === 2 ? 'bg-ink' : item.risk === 1 ? 'bg-sunset' : 'bg-emeraldRisk',
                      ].join(' ')} />
                      <div className="min-w-0">
                        <p className="font-heading text-[13px] font-semibold text-ink leading-tight truncate">
                          {item.label}
                        </p>
                        <p className="font-body text-[10px] text-ink/45 truncate">{item.detail}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[13px] font-bold text-ink tnum shrink-0">
                      {formatAed(item.amount, { compact: item.amount >= 100000 })}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </section>

            {/* Monthly recurring */}
            <section>
              <SectionLabel>Monthly Recurring Overhead</SectionLabel>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {calc.monthlyLines.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between gap-2 border-2 border-ink/15 bg-ink/5 px-3 py-2"
                  >
                    <span className="flex items-center gap-2 font-body text-[12px] font-medium text-ink/70 min-w-0">
                      {m.label.toLowerCase().includes('cooling') || m.label.toLowerCase().includes('chiller') || m.label.toLowerCase().includes('district') ? (
                        <Snowflake className="h-3.5 w-3.5 text-ink/40 shrink-0" />
                      ) : m.label.toLowerCase().includes('electricity') || m.label.toLowerCase().includes('housing') ? (
                        <Flame className="h-3.5 w-3.5 text-sunset/60 shrink-0" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 text-ink/30 shrink-0" />
                      )}
                      <span className="truncate">{m.label}</span>
                    </span>
                    <span className="font-mono text-[12px] font-bold text-ink tnum shrink-0">
                      {formatAed(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-2 border-ink bg-ink px-3 py-2 shadow-mangaSm">
                <span className="font-heading text-[12px] font-bold uppercase tracking-wider text-cream">
                  Total Monthly
                </span>
                <span className="font-mono text-[14px] font-bold text-sunset tnum">
                  {formatAed(calc.monthlyRecurring)}
                </span>
              </div>
            </section>

            {/* All-clear */}
            {liquidityPressure === 'Low' && riskScore < 4 && (
              <div className="flex items-center gap-2 border-2 border-emeraldRisk bg-emeraldRisk/10 px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-emeraldRisk-600 shrink-0" />
                <span className="font-body text-[12px] font-medium text-emeraldRisk-600">
                  No liquidity stressors detected for this scenario.
                </span>
              </div>
            )}

            {/* Component D — n8n Action Drawer */}
            <ActionDrawer input={input} calc={calc} />
          </motion.div>
        )}
      </AnimatePresence>
    </MangaPanel>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border-2 border-ink bg-parchment-50 p-3 shadow-mangaSm">
      <div className="flex items-center gap-1.5 text-ink/50">
        {icon}
        <span className="font-heading text-[9px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-xl font-bold text-ink tnum leading-none">{value}</p>
      <p className="mt-1 font-body text-[10px] text-ink/40">{sub}</p>
    </div>
  );
}

/** Shimmering manga-panel skeleton shown during recalculation. */
function ResultsSkeleton() {
  const blocks = [
    { h: 'h-28', w: 'w-full' },
    { h: 'h-20', w: 'w-full', grid: 'grid grid-cols-3 gap-3' },
    { h: 'h-8', w: 'w-3/4' },
    { h: 'h-8', w: 'w-2/3' },
    { h: 'h-8', w: 'w-1/2' },
    { h: 'h-16', w: 'w-full' },
    { h: 'h-40', w: 'w-full' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {blocks.map((b, i) => (
        <div
          key={i}
          className={`shimmer-skeleton border-2 border-ink/15 ${b.h} ${b.w} ${b.grid ?? ''}`}
        >
          {b.grid &&
            [0, 1, 2].map((j) => (
              <div key={j} className="shimmer-skeleton border-2 border-ink/10 h-full" />
            ))}
        </div>
      ))}
    </motion.div>
  );
}
