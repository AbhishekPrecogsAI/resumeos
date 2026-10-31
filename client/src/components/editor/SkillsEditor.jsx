import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { newId } from '@resumeos/shared/ids.js';
import { ID_PREFIX, SKILL_LEVELS } from '@resumeos/shared/resumeModel.js';
import { LIMITS } from '@resumeos/shared/limits.js';
import { moveItem, removeAt, replaceAt } from '../../lib/array.js';
import { Button } from '../ui/Button.jsx';
import { cx } from '../../lib/cx.js';
import { renameSkillCategory } from '@resumeos/shared/editing.js';

const input =
  'h-9 w-full min-w-0 rounded-md border border-rule-strong bg-surface px-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent';

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/** One category chip: shows its size, renames every skill in it, or deletes them (two steps). */
function CategoryChip({ name, count, onRename, onDelete }) {
  const [mode, setMode] = useState('view'); // view | rename | confirm
  const [value, setValue] = useState(name);
  const inputRef = useRef(null);
  // Rename was just clicked, so put the cursor in the box.
  useEffect(() => {
    if (mode === 'rename') inputRef.current?.select();
  }, [mode]);
  const commit = () => {
    const next = value.trim();
    if (next && next !== name) onRename(next);
    setMode('view');
  };

  if (mode === 'rename')
    return (
      <li className="flex items-center gap-1 rounded-full border border-accent bg-surface py-0.5 pr-1 pl-2">
        <input
          aria-label={`New name for ${name}`}
          className="h-7 w-36 bg-transparent text-sm text-ink outline-none"
          value={value}
          maxLength={80}
          ref={inputRef}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              setValue(name);
              setMode('view');
            }
          }}
          onBlur={commit}
        />
        <IconButton label="Save name" onClick={commit}>
          <Check className="size-4" aria-hidden="true" />
        </IconButton>
      </li>
    );

  if (mode === 'confirm')
    return (
      <li className="flex items-center gap-2 rounded-full border border-danger bg-danger-soft py-0.5 pr-1 pl-3 text-sm text-ink">
        Delete {name} and its {count} {count === 1 ? 'skill' : 'skills'}?
        <button
          type="button"
          onClick={onDelete}
          className="h-7 rounded-full bg-danger px-3 text-xs font-semibold text-white"
        >
          Delete
        </button>
        <IconButton label="Keep category" onClick={() => setMode('view')}>
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      </li>
    );

  return (
    <li className="flex items-center gap-0.5 rounded-full border border-rule-strong bg-surface py-0.5 pr-1 pl-3 text-sm text-ink">
      {name}
      <span className="ml-1 text-xs text-muted">{count}</span>
      <IconButton label={`Rename ${name}`} onClick={() => setMode('rename')}>
        <Pencil className="size-3.5" aria-hidden="true" />
      </IconButton>
      <IconButton label={`Delete ${name}`} onClick={() => setMode('confirm')}>
        <Trash2 className="size-3.5" aria-hidden="true" />
      </IconButton>
    </li>
  );
}

/**
 * Skills as compact rows. Categories group skills on the resume ("Languages", "Data", …).
 * The quick-add field accepts several skills separated by commas.
 */
export function SkillsEditor({ skills = [], onChange, renderRowExtra, isMuted }) {
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState('');
  const categories = [...new Set(skills.map((s) => s.category?.trim()).filter(Boolean))];

  const addFromDraft = () => {
    const names = draft
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    const existing = new Set(skills.map((s) => s.name.trim().toLowerCase()));
    const fresh = names
      .filter((n) => !existing.has(n.toLowerCase()))
      .map((name) => ({
        id: newId(ID_PREFIX.skills),
        name,
        category,
        context: '',
        evidenceIds: [],
      }));
    if (fresh.length) onChange([...skills, ...fresh].slice(0, LIMITS.skills));
    setDraft('');
  };

  // No level is stored as no key at all, so untouched skills keep their exact shape.
  const setLevel = (index, value) => {
    const { level: _old, ...rest } = skills[index];
    onChange(replaceAt(skills, index, value ? { ...rest, level: Number(value) } : rest));
  };
  const levelSelect = (s, i, className) => (
    <select
      aria-label={`Skill ${i + 1} level`}
      className={cx(input, 'pr-7', className)}
      value={s.level ?? ''}
      onChange={(e) => setLevel(i, e.target.value)}
    >
      <option value="">No level</option>
      {SKILL_LEVELS.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );

  const update = (index, patch, key) =>
    onChange(replaceAt(skills, index, { ...skills[index], ...patch }), {
      coalesceKey: `skill:${skills[index].id}:${key}`,
    });

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-lg border border-rule bg-sunken/50 p-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <div>
          <label htmlFor="skill-quick-add" className="text-sm font-medium text-ink">
            Add skills
          </label>
          <input
            id="skill-quick-add"
            className={cx(input, 'mt-1.5')}
            value={draft}
            placeholder="Go, PostgreSQL, Terraform"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addFromDraft();
              }
            }}
            aria-describedby="skill-quick-add-hint"
          />
        </div>
        <div>
          <label htmlFor="skill-quick-category" className="text-sm font-medium text-ink">
            Category <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="skill-quick-category"
            className={cx(input, 'mt-1.5')}
            list="skill-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Languages"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-9"
          onClick={addFromDraft}
          disabled={!draft.trim()}
        >
          <Plus className="size-4" aria-hidden="true" /> Add
        </Button>
        <p id="skill-quick-add-hint" className="text-xs text-muted sm:col-span-3">
          Separate several skills with commas, then press Enter. Duplicates are skipped. Levels are
          optional; templates with an accent colour draw them as dots or bars.
        </p>
        <datalist id="skill-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {categories.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Categories</p>
          <ul className="flex flex-wrap gap-2" aria-label="Skill categories">
            {categories.map((name) => (
              <CategoryChip
                key={name}
                name={name}
                count={skills.filter((s) => s.category?.trim() === name).length}
                onRename={(to) => onChange(renameSkillCategory({ skills }, name, to).skills)}
                onDelete={() => onChange(skills.filter((s) => s.category?.trim() !== name))}
              />
            ))}
          </ul>
        </div>
      )}

      {skills.length === 0 ? (
        <p className="text-sm text-muted">No skills yet.</p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">Skills</caption>
          <thead className="text-left text-xs text-muted">
            <tr>
              <th scope="col" className="pb-2 font-medium">
                Skill
              </th>
              <th scope="col" className="hidden pb-2 pl-2 font-medium sm:table-cell">
                Category
              </th>
              <th scope="col" className="hidden pb-2 pl-2 font-medium sm:table-cell">
                Level
              </th>
              <th scope="col" className="hidden pb-2 pl-2 font-medium md:table-cell">
                Context (optional)
              </th>
              <th scope="col" className="pb-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s, i) => (
              <tr key={s.id} className={cx('align-top', isMuted?.(s) && 'opacity-60')}>
                <td className="py-1 pr-2">
                  <input
                    aria-label={`Skill ${i + 1} name`}
                    className={input}
                    value={s.name}
                    maxLength={80}
                    onChange={(e) => update(i, { name: e.target.value }, 'name')}
                  />
                  <input
                    aria-label={`Skill ${i + 1} category`}
                    className={cx(input, 'mt-1 sm:hidden')}
                    placeholder="Category"
                    list="skill-categories"
                    value={s.category}
                    onChange={(e) => update(i, { category: e.target.value }, 'category')}
                  />
                  {levelSelect(s, i, 'mt-1 sm:hidden')}
                </td>
                <td className="hidden py-1 pl-2 sm:table-cell">
                  <input
                    aria-label={`Skill ${i + 1} category`}
                    className={input}
                    list="skill-categories"
                    value={s.category}
                    maxLength={80}
                    onChange={(e) => update(i, { category: e.target.value }, 'category')}
                  />
                </td>
                <td className="hidden w-36 py-1 pl-2 sm:table-cell">{levelSelect(s, i)}</td>
                <td className="hidden py-1 pl-2 md:table-cell">
                  <input
                    aria-label={`Skill ${i + 1} context`}
                    className={input}
                    placeholder="e.g. 4 years, production"
                    value={s.context}
                    maxLength={200}
                    onChange={(e) => update(i, { context: e.target.value }, 'context')}
                  />
                </td>
                <td className="py-1 pl-1">
                  <div className="flex justify-end">
                    {renderRowExtra?.(s)}
                    <IconButton
                      label={`Move ${s.name || 'skill'} up`}
                      onClick={() => onChange(moveItem(skills, i, i - 1))}
                      disabled={i === 0}
                    >
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Move ${s.name || 'skill'} down`}
                      onClick={() => onChange(moveItem(skills, i, i + 1))}
                      disabled={i === skills.length - 1}
                    >
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={`Remove ${s.name || 'skill'}`}
                      onClick={() => onChange(removeAt(skills, i))}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
