import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react';
import { moveItem, removeAt, replaceAt } from '../../lib/array.js';
import { useDragReorder } from '../../hooks/useDragReorder.js';
import { Button } from '../ui/Button.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { EntryFields } from './EntryFields.jsx';
import { cx } from '../../lib/cx.js';

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

/**
 * Editable list of entries (roles, projects, …) shown as collapsible cards.
 * Reordering: drag the grip, or use the move buttons (keyboard accessible).
 */
export function EntryListEditor({
  items = [],
  onChange,
  fields,
  describe,
  newItem,
  noun,
  addLabel,
  emptyText,
  deleteMessage,
  maxItems = 50,
  context,
  renderHeaderExtra,
  renderBodyExtra,
  isMuted,
}) {
  const [expanded, setExpanded] = useState(() => new Set(items.length === 1 ? [items[0].id] : []));
  const [pendingDelete, setPendingDelete] = useState(null);
  const listRef = useRef(null);
  const drag = useDragReorder((from, to) => onChange(moveItem(items, from, to)));

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = () => {
    const item = newItem();
    onChange([...items, item]);
    setExpanded((prev) => new Set(prev).add(item.id));
    requestAnimationFrame(() =>
      listRef.current
        ?.querySelector(`[data-entry="${item.id}"] input, [data-entry="${item.id}"] textarea`)
        ?.focus(),
    );
  };

  const confirmDelete = () => {
    const index = items.findIndex((i) => i.id === pendingDelete.id);
    if (index >= 0) onChange(removeAt(items, index));
    setPendingDelete(null);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {items.length === 0 && emptyText && (
        <p className="rounded-lg border border-dashed border-rule-strong px-4 py-6 text-center text-sm text-muted">
          {emptyText}
        </p>
      )}
      {/* Shrinkable column, so long titles truncate instead of widening the page on phones. */}
      <ul ref={listRef} className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {items.map((item, index) => {
          const open = expanded.has(item.id);
          const label = describe(item) || `Untitled ${noun}`;
          const panelId = `entry-panel-${item.id}`;
          return (
            <li
              key={item.id}
              data-entry={item.id}
              {...drag.dropProps(index)}
              className={cx(
                'rounded-lg border bg-surface transition-colors',
                drag.overIndex === index && drag.dragIndex !== index
                  ? 'border-accent'
                  : 'border-rule',
                drag.dragIndex === index && 'opacity-60',
              )}
            >
              <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-1">
                <span
                  {...drag.handleProps(index)}
                  className="grid size-8 cursor-grab place-items-center text-faint"
                  title="Drag to reorder"
                  aria-hidden="true"
                >
                  <GripVertical className="size-4" />
                </span>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggle(item.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-sunken"
                >
                  <ChevronRight
                    className={cx(
                      'size-4 shrink-0 text-muted transition-transform',
                      open && 'rotate-90',
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cx(
                      'truncate font-medium',
                      isMuted?.(item) ? 'text-faint line-through decoration-faint/50' : 'text-ink',
                    )}
                  >
                    {label}
                  </span>
                </button>
                {renderHeaderExtra?.(item)}
                <IconButton
                  label={`Move ${label} up`}
                  onClick={() => onChange(moveItem(items, index, index - 1))}
                  disabled={index === 0}
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`Move ${label} down`}
                  onClick={() => onChange(moveItem(items, index, index + 1))}
                  disabled={index === items.length - 1}
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`Delete ${label}`}
                  onClick={() => setPendingDelete({ id: item.id, label })}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </IconButton>
              </div>
              {open && (
                <div id={panelId} className="border-t border-rule px-4 pt-4 pb-5">
                  {renderBodyExtra?.(item)}
                  <EntryFields
                    fields={fields}
                    value={item}
                    idPrefix={item.id}
                    context={context}
                    onChange={(next, opts) => onChange(replaceAt(items, index, next), opts)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Button
        variant="secondary"
        size="sm"
        className="justify-self-start"
        onClick={add}
        disabled={items.length >= maxItems}
      >
        <Plus className="size-4" aria-hidden="true" /> {addLabel ?? `Add ${noun}`}
      </Button>

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        size="sm"
        title={`Delete "${pendingDelete?.label}"?`}
        description={deleteMessage}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete {noun}
            </Button>
          </>
        }
      />
    </div>
  );
}
