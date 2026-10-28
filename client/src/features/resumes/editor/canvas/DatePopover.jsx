import { useEffect, useRef } from 'react';
import { getDates, setDates } from '@resumeos/shared/editing.js';
import { MonthField } from '../../../../components/editor/MonthField.jsx';
import { Checkbox } from '../../../../components/ui/Field.jsx';
import { Button } from '../../../../components/ui/Button.jsx';

/** Month/year pickers for an entry's dates, anchored next to the dates on the page. */
export function DatePopover({ entryKey, content, style, onChange, onClose }) {
  const ref = useRef(null);
  const d = getDates(content, entryKey);

  useEffect(() => {
    ref.current?.querySelector('select')?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    const onPointer = (e) => !ref.current?.contains(e.target) && onClose();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [onClose]);

  if (!d) return null;
  const update = (patch) => onChange(setDates(content, entryKey, { ...d, ...patch }));

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Edit dates"
      className="absolute z-30 grid w-72 gap-3 rounded-lg border border-rule bg-surface p-4 shadow-paper"
      style={style}
    >
      <MonthField
        key={`${entryKey}-s`}
        label={d.labels[0]}
        value={d.start}
        onChange={(start) => update({ start })}
      />
      <MonthField
        key={`${entryKey}-e`}
        label={d.labels[1]}
        value={d.current ? '' : d.end}
        disabled={d.current}
        onChange={(end) => update({ end })}
      />
      {d.hasCurrent && (
        <Checkbox
          label="I'm still here"
          checked={d.current}
          onChange={(e) => update({ current: e.target.checked })}
        />
      )}
      <Button size="sm" variant="secondary" className="justify-self-end" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}
