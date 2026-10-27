import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical } from 'lucide-react';
import { sectionTitle } from '@resumeos/shared/resumeModel.js';
import { useDragReorder } from '../../../hooks/useDragReorder.js';
import { cx } from '../../../lib/cx.js';

/**
 * Left column: choose a section to edit, show/hide it, and reorder (drag or move buttons).
 * Contact details always print first, so they aren't reorderable.
 */
export function SectionNavigator({
  content,
  order,
  hiddenSections,
  selected,
  onSelect,
  onMove,
  onToggleVisible,
  noticeCounts,
}) {
  const drag = useDragReorder(onMove);
  const rowClass = (active) =>
    cx(
      'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm',
      active ? 'bg-accent-soft font-medium text-accent' : 'text-ink hover:bg-sunken',
    );

  return (
    <nav aria-label="Resume sections">
      <ul className="grid gap-0.5">
        <li className="flex items-center gap-1 pl-7">
          <button
            type="button"
            aria-current={selected === 'contact' ? 'true' : undefined}
            onClick={() => onSelect('contact')}
            className={rowClass(selected === 'contact')}
          >
            <span className="truncate">Header and contact</span>
            {noticeCounts.contact ? (
              <span className="rounded bg-warn-soft px-1.5 text-xs font-medium text-warn">
                {noticeCounts.contact}
              </span>
            ) : null}
          </button>
        </li>
        {order.map((key, index) => {
          const hidden = hiddenSections.includes(key);
          const title = sectionTitle(content, key);
          const notices = noticeCounts[key] ?? 0;
          return (
            <li
              key={key}
              {...drag.dropProps(index)}
              className={cx(
                'group flex items-center gap-1 rounded-md',
                drag.overIndex === index && drag.dragIndex !== index && 'ring-1 ring-accent',
              )}
            >
              <span
                {...drag.handleProps(index)}
                title="Drag to reorder"
                aria-hidden="true"
                className="grid size-6 cursor-grab place-items-center text-faint"
              >
                <GripVertical className="size-4" />
              </span>
              <button
                type="button"
                aria-current={selected === key ? 'true' : undefined}
                onClick={() => onSelect(key)}
                className={rowClass(selected === key)}
              >
                <span className={cx('truncate', hidden && 'text-faint line-through')}>{title}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {notices ? (
                    <span className="rounded bg-warn-soft px-1.5 text-xs font-medium text-warn">
                      {notices}
                      <span className="sr-only">
                        {' '}
                        profile {notices === 1 ? 'update' : 'updates'}
                      </span>
                    </span>
                  ) : null}
                  {hidden && <span className="sr-only">(hidden)</span>}
                </span>
              </button>
              <div className="flex shrink-0">
                <button
                  type="button"
                  aria-label={hidden ? `Show ${title} on resume` : `Hide ${title} from resume`}
                  aria-pressed={hidden}
                  title={hidden ? 'Show on resume' : 'Hide from resume'}
                  onClick={() => onToggleVisible(key)}
                  className="grid size-7 place-items-center rounded text-muted hover:bg-sunken hover:text-ink"
                >
                  {hidden ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Move ${title} up`}
                  title="Move up"
                  disabled={index === 0}
                  onClick={() => onMove(index, index - 1)}
                  className="grid size-7 place-items-center rounded text-muted hover:bg-sunken hover:text-ink disabled:opacity-30"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${title} down`}
                  title="Move down"
                  disabled={index === order.length - 1}
                  onClick={() => onMove(index, index + 1)}
                  className="grid size-7 place-items-center rounded text-muted hover:bg-sunken hover:text-ink disabled:opacity-30"
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
