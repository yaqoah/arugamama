import { motion } from 'framer-motion';
import { Waves } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatAed, MONTHS, type ScenarioInput } from '@/lib/constants';
import type { CalculatorResult } from '@/utils/calculatorEngine';
import { SectionLabel } from '@/components/primitives';
import { type CashflowApiResponse } from '@/lib/api';

type LiquidityWaveProps = {
  calc: CalculatorResult;
  input: ScenarioInput;
  apiData: CashflowApiResponse | null;
};

/**
 * Component C — 12-Month Cashflow Liquidity Wave.
 * Area chart of monthly outflow starting from the move-in month.
 * Dynamically generated using ML peak_summer_utility and cheque frequencies.
 */
export function LiquidityWave({ calc, input, apiData }: LiquidityWaveProps) {
  
  const moveInIdx = MONTHS.findIndex((m) => m.id === input.moveInMonth);
  const chequeInterval = 12 / input.chequeFreq;
  const chequeAmount = input.annualRent / input.chequeFreq;
  
  // Use ML backend utility predictions or fallback to the calculator engine base
  const peakSummer = apiData?.predicted_overhead.peak_summer_utility ?? 0;
  const baselineWinter = apiData?.predicted_overhead.winter_baseline_utility ?? 0;
  
  // Non-seasonal monthly overhead (housing fee + internet + service charges etc)
  const nonSeasonalOverhead = calc.housingFeeMonthly + calc.coolingCapacityMonthly + Math.round(4200 / 12) + 360;

  // Generate dynamic 12-month array
  const data = Array.from({ length: 12 }).map((_, i) => {
    const globalMonthIdx = (moveInIdx + i) % 12;
    const mLabel = MONTHS[globalMonthIdx].label.substring(0, 3);
    
    // Summer months: June (5), July (6), August (7), September (8)
    const isSummer = globalMonthIdx >= 5 && globalMonthIdx <= 8;
    const hasCheque = i % chequeInterval === 0;

    let utilityCost = calc.monthlyRecurring - nonSeasonalOverhead; // Fallback
    if (apiData) {
      utilityCost = isSummer ? peakSummer : baselineWinter;
    }

    const overhead = utilityCost + nonSeasonalOverhead;
    const outflow = overhead + (hasCheque ? chequeAmount : 0);

    return {
      month: mLabel,
      outflow: Math.round(outflow),
      overhead: Math.round(overhead),
      rent: hasCheque ? chequeAmount : 0,
      hasCheque,
      isSummer
    };
  });

  const moveInLabel = MONTHS.find((m) => m.id === input.moveInMonth)?.label ?? '';
  const maxOutflow = Math.max(...data.map((d) => d.outflow)) || 1;

  return (
    <section className="space-y-4">
      <SectionLabel>C · 12-Month Liquidity Wave</SectionLabel>

      <div className="border-2 border-ink bg-parchment-50 p-3 shadow-mangaSm">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-heading text-[11px] font-bold uppercase tracking-wider text-ink">
            <Waves className="h-3.5 w-3.5 text-sunset" />
            Outflow from {moveInLabel}
          </span>
          <span className="font-mono text-[10px] font-bold text-ink/40">
            peak {formatAed(maxOutflow, { compact: true })}
          </span>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="outflowFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6D2A8D" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6D2A8D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="overheadFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D1117" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0D1117" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#0D1117" strokeOpacity={0.08} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#0D1117', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 600 }}
                tickLine={{ stroke: '#0D1117' }}
                axisLine={{ stroke: '#0D1117', strokeWidth: 1.5 }}
              />
              <YAxis
                tick={{ fill: '#0D1117', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={{ stroke: '#0D1117' }}
                tickFormatter={(v) => formatAed(Number(v), { compact: true }).replace('AED ', '')}
                width={56}
              />
              <Tooltip content={<WaveTooltip />} />
              {/* Summer band markers */}
              <ReferenceLine
                x="Jun"
                stroke="#6D2A8D"
                strokeOpacity={0.3}
                strokeDasharray="3 3"
                label={{ value: 'SUMMER', fill: '#6D2A8D', fontSize: 8, fontWeight: 700, position: 'top' }}
              />
              <ReferenceLine x="Sep" stroke="#6D2A8D" strokeOpacity={0.3} strokeDasharray="3 3" />
              {/* Overhead area (base) */}
              <Area
                type="monotone"
                dataKey="overhead"
                stroke="#0D1117"
                strokeWidth={1.5}
                fill="url(#overheadFill)"
                isAnimationActive
                animationDuration={600}
              />
              {/* Total outflow area (rent + overhead) */}
              <Area
                type="monotone"
                dataKey="outflow"
                stroke="#8A38B3"
                strokeWidth={2}
                fill="url(#outflowFill)"
                isAnimationActive
                animationDuration={700}
                dot={(props) => <ChequeDot {...props} />}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5 font-body text-[10px] text-ink/60">
            <span className="h-2 w-2 bg-sunset border border-ink" /> Total outflow
          </span>
          <span className="flex items-center gap-1.5 font-body text-[10px] text-ink/60">
            <span className="h-2 w-2 bg-ink/30 border border-ink/40" /> Recurring overhead
          </span>
          <span className="flex items-center gap-1.5 font-body text-[10px] text-ink/60">
            <span className="h-2 w-4 bg-sunset/30 border border-sunset" /> Summer bump
          </span>
        </div>
      </div>
    </section>
  );
}

function ChequeDot(props: any) {
  const { cx, cy, index, payload } = props;
  if (payload?.hasCheque) {
    return (
      <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: index * 0.04 }}>
        <rect
          x={cx - 4}
          y={cy - 4}
          width={8}
          height={8}
          transform={`rotate(45 ${cx} ${cy})`}
          fill="#0D1117"
          stroke="#FFFFFF"
          strokeWidth={1.5}
        />
      </motion.g>
    );
  }
  return <circle cx={cx} cy={cy} r={2} fill="#6D2A8D" stroke="#0D1117" strokeWidth={0.8} />;
}

function WaveTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="border-2 border-ink bg-parchment-100 px-2.5 py-2 shadow-mangaSm">
      <p className="font-heading text-[11px] font-bold uppercase tracking-wider text-ink">{label}</p>
      <p className="mt-1 font-mono text-[12px] font-bold text-sunset tnum">
        {formatAed(p.outflow)}
      </p>
      {p.hasCheque && (
        <p className="font-body text-[9px] font-bold uppercase tracking-wider text-ink/60">
          ◆ Rent cheque hit
        </p>
      )}
      {p.isSummer && (
        <p className="font-body text-[9px] font-bold uppercase tracking-wider text-sunset-600">
          Summer cooling bump
        </p>
      )}
    </div>
  );
}
