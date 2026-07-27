import type { ScenarioInput } from '@/lib/constants';
import { SUMMER_MONTHS, WINTER_MONTHS } from './calculatorEngine';
import type { MonthId } from '@/lib/constants';

/**
 * Client-side PyTorch inference simulation.
 *
 * Emulates a trained regression head that predicts peak-summer utility
 * confidence bounds, a Cooling Trap Score (1–10), and a Day-1 Liquidity
 * Pressure classification. Uses a hand-coded linear layer + sigmoid
 * activations over a 9-feature tensor so the behaviour is deterministic
 * and instant — no model download required.
 */

export type ConfidenceBounds = {
  predicted: number;
  lower90: number;
  upper90: number;
  spread: number;
};

export type LiquidityPressure = 'Low' | 'Moderate' | 'High';

export type MlPrediction = {
  /** Peak summer monthly utility prediction (AED) with 90% CI */
  peakSummerUtility: ConfidenceBounds;
  /** Day-1 cash wall prediction (AED) with 90% CI */
  day1CashWall: ConfidenceBounds;
  /** Cooling Trap Score 1–10 */
  coolingTrapScore: number;
  coolingTrapLabel: string;
  /** Day-1 Liquidity Pressure classification */
  liquidityPressure: LiquidityPressure;
  liquidityPressureScore: number; // 0–100
  /** Raw feature tensor (9 features, normalized 0–1) */
  featureTensor: number[];
  /** Model pseudo-metadata for UI display */
  modelInfo: { name: string; version: string; latencyMs: number };
};

// --- Feature encoding --------------------------------------------------------
// Encodes all 9 selector inputs into a normalized [0,1] feature vector.

const EMIRATE_INDEX: Record<string, number> = {
  dubai: 0,
  abu_dhabi: 0.55,
  sharjah: 0.7,
  ajman: 0.8,
  rak: 0.85,
  fujairah: 0.9,
  uaq: 0.95,
};

const LAYOUT_INDEX: Record<string, number> = {
  studio: 0.15,
  '1br': 0.35,
  '2br': 0.55,
  '3br': 0.78,
  '4br': 1.0,
};

const COOLING_INDEX: Record<string, number> = {
  chiller_free: 0.1,
  dewa_ac: 0.5,
  district_cooling: 1.0,
};

const PROPERTY_INDEX: Record<string, number> = {
  apartment: 0.3,
  townhouse: 0.65,
  villa: 1.0,
};

function monthHeat(month: MonthId): number {
  if (SUMMER_MONTHS.includes(month)) return 1.0;
  if (WINTER_MONTHS.includes(month)) return 0.15;
  return 0.5;
}

function encodeFeatures(input: ScenarioInput): number[] {
  return [
    EMIRATE_INDEX[input.emirate] ?? 0.5, // 0: emirate
    LAYOUT_INDEX[input.layout] ?? 0.35, // 1: layout
    PROPERTY_INDEX[input.propertyType] ?? 0.3, // 2: property type
    Math.min(input.annualRent / 1000000, 1), // 3: annual rent (normalized)
    (input.chequeFreq - 1) / 11, // 4: cheque freq (0=1 cheque → 1=12)
    input.furnishing === 'furnished' ? 1 : 0, // 5: furnishing
    COOLING_INDEX[input.cooling] ?? 0.5, // 6: cooling
    monthHeat(input.moveInMonth), // 7: move-in month heat
    LAYOUT_INDEX[input.layout] ?? 0.35, // 8: layout proxy for capacity
  ];
}

// --- Simulated linear weights (would be learned model params) ---------------
// Two heads: peak summer utility (AED) and day-1 cash wall (AED).

const UTILITY_WEIGHTS = [0.6, 0.85, 0.7, 0.9, 0.2, 0.1, 1.45, 1.2, 0.6];
const UTILITY_BIAS = 180;
const UTILITY_SCALE = 1400;

const CASHWALL_WEIGHTS = [0.3, 0.4, 0.5, 2.4, -0.6, 0.25, 0.15, 0.1, 0.2];
const CASHWALL_BIAS = 400;
const CASHWALL_SCALE = 90000;

function linearLayer(features: number[], weights: number[], bias: number, scale: number): number {
  const z = features.reduce((acc, f, i) => acc + f * weights[i], 0) + bias;
  return Math.max(0, z * scale);
}

/** σ(x) scaled to [min,max] for bounded scores. */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// --- Public API --------------------------------------------------------------

export function predictCashflowConfidence(input: ScenarioInput): MlPrediction {
  const t0 = performance.now();
  const featureTensor = encodeFeatures(input);

  // Head 1: peak summer utility
  const utilityRaw = linearLayer(featureTensor, UTILITY_WEIGHTS, UTILITY_BIAS, UTILITY_SCALE);
  const utilitySpread = Math.round(utilityRaw * 0.18); // ±18% → 90% CI
  const peakSummerUtility: ConfidenceBounds = {
    predicted: Math.round(utilityRaw),
    lower90: Math.round(utilityRaw - utilitySpread),
    upper90: Math.round(utilityRaw + utilitySpread),
    spread: utilitySpread,
  };

  // Head 2: day-1 cash wall
  const cashRaw = linearLayer(featureTensor, CASHWALL_WEIGHTS, CASHWALL_BIAS, CASHWALL_SCALE);
  const cashSpread = Math.round(cashRaw * 0.12);
  const day1CashWall: ConfidenceBounds = {
    predicted: Math.round(cashRaw),
    lower90: Math.round(cashRaw - cashSpread),
    upper90: Math.round(cashRaw + cashSpread),
    spread: cashSpread,
  };

  // Cooling Trap Score (1–10): combines cooling type, layout, summer heat
  const coolingTrapRaw =
    featureTensor[6] * 4.5 + featureTensor[1] * 2.5 + featureTensor[7] * 2.5 + featureTensor[8] * 1.5;
  const coolingTrapScore = Math.max(1, Math.min(10, Math.round(coolingTrapRaw)));

  // Day-1 Liquidity Pressure: cheque concentration + rent burden + cash wall
  const chequeConcentration = 1 - featureTensor[4]; // fewer cheques → higher pressure
  const rentBurden = featureTensor[3];
  const pressureRaw = chequeConcentration * 3.2 + rentBurden * 2.8 + (cashRaw / 200000) * 2.0;
  const liquidityPressureScore = Math.round(sigmoid(pressureRaw - 3.5) * 100);

  let liquidityPressure: LiquidityPressure;
  if (liquidityPressureScore >= 66) liquidityPressure = 'High';
  else if (liquidityPressureScore >= 33) liquidityPressure = 'Moderate';
  else liquidityPressure = 'Low';

  const t1 = performance.now();

  return {
    peakSummerUtility,
    day1CashWall,
    coolingTrapScore,
    coolingTrapLabel: coolingTrapLabel(coolingTrapScore),
    liquidityPressure,
    liquidityPressureScore,
    featureTensor,
    modelInfo: {
      name: 'arugamama-cashflow-pt-v2',
      version: '2.1.0',
      latencyMs: Math.round(t1 - t0),
    },
  };
}

function coolingTrapLabel(score: number): string {
  if (score >= 8) return 'SEVERE COOLING TRAP';
  if (score >= 6) return 'HIGH COOLING TRAP';
  if (score >= 4) return 'MODERATE COOLING RISK';
  if (score >= 2) return 'LOW COOLING RISK';
  return 'MINIMAL COOLING RISK';
}
