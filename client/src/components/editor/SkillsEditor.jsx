import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { newId } from '@resumeos/shared/ids.js';
import { ID_PREFIX } from '@resumeos/shared/resumeModel.js';
import { LIMITS } from '@resumeos/shared/limits.js';
import { moveItem, removeAt, replaceAt } from '../../lib/array.js';
import { Button } from '../ui/Button.jsx';
import { cx } from '../../lib/cx.js';

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

/**
 * Skills as compact rows. Categories group skills on the resume ("Languages", "Data", …).
 * The quick-add field accepts several skills separated by commas.
 */
export function SkillsEditor({ skills = [], onChange, renderRowExtra, isMuted }) {
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState('');
  const categories = [...new Set(skills.map((s) => s.category).filter(Boolean))];

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
          Separate several skills with commas, then press Enter. Duplicates are skipped.
        </p>
        <datalist id="skill-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

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
