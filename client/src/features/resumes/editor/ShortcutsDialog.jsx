import { Dialog } from '../../../components/ui/Dialog.jsx';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

export const SHORTCUTS = [
  { keys: [mod, 'S'], action: 'Save now' },
  { keys: [mod, 'Z'], action: 'Undo (outside text fields)' },
  { keys: [mod, 'Shift', 'Z'], action: 'Redo (outside text fields)' },
  { keys: ['Enter'], action: 'New bullet below (in a bullet)' },
  { keys: ['Backspace'], action: 'Remove an empty bullet' },
  { keys: ['?'], action: 'Show this list' },
];

export function ShortcutsDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} size="sm" title="Keyboard shortcuts">
      <dl className="grid gap-2.5">
        {SHORTCUTS.map((s) => (
          <div key={s.action} className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-muted">{s.action}</dt>
            <dd className="flex gap-1">
              {s.keys.map((k) => (
                <kbd
                  key={k}
                  className="rounded border border-rule-strong bg-sunken px-1.5 py-0.5 font-mono text-xs text-ink"
                >
                  {k}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
