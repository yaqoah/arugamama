import {
  COOLING_TYPES,
  EMIRATES,
  MONTHS,
  type CoolingType,
  type EmirateId,
  type MonthId,
  type ScenarioInput,
} from './constants';

/**
 * UAE renter move-in cost engine.
 *
 * Computes the "Day-1 Liquid Cash Wall" — the total cash a tenant must
 * liquidate on or before move-in day — plus recurring monthly overhead.
 * Figures are illustrative planning estimates, not quotations.
 */

export type LineItem = {
  label: string;
  detail: string;
  amount: number;
  /** one-time (move-in) vs recurring (monthly) */
  kind: 'one-time' | 'recurring';
  /** risk posture: 0 neutral, 1 caution, 2 stress */
  risk: 0 | 1 | 2;
};

export type RingSlice = {
  label: string;
  amount: number;
  pct: number;
  color: string;
};

export type GaugeData = {
  baseRentPortion: number;
  hiddenOverhead: number;
  trueMonthly: number;
  overheadPct: number;
  badge: { label: string; tone: 'safe' | 'caution' | 'stress' };
};

export type MonthPoint = {
  index: number;
  monthLabel: string;
  outflow: number;
  rentCheque: number;
  overhead: number;
  hasCheque: boolean;
  isSummer: boolean;
};

export type ChequeDate = {
  number: number;
  date: string;
  label: string;
  amount: number;
};

export type CashflowResult = {
  day1Total: number;
  monthlyRecurring: number;
  firstCheque: number;
  advertisedCheque: number;
  cashSurgePct: number;
  brokerageVat: number;
  items: LineItem[];
  monthlyBreakdown: { label: string; amount: number; kind: LineItem['kind'] }[];
  ringSlices: RingSlice[];
  gauge: GaugeData;
  projection: MonthPoint[];
  chequeDates: ChequeDate[];
  riskScore: number;
  warnings: string[];
};

const DEWA_CONNECTION_FEE = 130; // AED one-time (approx)
const DEWA_DEPOSIT_APARTMENT = 2020;
const DEWA_DEPOSIT_VILLA = 4040;

const EMPOWER_CONNECTION_FEE = 525;
const EMPOWER_CAPACITY_PER_MONTH_PEAK = 420; // peak summer capacity charge
const EMPOWER_CAPACITY_PER_MONTH_OFF = 210;
const EMPOWER_USAGE_ESTIMATE_PEAK = 650;
const EMPOWER_USAGE_ESTIMATE_OFF = 320;

const CHILLER_FREE_MONTHLY = 0;

const BROKERAGE_PCT = 0.05; // 5% of annual rent (typical)
const VAT_PCT = 0.05; // UAE VAT on agency commission
const EJARI_REGISTRATION = 220; // AED one-time
const MOVE_IN_PERMIT = 250; // community/service-charge estimate
const DUBAI_MUNI_HOUSING_FEE_PCT = 0.05; // 5% of annual rent, billed monthly via DEWA
const SUMMER_MONTHS: MonthId[] = ['jun', 'jul', 'aug', 'sep'];

const RING_COLORS = {
  rent: '#6D2A8D',
  brokerage: '#8A38B3',
  deposit: '#A853D4',
  utility: '#18181B',
  ejari: '#52525B',
} as const;

const LAYOUT_DEWA_MULTIPLIER: Record<string, number> = {
  studio: 0.7,
  '1br': 1,
  '2br': 1.35,
  '3br': 1.7,
  '4br': 2.1,
};

const PROPERTY_TYPE_DEWA_DEPOSIT: Record<string, number> = {
  apartment: DEWA_DEPOSIT_APARTMENT,
  villa: DEWA_DEPOSIT_VILLA,
  townhouse: DEWA_DEPOSIT_VILLA,
};

function dewaMonthlyUsage(layout: string, peak: boolean): number {
  const base = 350 * (LAYOUT_DEWA_MULTIPLIER[layout] ?? 1);
  return peak ? base * 1.45 : base * 0.9;
}

function empowerMonthly(layout: string, peak: boolean): { capacity: number; usage: number } {
  const m = LAYOUT_DEWA_MULTIPLIER[layout] ?? 1;
  const capacity = (peak ? EMPOWER_CAPACITY_PER_MONTH_PEAK : EMPOWER_CAPACITY_PER_MONTH_OFF) * m;
  const usage = (peak ? EMPOWER_USAGE_ESTIMATE_PEAK : EMPOWER_USAGE_ESTIMATE_OFF) * m;
  return { capacity, usage };
}

function depositPct(furnishing: 'unfurnished' | 'furnished'): number {
  return furnishing === 'furnished' ? 0.1 : 0.05;
}

export function computeCashflow(input: ScenarioInput): CashflowResult {
  const items: LineItem[] = [];
  const warnings: string[] = [];
  let riskScore = 0;

  const emirateName = EMIRATES.find((e) => e.id === input.emirate)?.name ?? 'Dubai';
  const month = MONTHS.find((m) => m.id === input.moveInMonth);
  const peak = month?.peak ?? false;
  const dewaDeposit = PROPERTY_TYPE_DEWA_DEPOSIT[input.propertyType] ?? DEWA_DEPOSIT_APARTMENT;

  // --- One-time move-in costs ---

  // Security deposit
  const deposit = Math.round(input.annualRent * depositPct(input.furnishing));
  items.push({
    label: 'Security Deposit',
    detail: `${(depositPct(input.furnishing) * 100).toFixed(0)}% of annual rent · refundable`,
    amount: deposit,
    kind: 'one-time',
    risk: 0,
  });

  // First cheque
  const firstCheque = Math.round(input.annualRent / input.chequeFreq);
  items.push({
    label: 'First Cheque',
    detail: `${input.chequeFreq} cheques / year · 1st instalment`,
    amount: firstCheque,
    kind: 'one-time',
    risk: input.chequeFreq <= 1 ? 2 : input.chequeFreq <= 2 ? 1 : 0,
  });
  if (input.chequeFreq <= 1) {
    warnings.push('Single-cheque structure concentrates the entire annual rent into one payment.');
    riskScore += 18;
  } else if (input.chequeFreq <= 2) {
    riskScore += 8;
  }

  // Brokerage + VAT
  const brokerageNet = Math.round(input.annualRent * BROKERAGE_PCT);
  const brokerageVat = Math.round(brokerageNet * VAT_PCT);
  const brokerage = brokerageNet + brokerageVat;
  items.push({
    label: 'Agency Commission + VAT',
    detail: `5% + 5% VAT · AED ${brokerageNet.toLocaleString()} + AED ${brokerageVat.toLocaleString()}`,
    amount: brokerage,
    kind: 'one-time',
    risk: 1,
  });

  // Ejari + move-in permit
  items.push({
    label: 'Ejari Registration',
    detail: 'Mandatory tenancy registration',
    amount: EJARI_REGISTRATION,
    kind: 'one-time',
    risk: 0,
  });
  items.push({
    label: 'Move-In / Service Permit',
    detail: 'Community access + moving permit',
    amount: MOVE_IN_PERMIT,
    kind: 'one-time',
    risk: 0,
  });

  // DEWA connection + deposit
  items.push({
    label: 'DEWA Connection',
    detail: 'Utility activation fee',
    amount: DEWA_CONNECTION_FEE,
    kind: 'one-time',
    risk: 0,
  });
  items.push({
    label: 'DEWA Security Deposit',
    detail: `Refundable · ${input.propertyType} tariff`,
    amount: dewaDeposit,
    kind: 'one-time',
    risk: 0,
  });

  // Empower connection (if district cooling)
  if (input.cooling === 'district_cooling') {
    items.push({
      label: 'Empower Connection',
      detail: 'District cooling activation',
      amount: EMPOWER_CONNECTION_FEE,
      kind: 'one-time',
      risk: 1,
    });
    warnings.push('District cooling (Empower) adds capacity + usage charges on top of DEWA.');
    riskScore += 10;
  }

  // --- Recurring monthly overhead ---

  const monthlyBreakdown: CashflowResult['monthlyBreakdown'] = [];

  const dewaUsage = Math.round(dewaMonthlyUsage(input.layout, peak));
  monthlyBreakdown.push({
    label: 'DEWA (Water + Electricity)',
    amount: dewaUsage,
    kind: 'recurring',
  });

  if (input.cooling === 'district_cooling') {
    const { capacity, usage } = empowerMonthly(input.layout, peak);
    monthlyBreakdown.push({
      label: 'Empower Capacity Charge',
      amount: Math.round(capacity),
      kind: 'recurring',
    });
    monthlyBreakdown.push({
      label: 'Empower Consumption',
      amount: Math.round(usage),
      kind: 'recurring',
    });
    if (peak) {
      warnings.push(`${month?.label} is a peak-cooling month — Empower capacity charges surge.`);
      riskScore += 12;
    }
  } else if (input.cooling === 'chiller_free') {
    monthlyBreakdown.push({
      label: 'Cooling (Chiller Free)',
      amount: CHILLER_FREE_MONTHLY,
      kind: 'recurring',
    });
  } else {
    monthlyBreakdown.push({
      label: 'AC (DEWA-billed)',
      amount: Math.round(dewaUsage * 0.35),
      kind: 'recurring',
    });
  }

  // Dubai Municipality 5% Housing Fee (billed monthly via DEWA) — Dubai only
  const housingFeeMonthly =
    input.emirate === 'dubai'
      ? Math.round((input.annualRent * DUBAI_MUNI_HOUSING_FEE_PCT) / 12)
      : 0;
  if (housingFeeMonthly > 0) {
    monthlyBreakdown.push({
      label: 'Dubai Municipality Housing Fee',
      amount: housingFeeMonthly,
      kind: 'recurring',
    });
  }

  // Internet
  monthlyBreakdown.push({
    label: 'Internet (Du / Etisalat)',
    amount: 360,
    kind: 'recurring',
  });

  // Service / community charge estimate
  const serviceCharge = Math.round(
    input.propertyType === 'villa' ? 8500 : input.propertyType === 'townhouse' ? 6000 : 4200
  );
  monthlyBreakdown.push({
    label: 'Service / Community Charge',
    amount: Math.round(serviceCharge / 12),
    kind: 'recurring',
  });

  const monthlyRecurring = monthlyBreakdown.reduce((s, m) => s + m.amount, 0);

  // Rent-to-cashwall stress
  const day1Total = items.filter((i) => i.kind === 'one-time').reduce((s, i) => s + i.amount, 0);
  const ratio = input.annualRent > 0 ? day1Total / input.annualRent : 0;
  if (ratio > 0.5) {
    warnings.push(`Day-1 cash wall is ${(ratio * 100).toFixed(0)}% of annual rent — liquidity stress.`);
    riskScore += 15;
  } else if (ratio > 0.35) {
    riskScore += 6;
  }

  if (peak) riskScore += 6;
  riskScore = Math.min(100, riskScore);

  // --- Ring chart slices (Day-1 composition) ---
  const utilityDeposit = DEWA_CONNECTION_FEE + dewaDeposit + (input.cooling === 'district_cooling' ? EMPOWER_CONNECTION_FEE : 0);
  const ringSlices: RingSlice[] = [
    { label: '1st Rent Cheque', amount: firstCheque, pct: 0, color: RING_COLORS.rent },
    { label: 'Agency Commission + VAT', amount: brokerage, pct: 0, color: RING_COLORS.brokerage },
    { label: 'Refundable Security Deposit', amount: deposit, pct: 0, color: RING_COLORS.deposit },
    { label: 'DEWA / Utility Deposit & Connection', amount: utilityDeposit, pct: 0, color: RING_COLORS.utility },
    { label: 'Ejari & Registration Fees', amount: EJARI_REGISTRATION + MOVE_IN_PERMIT, pct: 0, color: RING_COLORS.ejari },
  ];
  const ringTotal = ringSlices.reduce((s, r) => s + r.amount, 0) || 1;
  ringSlices.forEach((r) => { r.pct = (r.amount / ringTotal) * 100; });

  // --- Cash surge ---
  const advertisedCheque = firstCheque;
  const cashSurgePct = advertisedCheque > 0 ? ((day1Total - advertisedCheque) / advertisedCheque) * 100 : 0;

  // --- True Monthly Overhead gauge ---
  const baseRentPortion = Math.round(input.annualRent / 12);
  const hiddenOverhead = monthlyRecurring - baseRentPortion > 0
    ? monthlyRecurring - baseRentPortion
    : Math.max(0, monthlyRecurring - dewaUsage); // overhead excluding pure utilities
  // Fixed hidden overhead = housing fee + empower capacity + service + internet
  const fixedOverhead =
    housingFeeMonthly +
    (input.cooling === 'district_cooling'
      ? Math.round(empowerMonthly(input.layout, peak).capacity)
      : 0) +
    Math.round(serviceCharge / 12) +
    360;
  const trueMonthly = baseRentPortion + monthlyRecurring;
  const overheadPct = trueMonthly > 0 ? (fixedOverhead / trueMonthly) * 100 : 0;

  let gaugeBadge: GaugeData['badge'];
  if (input.cooling === 'district_cooling' && overheadPct > 22) {
    gaugeBadge = { label: 'HIGH DISTRICT COOLING TRAP', tone: 'stress' };
  } else if (overheadPct > 18) {
    gaugeBadge = { label: 'MODERATE OVERHEAD RISK', tone: 'caution' };
  } else {
    gaugeBadge = { label: 'LEAN OVERHEAD', tone: 'safe' };
  }
  const gauge: GaugeData = {
    baseRentPortion,
    hiddenOverhead: fixedOverhead,
    trueMonthly,
    overheadPct,
    badge: gaugeBadge,
  };

  // --- 12-month projection ---
  const projection = buildProjection(input, monthlyRecurring, peak);

  // --- Cheque dates ---
  const chequeDates = buildChequeDates(input, firstCheque);

  return {
    day1Total,
    monthlyRecurring,
    firstCheque,
    advertisedCheque,
    cashSurgePct,
    brokerageVat,
    items,
    monthlyBreakdown,
    ringSlices,
    gauge,
    projection,
    chequeDates,
    riskScore,
    warnings,
  };
}

/** Build a 12-month outflow projection starting from the move-in month. */
function buildProjection(input: ScenarioInput, baseOverhead: number, moveInPeak: boolean): MonthPoint[] {
  const startIndex = MONTHS.findIndex((m) => m.id === input.moveInMonth);
  const chequeIntervalMonths = 12 / input.chequeFreq;
  const chequeAmount = Math.round(input.annualRent / input.chequeFreq);
  const baseRentMonthly = Math.round(input.annualRent / 12);

  const points: MonthPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const monthIdx = (startIndex + i) % 12;
    const m = MONTHS[monthIdx];
    const isSummer = SUMMER_MONTHS.includes(m.id);
    // Summer bump: overhead scales up during summer
    const summerMultiplier = isSummer ? 1.35 : 1;
    // Cooling adjustment in summer
    const coolingExtra =
      isSummer && input.cooling === 'district_cooling'
        ? Math.round(empowerMonthly(input.layout, true).usage * 0.4)
        : isSummer && input.cooling === 'dewa_ac'
        ? Math.round(dewaMonthlyUsage(input.layout, true) * 0.25)
        : 0;
    const overhead = Math.round(baseOverhead * (summerMultiplier - 1) + coolingExtra + baseOverhead);
    // Cheque hits on months where (i % interval == 0)
    const hasCheque = i % chequeIntervalMonths === 0;
    const rentCheque = hasCheque ? chequeAmount : 0;
    const outflow = rentCheque + overhead;
    points.push({
      index: i + 1,
      monthLabel: m.label.slice(0, 3),
      outflow,
      rentCheque,
      overhead,
      hasCheque,
      isSummer,
    });
  }
  return points;
}

/** Build dated cheque reminders starting from the move-in month. */
function buildChequeDates(input: ScenarioInput, chequeAmount: number): ChequeDate[] {
  const startIndex = MONTHS.findIndex((m) => m.id === input.moveInMonth);
  const year = new Date().getFullYear();
  const interval = 12 / input.chequeFreq;
  const dates: ChequeDate[] = [];
  for (let i = 0; i < input.chequeFreq; i++) {
    const monthIdx = (startIndex + i * interval) % 12;
    const targetYear = year + Math.floor((startIndex + i * interval) / 12);
    const date = new Date(targetYear, monthIdx, 1);
    dates.push({
      number: i + 1,
      date: date.toISOString(),
      label: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount: chequeAmount,
    });
  }
  return dates;
}

export function riskLabel(score: number): { label: string; tone: 'safe' | 'caution' | 'stress' } {
  if (score >= 40) return { label: 'Stress', tone: 'stress' };
  if (score >= 20) return { label: 'Caution', tone: 'caution' };
  return { label: 'Manageable', tone: 'safe' };
}

export function coolingLabel(c: CoolingType): string {
  return COOLING_TYPES.find((x) => x.id === c)?.label ?? c;
}

export function emirateLabel(id: EmirateId): string {
  return EMIRATES.find((e) => e.id === id)?.name ?? id;
}

export function monthLabel(id: MonthId): string {
  return MONTHS.find((m) => m.id === id)?.label ?? id;
}
