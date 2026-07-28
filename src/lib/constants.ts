export type EmirateId = 'dubai' | 'abu_dhabi' | 'sharjah' | 'ajman' | 'rak' | 'fujairah' | 'uaq';

export type PropertyType = 'apartment' | 'villa' | 'townhouse';

export type LayoutId = 'studio' | '1br' | '2br' | '3br' | '4br';

export type ChequeFreq = 1 | 2 | 4 | 6 | 12;

export type CoolingType = 'chiller_free' | 'dewa_ac' | 'district_cooling';

export type MonthId =
  | 'jan' | 'feb' | 'mar' | 'apr' | 'may' | 'jun'
  | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec';

export type FurnishingStatus = 'unfurnished' | 'furnished';

export type ScenarioInput = {
  emirate: EmirateId;
  location: string;
  layout: LayoutId;
  propertyType: PropertyType;
  annualRent: number;
  chequeFreq: ChequeFreq;
  furnishing: FurnishingStatus;
  cooling: CoolingType;
  moveInMonth: MonthId;
};

export const EMIRATES: { id: EmirateId; name: string; short: string }[] = [
  { id: 'dubai', name: 'Dubai', short: 'DXB' },
  { id: 'abu_dhabi', name: 'Abu Dhabi', short: 'AUH' },
  { id: 'sharjah', name: 'Sharjah', short: 'SHJ' },
  { id: 'ajman', name: 'Ajman', short: 'AJM' },
  { id: 'rak', name: 'Ras Al Khaimah', short: 'RAK' },
  { id: 'fujairah', name: 'Fujairah', short: 'FUJ' },
  { id: 'uaq', name: 'Umm Al Quwain', short: 'UAQ' },
];

export type LocationDef = {
  name: string;
  code: string;
  tag: string;
};

export const LOCATIONS: Record<EmirateId, LocationDef[]> = {
  dubai: [
    { name: 'Jumeirah Village Circle', code: 'JVC', tag: 'Mid-density' },
    { name: 'Business Bay', code: 'BBAY', tag: 'Commercial' },
    { name: 'Dubai Marina', code: 'MRNA', tag: 'Waterfront' },
    { name: 'Downtown Dubai', code: 'DWNT', tag: 'Premium core' },
    { name: 'Arjan', code: 'ARJN', tag: 'Emerging' },
    { name: 'Dubai Hills Estate', code: 'HILS', tag: 'Family' },
    { name: 'Jumeirah Lakes Towers', code: 'JLT', tag: 'Mixed-use' },
    { name: 'Palm Jumeirah', code: 'PALM', tag: 'Luxury' },
  ],
  abu_dhabi: [
    { name: 'Al Reem Island', code: 'REEM', tag: 'Waterfront' },
    { name: 'Yas Island', code: 'YAS', tag: 'Leisure' },
    { name: 'Saadiyat Island', code: 'SAAD', tag: 'Cultural' },
    { name: 'Khalifa City', code: 'KHAL', tag: 'Suburban' },
    { name: 'Al Maryah Island', code: 'MARY', tag: 'Business' },
  ],
  sharjah: [
    { name: 'Al Majaz', code: 'MJAZ', tag: 'Waterfront' },
    { name: 'Al Khan', code: 'KHAN', tag: 'Coastal' },
    { name: 'Muwaileh', code: 'MUWL', tag: 'Student hub' },
    { name: 'Al Nahda', code: 'NAHD', tag: 'Border gateway' },
  ],
  ajman: [
    { name: 'Al Corniche', code: 'CRNJ', tag: 'Coastal' },
    { name: 'Al Nuaimiya', code: 'NUAI', tag: 'Residential' },
    { name: 'Emirates City', code: 'EMCT', tag: 'Towers' },
  ],
  rak: [
    { name: 'Al Hamra Village', code: 'HMRV', tag: 'Resort' },
    { name: 'Mina Al Arab', code: 'MINA', tag: 'Waterfront' },
    { name: 'Al Nakheel', code: 'NAKH', tag: 'Central' },
  ],
  fujairah: [
    { name: 'Fujairah City', code: 'FUJC', tag: 'Central' },
    { name: 'Al Faseel', code: 'FASE', tag: 'Coastal' },
    { name: 'Dibba', code: 'DIBB', tag: 'Northern' },
  ],
  uaq: [
    { name: 'Old Town', code: 'OLDT', tag: 'Heritage' },
    { name: 'Al Salamah', code: 'SALM', tag: 'Residential' },
  ],
};

export const LAYOUTS: { id: LayoutId; label: string; sub: string }[] = [
  { id: 'studio', label: 'Studio', sub: 'Single' },
  { id: '1br', label: '1 BR', sub: 'One bed' },
  { id: '2br', label: '2 BR', sub: 'Two bed' },
  { id: '3br', label: '3 BR', sub: 'Three bed' },
  { id: '4br', label: '4 BR', sub: 'Four bed' },
];

export const PROPERTY_TYPES: { id: PropertyType; label: string }[] = [
  { id: 'apartment', label: 'Apartment' },
  { id: 'villa', label: 'Villa' },
  { id: 'townhouse', label: 'Townhouse' },
];

export const CHEQUE_FREQS: { id: ChequeFreq; label: string; sub: string }[] = [
  { id: 1, label: '1', sub: 'Annual' },
  { id: 2, label: '2', sub: 'Half-yearly' },
  { id: 4, label: '4', sub: 'Quarterly' },
  { id: 6, label: '6', sub: 'Bi-monthly' },
  { id: 12, label: '12', sub: 'Monthly' },
];

export const COOLING_TYPES: { id: CoolingType; label: string; sub: string }[] = [
  { id: 'chiller_free', label: 'Chiller Free', sub: 'Landlord-billed' },
  { id: 'dewa_ac', label: 'DEWA AC', sub: 'Utility-billed' },
  { id: 'district_cooling', label: 'District / Empower', sub: 'Capacity + usage' },
];

export const MONTHS: { id: MonthId; label: string; peak: boolean }[] = [
  { id: 'jan', label: 'January', peak: false },
  { id: 'feb', label: 'February', peak: false },
  { id: 'mar', label: 'March', peak: false },
  { id: 'apr', label: 'April', peak: false },
  { id: 'may', label: 'May', peak: true },
  { id: 'jun', label: 'June', peak: true },
  { id: 'jul', label: 'July', peak: true },
  { id: 'aug', label: 'August', peak: true },
  { id: 'sep', label: 'September', peak: true },
  { id: 'oct', label: 'October', peak: false },
  { id: 'nov', label: 'November', peak: false },
  { id: 'dec', label: 'December', peak: false },
];

export const DEFAULT_INPUT: ScenarioInput = {
  emirate: 'dubai',
  location: 'Jumeirah Village Circle',
  layout: '1br',
  propertyType: 'apartment',
  annualRent: 65000,
  chequeFreq: 4,
  furnishing: 'unfurnished',
  cooling: 'district_cooling',
  moveInMonth: 'jun',
};

/** Format a number as AED currency. */
export function formatAed(value: number, opts?: { compact?: boolean; decimals?: number }): string {
  const decimals = opts?.decimals ?? 0;
  if (opts?.compact && value >= 1000) {
    return 'AED ' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }
  return 'AED ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

export const RENT_MIN = 30000;
export const RENT_MAX = 1000000;
export const RENT_STEP = 1000;
