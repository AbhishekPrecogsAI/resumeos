import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Link2, Plus, Trash2 } from 'lucide-react';
import { newId } from '@resumeos/shared/ids.js';
import { ID_PREFIX } from '@resumeos/shared/resumeModel.js';
import { ADVISORY, LIMITS } from '@resumeos/shared/limits.js';
import { moveItem, removeAt, replaceAt, insertAt } from '../../lib/array.js';
import { Button } from '../ui/Button.jsx';
import { cx } from '../../lib/cx.js';

export const newBullet = (text = '') => ({ id: newId(ID_PREFIX.bullet), text, evidenceIds: [] });

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function EvidencePicker({ bullet, evidenceItems, onChange }) {
  const [open, setOpen] = useState(false);
  const linked = bullet.evidenceIds ?? [];
  return (
    <div className="mt-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'inline-flex items-center gap-1 rounded text-xs',
          linked.length ? 'font-medium text-added' : 'text-muted hover:text-ink',
        )}
      >
        <Link2 className="size-3.5" aria-hidden="true" />
        {linked.length ? `Evidence attached (${linked.length})` : 'No evidence attached'}
      </button>
      {open && (
        <fieldset className="mt-2 rounded-md border border-rule p-3">
          <legend className="px-1 text-xs font-medium text-muted">
            Link evidence you've added to your profile
          </legend>
          {evidenceItems.length ? (
            <div className="grid gap-1.5">
              {evidenceItems.map((ev) => (
                <label key={ev.id} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent)]"
                    checked={linked.includes(ev.id)}
                    onChange={(e) =>
                      onChange(
                        e.target.checked ? [...linked, ev.id] : linked.filter((x) => x !== ev.id),
                      )
                    }
                  />
                  {ev.title || 'Untitled evidence'}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Add evidence items in the Evidence section of your profile first.
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}

/**
 * Bullet list editor. Enter adds a bullet below; Backspace in an empty bullet removes it.
 * Move buttons provide keyboard-accessible reordering.
 */
export function BulletsEditor({ label = 'Bullets', bullets = [], onChange, evidenceItems }) {
  const refs = useRef(new Map());
  const focusLater = (id) => requestAnimationFrame(() => refs.current.get(id)?.focus());

  const update = (index, patch) =>
    onChange(replaceAt(bullets, index, { ...bullets[index], ...patch }), {
      coalesceKey: `bullet:${bullets[index].id}`,
    });
  const add = (index = bullets.length) => {
    if (bullets.length >= LIMITS.bulletsPerEntry) return;
    const b = newBullet();
    onChange(insertAt(bullets, index, b));
    focusLater(b.id);
  };

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium text-ink">{label}</legend>
      {bullets.length === 0 && (
        <p className="text-sm text-muted">
          No bullets yet. Describe what you did and what changed because of it.
        </p>
      )}
      <ol className="grid gap-2">
        {bullets.map((bullet, index) => {
          const length = bullet.text.length;
          return (
            <li key={bullet.id} className="flex items-start gap-1.5">
              <span aria-hidden="true" className="mt-2.5 w-3 text-faint">
                •
              </span>
              <div className="min-w-0 flex-1">
                <label htmlFor={`bullet-${bullet.id}`} className="sr-only">
                  {label} {index + 1}
                </label>
                <textarea
                  id={`bullet-${bullet.id}`}
                  ref={(el) =>
                    el ? refs.current.set(bullet.id, el) : refs.current.delete(bullet.id)
                  }
                  value={bullet.text}
                  rows={Math.min(5, Math.max(1, Math.ceil(length / 90)))}
                  maxLength={LIMITS.bullet}
                  onChange={(e) => update(index, { text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      add(index + 1);
                    } else if (e.key === 'Backspace' && bullet.text === '' && bullets.length > 0) {
                      e.preventDefault();
                      onChange(removeAt(bullets, index));
                      const prev = bullets[index - 1];
                      if (prev) focusLater(prev.id);
                    }
                  }}
                  className="block w-full resize-y rounded-md border border-rule-strong bg-surface px-3 py-2 leading-relaxed text-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {evidenceItems ? (
                    <EvidencePicker
                      bullet={bullet}
                      evidenceItems={evidenceItems}
                      onChange={(evidenceIds) => update(index, { evidenceIds })}
                    />
                  ) : (
                    <span />
                  )}
                  <p
                    className={cx(
                      'mt-1 text-xs tabular-nums',
                      length > ADVISORY.bulletChars ? 'text-warn' : 'text-faint',
                    )}
                  >
                    {length} characters
                    {length > ADVISORY.bulletChars ? '. Long bullets are often skimmed past.' : ''}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0">
                <IconButton
                  label={`Move bullet ${index + 1} up`}
                  onClick={() => onChange(moveItem(bullets, index, index - 1))}
                  disabled={index === 0}
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`Move bullet ${index + 1} down`}
                  onClick={() => onChange(moveItem(bullets, index, index + 1))}
                  disabled={index === bullets.length - 1}
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`Remove bullet ${index + 1}`}
                  onClick={() => onChange(removeAt(bullets, index))}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ol>
      <Button
        variant="ghost"
        size="sm"
        className="justify-self-start"
        onClick={() => add()}
        disabled={bullets.length >= LIMITS.bulletsPerEntry}
      >
        <Plus className="size-4" aria-hidden="true" /> Add bullet
      </Button>
      <p className="text-xs text-faint">
        Press Enter for a new bullet. Shift+Enter adds a line break.
      </p>
    </fieldset>
  );
}
