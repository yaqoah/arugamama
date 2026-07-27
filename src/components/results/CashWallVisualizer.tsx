import { motion } from 'framer-motion';
import { AlertTriangle, Wallet } from 'lucide-react';
import { formatAed, type ScenarioInput } from '@/lib/constants';
import type { CalculatorResult } from '@/utils/calculatorEngine';

import { type CashflowApiResponse } from '@/lib/api';

const RING_COLORS = [
  '#6D2A8D',
  '#8A38B3',
  '#A853D4',
  '#18181B',
  '#52525B',
  '#71717A',
] as const;

type CashWallVisualizerProps = {
  calc: CalculatorResult;
  chequeFreq: ScenarioInput['chequeFreq'];
  apiData: CashflowApiResponse | null;
};

export function CashWallVisualizer({ calc, chequeFreq, apiData }: CashWallVisualizerProps) {
  const radius = 72;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  // Use dynamic backend values if available, fallback to mock calc
  const upfrontLines = apiData ? [
    { label: 'First Cheque', amount: apiData.upfront_breakdown.first_cheque },
    { label: 'Security Deposit', amount: apiData.upfront_breakdown.security_deposit },
    { label: 'Agency Commission', amount: apiData.upfront_breakdown.agency_commission },
    { label: 'Attestation Fee', amount: apiData.upfront_breakdown.attestation_fee },
    { label: 'Utility Deposits', amount: apiData.upfront_breakdown.utility_deposits },
    { label: 'Chiller Deposit', amount: apiData.upfront_breakdown.chiller_deposit }
  ].filter(l => l.amount > 0) : calc.upfrontLines;

  const total = apiData ? apiData.day1_cash_wall : calc.day1Total;
  const surge = chequeFreq <= 1;

  return (
    <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#0D1117"
            strokeOpacity={0.08}
            strokeWidth={stroke}
          />
          {upfrontLines.map((seg, i) => {
            const fraction = total > 0 ? seg.amount / total : 0;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const color = RING_COLORS[i % RING_COLORS.length];
            const el = (
              <motion.circle
                key={seg.label}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                initial={{ strokeDashoffset: -offset }}
                animate={{ strokeDashoffset: -offset }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute flex items-center justify-center">
          <Wallet className="h-7 w-7 text-sunset" strokeWidth={2.5} />
        </div>
      </div>

      <div className="flex-1 space-y-1.5">
        {upfrontLines.map((seg, i) => {
          const pct = total > 0 ? Math.round((seg.amount / total) * 100) : 0;
          const color = RING_COLORS[i % RING_COLORS.length];
          return (
            <div key={seg.label} className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink"
                style={{ backgroundColor: color }}
              >
                <span className="font-mono text-[9px] font-bold text-white">{pct}%</span>
              </span>
              <span className="font-body text-[12px] font-medium text-ink/70 truncate">{seg.label}</span>
              <span className="ml-auto font-mono text-[12px] font-bold text-ink tnum">
                {formatAed(seg.amount, { compact: seg.amount >= 100000 })}
              </span>
            </div>
          );
        })}
      </div>

      {surge && (
        <div className="absolute -right-2 -top-2 flex items-center gap-1.5 border-2 border-ink bg-sunset-200 px-2 py-1 shadow-mangaSm">
          <AlertTriangle className="h-3.5 w-3.5 text-sunset-600" />
          <span className="font-heading text-[9px] font-bold uppercase tracking-widest text-sunset-600">
            Surge
          </span>
        </div>
      )}
    </div>
  );
}
