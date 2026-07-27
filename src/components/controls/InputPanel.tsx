import type {
  ChequeFreq,
  CoolingType,
  EmirateId,
  FurnishingStatus,
  LayoutId,
  MonthId,
  PropertyType,
  ScenarioInput,
} from '@/lib/constants';
import {
  CHEQUE_FREQS,
  COOLING_TYPES,
  LAYOUTS,
  LOCATIONS,
  MONTHS,
  PROPERTY_TYPES,
} from '@/lib/constants';
import { MangaPanel, SectionLabel } from '@/components/primitives';
import { EmirateSelector } from './EmirateSelector';
import { MonthDropdown, SearchableDropdown, SegmentedControl } from './ControlsCommon';
import { RentSlider } from './RentSlider';
import { ToggleSwitch } from './ToggleSwitch';

type InputPanelProps = {
  input: ScenarioInput;
  update: <K extends keyof ScenarioInput>(key: K, value: ScenarioInput[K]) => void;
};

/** Left-column interactive input panel — all 9 selector controls. */
export function InputPanel({ input, update }: InputPanelProps) {
  const locationOptions = (LOCATIONS[input.emirate] ?? []).map((l) => ({
    value: l.name,
    label: l.name,
    code: l.code,
    tag: l.tag,
  }));

  return (
    <MangaPanel className="p-5 sm:p-6" corners>
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-bold uppercase tracking-tight text-ink">
          Input Panel
        </h2>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
          9 / 9 selectors
        </span>
      </div>

      <div className="space-y-6">
        {/* 1. Emirate */}
        <section>
          <SectionLabel index={1}>Emirate</SectionLabel>
          <div className="mt-2.5">
            <EmirateSelector
              value={input.emirate}
              onChange={(v: EmirateId) => {
                update('emirate', v);
                const first = LOCATIONS[v]?.[0];
                if (first && !LOCATIONS[v].some((l) => l.name === input.location)) {
                  update('location', first.name);
                }
              }}
            />
          </div>
        </section>

        {/* 2. Location / Community */}
        <section>
          <SectionLabel index={2}>Location / Community</SectionLabel>
          <div className="mt-2.5">
            <SearchableDropdown
              ariaLabel="Location"
              options={locationOptions}
              value={input.location}
              onChange={(v) => update('location', v)}
              placeholder="Search communities…"
            />
          </div>
        </section>

        {/* 3. Residence Layout */}
        <section>
          <SectionLabel index={3}>Residence Layout</SectionLabel>
          <div className="mt-2.5">
            <SegmentedControl<LayoutId>
              ariaLabel="Layout"
              options={LAYOUTS.map((l) => ({ id: l.id, label: l.label, sub: l.sub }))}
              value={input.layout}
              onChange={(v) => update('layout', v)}
              columns={5}
              compact
            />
          </div>
        </section>

        {/* 4. Property Type */}
        <section>
          <SectionLabel index={4}>Property Type</SectionLabel>
          <div className="mt-2.5">
            <SegmentedControl<PropertyType>
              ariaLabel="Property type"
              options={PROPERTY_TYPES.map((p) => ({ id: p.id, label: p.label }))}
              value={input.propertyType}
              onChange={(v) => update('propertyType', v)}
              columns={3}
            />
          </div>
        </section>

        {/* 5. Annual Rent */}
        <section>
          <SectionLabel index={5}>Annual Rent</SectionLabel>
          <div className="mt-1">
            <RentSlider value={input.annualRent} onChange={(v) => update('annualRent', v)} />
          </div>
        </section>

        {/* 6. Cheque Frequency */}
        <section>
          <SectionLabel index={6}>Cheque Frequency</SectionLabel>
          <div className="mt-2.5">
            <SegmentedControl<ChequeFreq>
              ariaLabel="Cheque frequency"
              options={CHEQUE_FREQS.map((c) => ({
                id: c.id,
                label: String(c.label),
                sub: c.sub,
              }))}
              value={input.chequeFreq}
              onChange={(v) => update('chequeFreq', v)}
              columns={5}
              compact
            />
          </div>
        </section>

        {/* 7. Furnishing Status */}
        <section>
          <SectionLabel index={7}>Furnishing Status</SectionLabel>
          <div className="mt-2.5">
            <ToggleSwitch
              ariaLabel="Furnishing"
              value={input.furnishing === 'furnished'}
              onChange={(v) => update('furnishing', (v ? 'furnished' : 'unfurnished') as FurnishingStatus)}
              offLabel="Unfurnished"
              offSub="5% security deposit"
              onLabel="Furnished"
              onSub="10% security deposit"
            />
          </div>
        </section>

        {/* 8. AC / Cooling Type */}
        <section>
          <SectionLabel index={8}>AC / Cooling Type</SectionLabel>
          <div className="mt-2.5">
            <SegmentedControl<CoolingType>
              ariaLabel="Cooling type"
              options={COOLING_TYPES.map((c) => ({ id: c.id, label: c.label, sub: c.sub }))}
              value={input.cooling}
              onChange={(v) => update('cooling', v)}
              columns={3}
            />
          </div>
        </section>

        {/* 9. Expected Move-In Month */}
        <section>
          <SectionLabel index={9}>Expected Move-In Month</SectionLabel>
          <div className="mt-2.5">
            <MonthDropdown
              ariaLabel="Move-in month"
              options={MONTHS}
              value={input.moveInMonth}
              onChange={(v) => update('moveInMonth', v as MonthId)}
            />
          </div>
        </section>
      </div>
    </MangaPanel>
  );
}
