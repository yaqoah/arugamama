import { motion } from 'framer-motion';
import { Gauge as GaugeIcon } from 'lucide-react';
import { formatAed, type ScenarioInput } from '@/lib/constants';
import type { CalculatorResult } from '@/utils/calculatorEngine';
import { SectionLabel } from '@/components/primitives';
import { type CashflowApiResponse } from '@/lib/api';

type OverheadGaugeProps = {
  calc: CalculatorResult;
  input: ScenarioInput;
  apiData: CashflowApiResponse | null;
};

const badgeToneStyles = {
  safe: { bg: 'bg-emeraldRisk', text: 'text-emeraldRisk-600', border: 'border-emeraldRisk' },
  caution: { bg: 'bg-sunset', text: 'text-sunset-600', border: 'border-sunset' },
  stress: { bg: 'bg-ink', text: 'text-ink', border: 'border-ink' },
} as const;

/**
 * Component B — True Monthly Overhead anime gauge dial.
 * Replaced static estimates with ML predictions for peak summer / baseline winter.
 */
export function OverheadGauge({ calc, input, apiData }: OverheadGaugeProps) {
  // Use ML prediction for gauge needle
  const riskScore = apiData?.predicted_overhead.liquidity_risk_score ?? 0;
  
  let badge: { label: string; tone: keyof typeof badgeToneStyles };
  if (riskScore >= 7) {
    badge = { label: 'HIGH LIQUIDITY RISK', tone: 'stress' };
  } else if (riskScore >= 4) {
    badge = { label: 'MODERATE LIQUIDITY RISK', tone: 'caution' };
  } else {
    badge = { label: 'LOW LIQUIDITY RISK', tone: 'safe' };
  }
  const tone = badgeToneStyles[badge.tone];

  // Gauge geometry — semicircle from 180° (left) to 0° (right)
  const maxScore = 10;
  const needlePct = Math.min(Math.max(riskScore / maxScore, 0), 1);
  const angle = 180 - needlePct * 180; // 180 → 0
  const radius = 70;
  const cx = 90;
  const cy = 90;
  const needleLen = radius - 12;
  const rad = (angle * Math.PI) / 180;
  const nx = cx + Math.cos(rad) * needleLen;
  const ny = cy - Math.sin(rad) * needleLen;

  // Arc segments
  const arc = (fromPct: number, toPct: number) => {
    const a0 = (180 - fromPct * 180) * (Math.PI / 180);
    const a1 = (180 - toPct * 180) * (Math.PI / 180);
    const x0 = cx + Math.cos(a0) * radius;
    const y0 = cy - Math.sin(a0) * radius;
    const x1 = cx + Math.cos(a1) * radius;
    const y1 = cy - Math.sin(a1) * radius;
    const large = toPct - fromPct > 0.5 ? 1 : 0;
    return `M ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1}`;
  };

  const peakSummer = apiData?.predicted_overhead.peak_summer_utility ?? 0;
  const baselineWinter = apiData?.predicted_overhead.winter_baseline_utility ?? 0;

  return (
    <section className="space-y-4">
      <SectionLabel>B · True Monthly Overhead</SectionLabel>

      <div className="border-2 border-ink bg-parchment-50 p-4 shadow-mangaSm">
        {/* Gauge dial */}
        <div className="flex flex-col items-center">
          <svg width="180" height="100" viewBox="0 0 180 100">
            {/* Track segments */}
            <path d={arc(0, 0.33)} fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="butt" />
            <path d={arc(0.33, 0.66)} fill="none" stroke="#f97316" strokeWidth="10" strokeLinecap="butt" />
            <path d={arc(0.66, 1)} fill="none" stroke="#ef4444" strokeWidth="10" strokeLinecap="butt" />
            {/* Tick marks */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const a = (180 - t * 180) * (Math.PI / 180);
              const x1 = cx + Math.cos(a) * (radius + 4);
              const y1 = cy - Math.sin(a) * (radius + 4);
              const x2 = cx + Math.cos(a) * (radius + 9);
              const y2 = cy - Math.sin(a) * (radius + 9);
              return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0D1117" strokeWidth="1.5" />;
            })}
            {/* Needle */}
            <motion.line
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke="#0D1117"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ x2: nx, y2: ny }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            />
            <circle cx={cx} cy={cy} r="7" fill="#0D1117" stroke="#FFFFFF" strokeWidth="2" />
          </svg>

          <div className="-mt-2 flex flex-col items-center">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
              Liquidity Risk Score
            </span>
            <motion.span
              key={riskScore}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-2xl font-bold text-ink tnum"
            >
              {riskScore.toFixed(1)} <span className="text-[12px] font-mono text-ink/40">/ 10</span>
            </motion.span>
          </div>
        </div>

        {/* Split breakdown */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="border-2 border-ink/30 bg-ink/5 p-2.5">
            <p className="font-heading text-[9px] font-bold uppercase tracking-widest text-ink/50">
              Winter Baseline Utility
            </p>
            <p className="mt-1 font-mono text-[14px] font-bold text-ink tnum">
              {formatAed(baselineWinter)}
            </p>
          </div>
          <div className="border-2 border-sunset bg-sunset/10 p-2.5">
            <p className="font-heading text-[9px] font-bold uppercase tracking-widest text-sunset-600">
              Summer Peak Utility
            </p>
            <p className="mt-1 font-mono text-[14px] font-bold text-sunset-600 tnum">
              {formatAed(peakSummer)}
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-2 border-ink/20 bg-parchment-100 px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 font-body text-[11px] text-ink/60">
            <GaugeIcon className="h-3 w-3" />
            Seasonal Spread
          </span>
          <span className="font-mono text-[12px] font-bold text-ink tnum">
            +{Math.round(peakSummer > 0 && baselineWinter > 0 ? (peakSummer / baselineWinter - 1) * 100 : 0)}%
          </span>
        </div>
      </div>

      {/* Overhead badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center justify-center gap-2 border-2 ${tone.border} ${tone.bg}/10 px-3 py-2`}
      >
        <span className={`h-2 w-2 ${tone.bg} animate-glow`} />
        <span className={`font-heading text-[12px] font-bold uppercase tracking-[0.18em] ${tone.text}`}>
          {badge.label}
        </span>
      </motion.div>
    </section>
  );
}
