import { motion } from 'framer-motion';

type ToggleSwitchProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  offLabel: string;
  offSub: string;
  onLabel: string;
  onSub: string;
  ariaLabel?: string;
};

/**
 * High-contrast manga toggle. OFF state renders ink-on-cream with the
 * unfurnished label; ON flips to sunset-on-ink with the furnished label.
 * The knob slides and the whole track swaps palette.
 */
export function ToggleSwitch({
  value,
  onChange,
  offLabel,
  offSub,
  onLabel,
  onSub,
  ariaLabel,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-stretch gap-2">
      {/* Left status readout */}
      <div className="flex flex-1 flex-col justify-center border-2 border-ink bg-ink/5 px-3 py-2">
        <span className="font-heading text-[13px] font-bold uppercase tracking-wider text-ink">
          {value ? onLabel : offLabel}
        </span>
        <span className="font-body text-[10px] font-medium text-ink/50">
          {value ? onSub : offSub}
        </span>
      </div>

      {/* Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={ariaLabel}
        onClick={() => onChange(!value)}
        className={[
          'relative flex w-16 shrink-0 items-center border-2 border-ink shadow-mangaSm',
          'transition-colors duration-200',
          value ? 'bg-sunset' : 'bg-cream',
        ].join(' ')}
      >
        <motion.span
          layout
          className="absolute top-1/2 h-9 w-9 -translate-y-1/2 border-2 border-ink shadow-mangaSm"
          animate={{ left: value ? 'calc(100% - 38px)' : '4px' }}
          transition={{ type: 'spring', stiffness: 520, damping: 30 }}
          style={{ backgroundColor: '#0D1117' }}
        />
      </button>
    </div>
  );
}
