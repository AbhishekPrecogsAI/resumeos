import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  CopyPlus,
  EyeOff,
  ListPlus,
  Plus,
  Trash2,
} from 'lucide-react';
import { getTemplate, DEFAULT_TEMPLATE_ID } from '@resumeos/shared/templates/index.js';
import {
  setField,
  addEntry,
  addBullet,
  removeBullet,
  addSkill,
  removeSkill,
  deleteEntry,
  moveEntry,
  addEntryAfter,
  addSkillCategory,
  deleteSkills,
  cycleLevel,
} from '@resumeos/shared/editing.js';
import { templateFontCss } from '../../../../lib/templateFonts.js';
import { sectionTitle } from '@resumeos/shared/resumeModel.js';
import {
  hideSection,
  moveSection,
  placeSection,
  sectionColumn,
  showSection,
} from '@resumeos/shared/layouts.js';
import { DatePopover } from './DatePopover.jsx';
import { PAGE_PX, documentHeight } from '../../../../lib/measurePages.js';
const URL_FIELD =
  /^(contact:(website|linkedin|github|portfolio)|(projects|certifications):[^:]+:(url|repositoryUrl))$/;
const BULLET_FIELD = /^(.*):bullets:([^:]+):text$/;
// What "add another" adds, by section, for the side toolbar's label.
const ENTRY_NOUN = {
  experience: 'a role',
  projects: 'a project',
  education: 'an education entry',
  certifications: 'a certification',
  languages: 'a language',
  interests: 'an interest',
  custom: 'an entry',
};
// One-line list entries: Enter adds the next one, Backspace on an empty one removes it.
const LIST_ITEM_FIELD = /^(languages|interests):([^:]+):name$/;

/** Light normalisation while typing, so autosave never stores a half-formed value. */
export function normalise(path, text) {
  const clean = text.replace(/\u00a0/g, ' ').replace(/\n+$/, '');
  if (URL_FIELD.test(path)) {
    const t = clean.trim();
    return t && !/^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? `https://${t}` : t;
  }
  if (path === 'contact:email') return clean.trim();
  return clean;
}

function placeCaretAtEnd(win, el, selectAll = false) {
  el.focus();
  const range = win.document.createRange();
  range.selectNodeContents(el);
  // A new category's placeholder name is selected, so typing replaces it.
  if (!selectAll) range.collapse(false);
  const sel = win.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

const cssEscape = (s) => s.replace(/["\\]/g, '\\$&');

/**
 * The resume page itself, editable in place. The template renders in "editable" mode inside a
 * sandboxed iframe (no scripts run in it); this component attaches listeners from the app.
 * Typing updates the draft without re-rendering, so the caret never jumps. Structural changes
 * (new bullet, delete, dates) re-render the page and restore focus.
 */
export function CanvasEditor({
  content,
  layout,
  templateId,
  pageSize,
  accentColor,
  pattern,
  photo,
  onTextEdit,
  onChange,
  onNotice,
}) {
  const frameRef = useRef(null);
  const wrapRef = useRef(null);
  const contentRef = useRef(content);
  const layoutRef = useRef(layout);
  const lastEmitted = useRef(null);
  const pendingFocus = useRef(null);
  const [renderContent, setRenderContent] = useState(content);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(PAGE_PX[pageSize]?.h ?? 1123);
  const [active, setActive] = useState(null); // { key, rect }
  const [dates, setDates] = useState(null); // { key, rect }
  const [section, setSection] = useState(null); // { key, rect }: the section under the pointer
  const callbacks = useRef({ onTextEdit, onChange, onNotice });
  const page = PAGE_PX[pageSize] ?? PAGE_PX.A4;

  useLayoutEffect(() => {
    contentRef.current = content;
    layoutRef.current = layout;
    callbacks.current = { onTextEdit, onChange, onNotice };
  });

  // Re-render the page only for changes that didn't come from typing on it (undo, structure, forms).
  useEffect(() => {
    if (content !== lastEmitted.current) setRenderContent(content);
  }, [content]);

  const html = useMemo(() => {
    const template = getTemplate(templateId) ?? getTemplate(DEFAULT_TEMPLATE_ID);
    return template.render(renderContent, layout, {
      editable: true,
      pageSize,
      accentColor,
      pattern,
      photo,
      fontCss: templateFontCss(template.id, layout?.font),
    });
  }, [renderContent, layout, templateId, pageSize, accentColor, pattern, photo]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = width ? Math.min(1.1, (width - 72) / page.w) : 0;

  const measure = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.documentElement) return;
    setHeight(Math.max(page.h, documentHeight(doc)));
    setActive((a) => {
      if (!a) return a;
      const el = doc.querySelector(`[data-entry="${cssEscape(a.key)}"]`);
      return el ? { key: a.key, rect: el.getBoundingClientRect() } : null;
    });
  }, [page.h]);

  /** Apply a structural change: re-render, then focus `focus` (a field path) if given. */
  const structural = useCallback((next, focus) => {
    if (focus) pendingFocus.current = focus;
    callbacks.current.onChange(next);
  }, []);

  const onLoad = () => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc) return;

    for (const el of doc.querySelectorAll('[data-edit]')) {
      el.contentEditable = 'plaintext-only';
      if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
      el.spellcheck = true;
      el.setAttribute('role', 'textbox');
      el.setAttribute('aria-label', el.dataset.ph);
    }

    const emitText = (el) => {
      const path = el.dataset.edit;
      if (el.textContent === '' && el.innerHTML !== '') el.innerHTML = '';
      const next = setField(contentRef.current, path, normalise(path, el.textContent));
      lastEmitted.current = next;
      callbacks.current.onTextEdit(next, path);
      requestAnimationFrame(measure);
    };

    doc.addEventListener('input', (ev) => {
      const el = ev.target.closest?.('[data-edit]');
      if (el) emitText(el);
    });

    doc.addEventListener('paste', (ev) => {
      const el = ev.target.closest?.('[data-edit]');
      if (!el || el.contentEditable === 'plaintext-only') return;
      ev.preventDefault();
      doc.execCommand('insertText', false, ev.clipboardData.getData('text/plain'));
    });

    doc.addEventListener('keydown', (ev) => {
      const button = ev.target.closest?.('[data-dates], [data-add], [data-level], [data-addcat]');
      if (button && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        button.click();
        return;
      }
      const el = ev.target.closest?.('[data-edit]');
      if (!el) return;
      const path = el.dataset.edit;
      const bullet = BULLET_FIELD.exec(path);
      const skill = path.startsWith('skills:') ? path.split(':')[1] : null;
      const item = LIST_ITEM_FIELD.exec(path);
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
        ev.preventDefault();
        if (item) {
          const out = addEntry(contentRef.current, item[1]);
          structural({ content: out.content }, out.focus);
        } else if (bullet) {
          const out = addBullet(contentRef.current, bullet[1], bullet[2]);
          if (out.focus) structural({ content: out.content }, out.focus);
        } else if (skill) {
          const category =
            contentRef.current.skills.find((s) => s.id === skill)?.category?.trim() || 'Skills';
          const out = addSkill(contentRef.current, category, skill);
          structural({ content: out.content }, out.focus);
        } else {
          // Move to the next field, like Tab.
          const fields = [...doc.querySelectorAll('[data-edit]')];
          fields[fields.indexOf(el) + 1]?.focus();
        }
      } else if (ev.key === 'Backspace' && el.textContent === '' && item) {
        ev.preventDefault();
        const list = contentRef.current[item[1]] ?? [];
        const prev = list[list.findIndex((x) => x.id === item[2]) - 1];
        structural(
          { content: deleteEntry(contentRef.current, `${item[1]}:${item[2]}`) },
          prev ? `${item[1]}:${prev.id}:name` : null,
        );
      } else if (ev.key === 'Backspace' && el.textContent === '' && (bullet || skill)) {
        ev.preventDefault();
        const out = bullet
          ? removeBullet(contentRef.current, bullet[1], bullet[2])
          : removeSkill(contentRef.current, skill);
        structural({ content: out.content }, out.focus);
      }
    });

    // Section toolbar: follows the pointer (and keyboard focus) from section to section.
    const pickSection = (ev) => {
      const el = ev.target.closest?.('section[data-section]');
      if (!el) return;
      for (const s of doc.querySelectorAll('.ed-section-active'))
        s.classList.remove('ed-section-active');
      el.classList.add('ed-section-active');
      setSection({ key: el.dataset.section, rect: el.getBoundingClientRect() });
    };
    doc.addEventListener('mouseover', pickSection);
    doc.addEventListener('focusin', pickSection);

    doc.addEventListener('focusin', (ev) => {
      for (const el of doc.querySelectorAll('.ed-active')) el.classList.remove('ed-active');
      const entry = ev.target.closest?.('[data-entry]');
      if (entry) {
        entry.classList.add('ed-active');
        setActive({ key: entry.dataset.entry, rect: entry.getBoundingClientRect() });
      }
    });

    doc.addEventListener('click', (ev) => {
      const deleteCategory = ev.target.closest?.('[data-delcat]');
      if (deleteCategory) {
        structural({
          content: deleteSkills(contentRef.current, deleteCategory.dataset.delcat.split(',')),
        });
        callbacks.current.onNotice?.(
          'Category deleted with its skills. Use Undo to bring it back.',
        );
        return;
      }
      const addSkillHere = ev.target.closest?.('[data-addskill]');
      if (addSkillHere) {
        const afterId = addSkillHere.dataset.addskill;
        const category =
          contentRef.current.skills.find((s) => s.id === afterId)?.category?.trim() || 'Skills';
        const out = addSkill(contentRef.current, category, afterId);
        structural({ content: out.content }, out.focus);
        return;
      }
      if (ev.target.closest?.('[data-addcat]')) {
        const out = addSkillCategory(contentRef.current);
        structural({ content: out.content }, out.focus);
        return;
      }
      const show = ev.target.closest?.('[data-show]');
      if (show) {
        structural({ layout: showSection(layoutRef.current, show.dataset.show) });
        return;
      }
      const datesEl = ev.target.closest?.('[data-dates]');
      if (datesEl) {
        setDates({ key: datesEl.dataset.dates, rect: datesEl.getBoundingClientRect() });
        return;
      }
      const level = ev.target.closest?.('[data-level]');
      if (level) {
        structural({ content: cycleLevel(contentRef.current, level.dataset.level) });
        return;
      }
      const add = ev.target.closest?.('[data-add]');
      if (add) {
        const out = addEntry(contentRef.current, add.dataset.add);
        structural({ content: out.content }, out.focus);
      }
    });

    measure();
    if (pendingFocus.current) {
      const target = doc.querySelector(`[data-edit="${cssEscape(pendingFocus.current)}"]`);
      pendingFocus.current = null;
      if (target) placeCaretAtEnd(win, target, target.dataset.edit.startsWith('skillcat:'));
    }
  };

  const activeEntry = active?.key;
  const entryOps = activeEntry && activeEntry !== 'skills';
  const hasBullets = activeEntry && /^(experience|projects|custom):/.test(activeEntry);
  const railTop = active ? active.rect.top * scale : 0;

  const act = (fn, notice) => {
    const next = fn();
    if (next) structural(next);
    if (notice) callbacks.current.onNotice?.(notice);
    setActive(null);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      {scale > 0 && (
        <div className="relative mx-auto" style={{ width: page.w * scale, height: height * scale }}>
          <div className="theme-light absolute inset-0 overflow-hidden rounded-sm bg-white shadow-paper">
            <iframe
              ref={frameRef}
              title="Resume page. Click any text to edit it."
              srcDoc={html}
              sandbox="allow-same-origin"
              onLoad={onLoad}
              className="absolute top-0 left-0 origin-top-left border-0 bg-white"
              style={{ width: page.w, height, transform: `scale(${scale})` }}
            />
          </div>

          {active && (
            <div
              role="toolbar"
              aria-label="Entry actions"
              className="absolute flex flex-col gap-1 rounded-lg border border-rule bg-surface p-1 shadow-paper"
              style={{ top: Math.max(0, railTop), left: page.w * scale + 10 }}
            >
              {activeEntry === 'skills' && (
                <RailButton
                  label="Add a skill"
                  onClick={() =>
                    act(() => {
                      const out = addSkill(contentRef.current);
                      pendingFocus.current = out.focus;
                      return { content: out.content };
                    })
                  }
                >
                  <Plus className="size-4" aria-hidden="true" />
                </RailButton>
              )}
              {hasBullets && (
                <RailButton
                  label="Add a bullet"
                  onClick={() =>
                    act(() => {
                      const out = addBullet(contentRef.current, activeEntry);
                      pendingFocus.current = out.focus;
                      return out.focus ? { content: out.content } : null;
                    })
                  }
                >
                  <ListPlus className="size-4" aria-hidden="true" />
                </RailButton>
              )}
              {entryOps && (
                <>
                  <RailButton
                    label={`Add ${ENTRY_NOUN[activeEntry.split(':')[0]] ?? 'an entry'} below`}
                    onClick={() =>
                      act(() => {
                        const out = addEntryAfter(contentRef.current, activeEntry);
                        pendingFocus.current = out.focus;
                        return out.focus ? { content: out.content } : null;
                      })
                    }
                  >
                    <CopyPlus className="size-4" aria-hidden="true" />
                  </RailButton>
                  <RailButton
                    label="Move up"
                    onClick={() =>
                      act(() => ({ content: moveEntry(contentRef.current, activeEntry, -1) }))
                    }
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </RailButton>
                  <RailButton
                    label="Move down"
                    onClick={() =>
                      act(() => ({ content: moveEntry(contentRef.current, activeEntry, 1) }))
                    }
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </RailButton>
                  <RailButton
                    label="Hide from this resume"
                    onClick={() =>
                      act(
                        () => ({
                          layout: {
                            ...layoutRef.current,
                            hiddenItems: [
                              ...(layoutRef.current.hiddenItems ?? []),
                              activeEntry.split(':').at(-1),
                            ],
                          },
                        }),
                        'Hidden from this resume. Show it again from Layout.',
                      )
                    }
                  >
                    <EyeOff className="size-4" aria-hidden="true" />
                  </RailButton>
                  <RailButton
                    label="Delete"
                    danger
                    onClick={() =>
                      act(
                        () => ({ content: deleteEntry(contentRef.current, activeEntry) }),
                        'Deleted. Use Undo if that was a mistake.',
                      )
                    }
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </RailButton>
                </>
              )}
            </div>
          )}

          {section && (
            <SectionToolbar
              key={section.key}
              sectionKey={section.key}
              rect={section.rect}
              scale={scale}
              template={getTemplate(templateId) ?? getTemplate(DEFAULT_TEMPLATE_ID)}
              content={content}
              layout={layout}
              onLayout={(nextLayout, notice) => {
                setSection(null);
                structural({ layout: nextLayout });
                if (notice) callbacks.current.onNotice?.(notice);
              }}
            />
          )}

          {dates && (
            <DatePopover
              entryKey={dates.key}
              content={content}
              style={{
                top: (dates.rect.bottom + 6) * scale,
                left: Math.max(0, Math.min(dates.rect.left * scale, page.w * scale - 300)),
              }}
              onChange={(nextContent) => structural({ content: nextContent })}
              onClose={() => setDates(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Controls for the section under the pointer, just above its top-right corner: move it within
 * its column, move it to the other column (two-column templates), or hide it.
 */
function SectionToolbar({ sectionKey, rect, scale, template, content, layout, onLayout }) {
  const title = sectionTitle(content, sectionKey);
  const column = sectionColumn(template, layout, sectionKey);
  const otherColumn = column === 'side' ? 'main' : 'side';
  return (
    <div
      role="toolbar"
      aria-label={`${title} section`}
      className="absolute z-10 flex items-center gap-0.5 rounded-lg border border-rule bg-surface p-0.5 shadow-paper"
      style={{
        top: Math.max(0, rect.top * scale - 38),
        left: Math.max(0, rect.right * scale - 172),
      }}
    >
      <span className="px-2 text-xs font-medium text-muted">{title}</span>
      <RailButton
        label={`Move ${title} up`}
        onClick={() => onLayout(moveSection(template, content, layout, sectionKey, -1))}
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </RailButton>
      <RailButton
        label={`Move ${title} down`}
        onClick={() => onLayout(moveSection(template, content, layout, sectionKey, 1))}
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </RailButton>
      {template.sideSections && (
        <RailButton
          label={`Move ${title} to the ${otherColumn === 'side' ? 'sidebar' : 'main column'}`}
          onClick={() => onLayout(placeSection(template, layout, sectionKey, otherColumn))}
        >
          <ArrowLeftRight className="size-4" aria-hidden="true" />
        </RailButton>
      )}
      <RailButton
        label={`Hide ${title}`}
        onClick={() =>
          onLayout(
            hideSection(layout, sectionKey),
            `${title} is hidden. Show it again from the list at the end of the page.`,
          )
        }
      >
        <EyeOff className="size-4" aria-hidden="true" />
      </RailButton>
    </div>
  );
}

function RailButton({ label, onClick, danger, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-md ${danger ? 'text-danger hover:bg-danger-soft' : 'text-muted hover:bg-sunken hover:text-ink'}`}
    >
      {children}
    </button>
  );
}
