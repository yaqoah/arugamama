import { motion } from 'framer-motion';
import { EMIRATES, type EmirateId } from '@/lib/constants';

type EmirateSelectorProps = {
  value: EmirateId;
  onChange: (value: EmirateId) => void;
};

/**
 * Emirate segmented pills with a sliding highlighter tab. Renders all
 * seven emirates; the active pill inverts to purple-on-ink with a
 * sharp cell-shaded offset border.
 */
export function EmirateSelector({ value, onChange }: EmirateSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EMIRATES.map((em) => {
        const active = em.id === value;
        return (
          <button
            key={em.id}
            type="button"
            onClick={() => onChange(em.id)}
            className={[
              'relative px-3 py-1.5 font-heading text-[12px] font-bold uppercase tracking-wider',
              'border-2 border-ink transition-colors duration-150',
              active
                ? 'bg-sunset text-cream shadow-[2px_2px_0px_#0D1117]'
                : 'text-ink bg-parchment-100 hover:bg-ink/5',
            ].join(' ')}
          >
            <span className="relative flex items-center gap-1.5">
              <span className="font-mono text-[9px] opacity-70">{em.short}</span>
              {em.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
