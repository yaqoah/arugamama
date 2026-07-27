import {
  MONTHS,
  type ChequeFreq,
  type CoolingType,
  type EmirateId,
  type FurnishingStatus,
  type LayoutId,
  type MonthId,
  type PropertyType,
  type ScenarioInput,
} from '@/lib/constants';

/**
 * arugamama — Tariff & Upfront Calculation Engine.
 *
 * Emirate-precise Day-1 cash wall + monthly utility slabs with seasonal
 * consumption multipliers. All figures are planning estimates, not quotes.
 */

export type UpfrontLine = {
  label: string;
  detail: string;
  amount: number;
  risk: 0 | 1 | 2;
};

export type MonthlyLine = {
  label: string;
  amount: number;
  detail?: string;
};

export type Season = 'summer' | 'winter' | 'shoulder';

export type CalculatorResult = {
  // Day-1 cash wall
  firstInstallment: number;
  agencyFeeGross: number;
  agencyFeeVat: number;
  agencyFeeTotal: number;
  securityDeposit: number;
  utilityDeposit: number;
  utilityConnection: number;
  leaseRegistration: number;
  day1Total: number;
  cashSurgePct: number;
  upfrontLines: UpfrontLine[];
  // Monthly
  baseRentMonthly: number;
  housingFeeMonthly: number;
  coolingMonthly: number;
  coolingCapacityMonthly: number;
  electricityMonthly: number;
  monthlyRecurring: number;
  monthlyLines: MonthlyLine[];
  // Seasonal
  season: Season;
  consumptionMultiplier: number;
  // 12-month projection
  projection: MonthProjection[];
  // Cheque schedule
  chequeDates: ChequeSchedule[];
};

export type MonthProjection = {
  index: number;
  monthId: MonthId;
  monthLabel: string;
  outflow: number;
  rentCheque: number;
  overhead: number;
  hasCheque: boolean;
  isSummer: boolean;
  isWinter: boolean;
};

export type ChequeSchedule = {
  number: number;
  date: string;
  label: string;
  amount: number;
};

// --- Constants ---------------------------------------------------------------

const VAT_PCT = 0.05;
const AGENCY_PCT = 0.05;
const SECURITY_FURNISHED = 0.1;
const SECURITY_UNFURNISHED = 0.05;

// Dubai — DEWA
const DEWA_CONNECTION = 130;
const DEWA_DEPOSIT_APT = 2000;
const DEWA_DEPOSIT_VILLA = 4000;
const EJARI_FEE = 220;
const DUBAI_HOUSING_FEE_PCT = 0.05; // of annual rent / year, billed monthly

// Abu Dhabi — ADDC
const ADDC_CONNECTION_DEPOSIT = 1000;
const TAWTHEEQ_FEE = 100;

// Sharjah — SEWA
const SEWA_DEPOSIT_MIN = 1000;
const SEWA_DEPOSIT_MAX = 1500;
const SHARJAH_ATTESTATION_PCT = 0.04; // of annual rent

// Northern emirates fallback
const NORTHERN_UTILITY_DEPOSIT = 1000;

// Cooling slabs
const CHILLER_FREE_BASE = 200; // AED/month midpoint of 150–250
const EMPOWER_CAPACITY_BY_LAYOUT: Record<LayoutId, number> = {
  studio: 450,
  '1br': 550,
  '2br': 650,
  '3br': 720,
  '4br': 750,
};
const EMPOWER_RATE_PER_RT_HR = 0.568; // AED per RT-hr
const BASE_RT_HOURS_BY_LAYOUT: Record<LayoutId, number> = {
  studio: 300,
  '1br': 420,
  '2br': 560,
  '3br': 700,
  '4br': 820,
};

// Electricity slabs (fils/kWh → AED = fils/100)
const ELECTRICITY_GREEN_FILS = 23; // up to 2000 kWh
const ELECTRICITY_HIGH_FILS = 38; // above 2000 kWh
const ELECTRICITY_GREEN_THRESHOLD = 2000;
const BASE_KWH_BY_LAYOUT: Record<LayoutId, number> = {
  studio: 600,
  '1br': 1000,
  '2br': 1500,
  '3br': 2000,
  '4br': 2500,
};

const LAYOUT_COOLING_SCALE: Record<LayoutId, number> = {
  studio: 0.7,
  '1br': 1,
  '2br': 1.3,
  '3br': 1.6,
  '4br': 1.9,
};

const PROPERTY_IS_VILLA = (pt: PropertyType) => pt === 'villa' || pt === 'townhouse';

export const SUMMER_MONTHS: MonthId[] = ['jun', 'jul', 'aug', 'sep'];
export const WINTER_MONTHS: MonthId[] = ['dec', 'jan', 'feb'];
const SUMMER_MULTIPLIER = 2.1;
const WINTER_MULTIPLIER = 0.5;
const SHOULDER_MULTIPLIER = 1.0;

// Internet + service baseline
const INTERNET_MONTHLY = 360;
const SERVICE_BY_PROPERTY: Record<PropertyType, number> = {
  apartment: 4200,
  townhouse: 6000,
  villa: 8500,
};

// --- Helpers ----------------------------------------------------------------

function seasonFor(monthId: MonthId): Season {
  if (SUMMER_MONTHS.includes(monthId)) return 'summer';
  if (WINTER_MONTHS.includes(monthId)) return 'winter';
  return 'shoulder';
}

function multiplierFor(season: Season): number {
  return season === 'summer' ? SUMMER_MULTIPLIER : season === 'winter' ? WINTER_MULTIPLIER : SHOULDER_MULTIPLIER;
}

function depositPct(furnishing: FurnishingStatus): number {
  return furnishing === 'furnished' ? SECURITY_FURNISHED : SECURITY_UNFURNISHED;
}

/** Progressive electricity bill via slab tariffs. */
function electricityBill(layout: LayoutId, season: Season): number {
  const baseKwh = BASE_KWH_BY_LAYOUT[layout] ?? 1000;
  const kwh = Math.round(baseKwh * multiplierFor(season));
  let cost = 0;
  if (kwh <= ELECTRICITY_GREEN_THRESHOLD) {
    cost = (kwh * ELECTRICITY_GREEN_FILS) / 100;
  } else {
    cost = (ELECTRICITY_GREEN_THRESHOLD * ELECTRICITY_GREEN_FILS) / 100;
    cost += ((kwh - ELECTRICITY_GREEN_THRESHOLD) * ELECTRICITY_HIGH_FILS) / 100;
  }
  return Math.round(cost);
}

/** District cooling: fixed capacity charge + consumption (RT-hr × rate). */
function districtCooling(layout: LayoutId, season: Season): { capacity: number; consumption: number } {
  const capacity = EMPOWER_CAPACITY_BY_LAYOUT[layout] ?? 550;
  const rtHours = Math.round((BASE_RT_HOURS_BY_LAYOUT[layout] ?? 420) * multiplierFor(season));
  const consumption = Math.round(rtHours * EMPOWER_RATE_PER_RT_HR);
  return { capacity, consumption };
}

function chillerFreeBill(season: Season): number {
  // 150–250 baseline, scaled by season
  const base = CHILLER_FREE_BASE;
  return Math.round(base * (multiplierFor(season) * 0.6 + 0.4));
}

function leaseRegistration(emirate: EmirateId, annualRent: number): { fee: number; label: string } {
  switch (emirate) {
    case 'dubai':
      return { fee: EJARI_FEE, label: 'Ejari Registration' };
    case 'abu_dhabi':
      return { fee: TAWTHEEQ_FEE, label: 'Tawtheeq Registration' };
    case 'sharjah':
      return { fee: Math.round((annualRent * SHARJAH_ATTESTATION_PCT) / 12), label: 'Sharjah Attestation (4%/12)' };
    default:
      return { fee: EJARI_FEE, label: 'Tenancy Registration' };
  }
}

function utilityDepositAndConnection(
  emirate: EmirateId,
  propertyType: PropertyType
): { deposit: number; connection: number; label: string } {
  switch (emirate) {
    case 'dubai':
      return {
        deposit: PROPERTY_IS_VILLA(propertyType) ? DEWA_DEPOSIT_VILLA : DEWA_DEPOSIT_APT,
        connection: DEWA_CONNECTION,
        label: 'DEWA',
      };
    case 'abu_dhabi':
      return { deposit: ADDC_CONNECTION_DEPOSIT, connection: 0, label: 'ADDC' };
    case 'sharjah':
      return { deposit: SEWA_DEPOSIT_MAX, connection: 0, label: 'SEWA' };
    default:
      return { deposit: NORTHERN_UTILITY_DEPOSIT, connection: 0, label: 'Utility' };
  }
}

function housingFee(emirate: EmirateId, annualRent: number): number {
  if (emirate !== 'dubai') return 0;
  return Math.round((annualRent * DUBAI_HOUSING_FEE_PCT) / 12);
}

// --- Main computation --------------------------------------------------------

export function calculateCashflow(input: ScenarioInput): CalculatorResult {
  const season = seasonFor(input.moveInMonth);
  const mult = multiplierFor(season);

  // 1. First rent installment
  const firstInstallment = Math.round(input.annualRent / input.chequeFreq);

  // 2. Agency fee + VAT
  const agencyFeeGross = Math.round(input.annualRent * AGENCY_PCT);
  const agencyFeeVat = Math.round(agencyFeeGross * VAT_PCT);
  const agencyFeeTotal = agencyFeeGross + agencyFeeVat;

  // 3. Security deposit
  const securityDeposit = Math.round(input.annualRent * depositPct(input.furnishing));

  // 4. Utility deposit + connection
  const util = utilityDepositAndConnection(input.emirate, input.propertyType);

  // 5. Lease registration
  const reg = leaseRegistration(input.emirate, input.annualRent);

  // Day-1 total
  const day1Total =
    firstInstallment + agencyFeeTotal + securityDeposit + util.deposit + util.connection + reg.fee;
  const cashSurgePct =
    firstInstallment > 0 ? ((day1Total - firstInstallment) / firstInstallment) * 100 : 0;

  const upfrontLines: UpfrontLine[] = [
    {
      label: '1st Rent Installment',
      detail: `Annual ÷ ${input.chequeFreq} cheques`,
      amount: firstInstallment,
      risk: input.chequeFreq <= 1 ? 2 : input.chequeFreq <= 2 ? 1 : 0,
    },
    {
      label: 'Agency Commission + VAT',
      detail: `5% + 5% VAT = AED ${agencyFeeGross.toLocaleString()} + AED ${agencyFeeVat.toLocaleString()}`,
      amount: agencyFeeTotal,
      risk: 1,
    },
    {
      label: 'Security Deposit',
      detail: `${(depositPct(input.furnishing) * 100).toFixed(0)}% of annual rent · refundable`,
      amount: securityDeposit,
      risk: 0,
    },
    {
      label: `${util.label} Deposit & Connection`,
      detail: `Refundable deposit + activation`,
      amount: util.deposit + util.connection,
      risk: 0,
    },
    {
      label: reg.label,
      detail: 'Mandatory tenancy registration',
      amount: reg.fee,
      risk: 0,
    },
  ];

  // --- Monthly ---
  const baseRentMonthly = Math.round(input.annualRent / 12);
  const housingFeeMonthly = housingFee(input.emirate, input.annualRent);
  const electricityMonthly = electricityBill(input.layout, season);
  const { capacity: coolingCapacityMonthly, consumption: coolingConsumption } = districtCooling(
    input.layout,
    season
  );

  let coolingMonthly = 0;
  let coolingLabel = '';
  if (input.cooling === 'chiller_free') {
    coolingMonthly = chillerFreeBill(season);
    coolingLabel = 'Chiller Free (baseline)';
  } else if (input.cooling === 'dewa_ac') {
    coolingMonthly = Math.round(electricityMonthly * 0.45);
    coolingLabel = 'AC via utility slabs';
  } else {
    coolingMonthly = coolingCapacityMonthly + coolingConsumption;
    coolingLabel = 'District cooling (capacity + consumption)';
  }

  const serviceMonthly = Math.round(SERVICE_BY_PROPERTY[input.propertyType] / 12);

  const monthlyLines: MonthlyLine[] = [
    { label: 'Base Rent Portion', amount: baseRentMonthly, detail: 'Annual ÷ 12' },
    { label: 'Housing Fee (Municipality)', amount: housingFeeMonthly, detail: input.emirate === 'dubai' ? '5% / 12 via DEWA' : 'N/A' },
    { label: coolingLabel, amount: coolingMonthly, detail: `${season} ×${mult}` },
    { label: 'Electricity (slab tariff)', amount: electricityMonthly, detail: `${input.cooling === 'dewa_ac' ? 'incl. AC' : 'appliances'}` },
    { label: 'Internet (Du / Etisalat)', amount: INTERNET_MONTHLY },
    { label: 'Service / Community Charge', amount: serviceMonthly },
  ];

  const monthlyRecurring = monthlyLines.reduce((s, m) => s + m.amount, 0);

  // --- Projection (12 months) ---
  const projection = buildProjection(input, monthlyRecurring);

  // --- Cheque schedule ---
  const chequeDates = buildChequeDates(input, firstInstallment);

  return {
    firstInstallment,
    agencyFeeGross,
    agencyFeeVat,
    agencyFeeTotal,
    securityDeposit,
    utilityDeposit: util.deposit,
    utilityConnection: util.connection,
    leaseRegistration: reg.fee,
    day1Total,
    cashSurgePct,
    upfrontLines,
    baseRentMonthly,
    housingFeeMonthly,
    coolingMonthly,
    coolingCapacityMonthly,
    electricityMonthly,
    monthlyRecurring,
    monthlyLines,
    season,
    consumptionMultiplier: mult,
    projection,
    chequeDates,
  };
}

function buildProjection(input: ScenarioInput, baseOverhead: number): MonthProjection[] {
  const startIndex = MONTHS.findIndex((m) => m.id === input.moveInMonth);
  const interval = 12 / input.chequeFreq;
  const chequeAmount = Math.round(input.annualRent / input.chequeFreq);

  const points: MonthProjection[] = [];
  for (let i = 0; i < 12; i++) {
    const monthIdx = (startIndex + i) % 12;
    const m = MONTHS[monthIdx];
    const season = seasonFor(m.id);
    const isSummer = season === 'summer';
    const isWinter = season === 'winter';
    // Overhead scales with seasonal multiplier for cooling portion
    const seasonScale = isSummer ? 1.4 : isWinter ? 0.8 : 1.0;
    const overhead = Math.round(baseOverhead * seasonScale);
    const hasCheque = i % interval === 0;
    const rentCheque = hasCheque ? chequeAmount : 0;
    points.push({
      index: i + 1,
      monthId: m.id,
      monthLabel: m.label.slice(0, 3),
      outflow: rentCheque + overhead,
      rentCheque,
      overhead,
      hasCheque,
      isSummer,
      isWinter,
    });
  }
  return points;
}

function buildChequeDates(input: ScenarioInput, chequeAmount: number): ChequeSchedule[] {
  const startIndex = MONTHS.findIndex((m) => m.id === input.moveInMonth);
  const year = new Date().getFullYear();
  const interval = 12 / input.chequeFreq;
  const dates: ChequeSchedule[] = [];
  for (let i = 0; i < input.chequeFreq; i++) {
    const offset = startIndex + i * interval;
    const monthIdx = offset % 12;
    const targetYear = year + Math.floor(offset / 12);
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

// Utility exports for UI labels
export function seasonLabel(s: Season): string {
  return s === 'summer' ? 'Summer (2.1×)' : s === 'winter' ? 'Winter (0.5×)' : 'Shoulder (1.0×)';
}

export type { ChequeFreq, CoolingType };
