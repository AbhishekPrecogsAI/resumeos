import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  LayoutTemplate,
  ListChecks,
  Plus,
  Rows3,
} from 'lucide-react';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { notYetAdded, resolveSectionOrder, sectionTitle } from '@resumeos/shared/resumeModel.js';
import { addCustomSection, addEntry } from '@resumeos/shared/editing.js';
import { Button } from '../../../../components/ui/Button.jsx';
import { Dialog } from '../../../../components/ui/Dialog.jsx';
import { TemplateGrid } from '../../../../components/templates/TemplateGrid.jsx';
import { useToast } from '../../../../components/ui/Toast.jsx';
import { moveItem } from '../../../../lib/array.js';
import { QualityPanel } from '../QualityPanel.jsx';
import { ResumePhotoPanel } from '../../../../components/editor/ResumePhotoPanel.jsx';
import { CanvasEditor } from './CanvasEditor.jsx';

function entryName(content, id) {
  for (const key of [
    'experience',
    'projects',
    'education',
    'certifications',
    'languages',
    'interests',
  ]) {
    const e = (content[key] ?? []).find((x) => x.id === id);
    if (e)
      return (
        [e.title, e.company].filter(Boolean).join(', ') ||
        e.name ||
        e.degree ||
        e.institution ||
        'Untitled entry'
      );
  }
  for (const s of content.customSections ?? []) {
    const e = s.items.find((x) => x.id === id);
    if (e) return e.title || 'Untitled entry';
  }
  return content.skills?.find((s) => s.id === id)?.name ?? null;
}

function LayoutDialog({ open, onClose, draft, setDraft, templateId }) {
  const { content, layout } = draft;
  const order = resolveSectionOrder(content, layout);
  const hidden = new Set(layout.hiddenSections ?? []);
  const hiddenItems = (layout.hiddenItems ?? [])
    .map((id) => ({ id, name: entryName(content, id) }))
    .filter((x) => x.name !== null);
  const template = getTemplate(templateId);
  const patchLayout = (changes) => setDraft((d) => ({ ...d, layout: { ...d.layout, ...changes } }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Layout"
      description="Order and show or hide sections. Changes apply to this resume only."
    >
      <ul className="grid gap-1" aria-label="Sections">
        {order.map((key, i) => {
          const title = sectionTitle(content, key);
          const isHidden = hidden.has(key);
          if (notYetAdded(content, layout, key))
            return (
              <li
                key={key}
                className="flex items-center gap-2 rounded-md border border-dashed border-rule px-3 py-2"
              >
                <span className="flex-1 text-muted">{title}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDraft((d) => {
                      const out = addEntry(d.content, key);
                      return {
                        ...d,
                        content: out.content,
                        layout: {
                          ...d.layout,
                          sectionOrder: resolveSectionOrder(out.content, d.layout),
                        },
                      };
                    });
                    onClose();
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" /> Add to page
                </Button>
              </li>
            );
          return (
            <li
              key={key}
              className="flex items-center gap-2 rounded-md border border-rule px-3 py-2"
            >
              <span className={isHidden ? 'flex-1 text-faint line-through' : 'flex-1 text-ink'}>
                {title}
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label={isHidden ? `Show ${title}` : `Hide ${title}`}
                aria-pressed={isHidden}
                onClick={() =>
                  patchLayout({
                    hiddenSections: isHidden
                      ? [...hidden].filter((k) => k !== key)
                      : [...hidden, key],
                  })
                }
              >
                {isHidden ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Move ${title} up`}
                disabled={i === 0}
                onClick={() => patchLayout({ sectionOrder: moveItem(order, i, i - 1) })}
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Move ${title} down`}
                disabled={i === order.length - 1}
                onClick={() => patchLayout({ sectionOrder: moveItem(order, i, i + 1) })}
              >
                <ArrowDown className="size-4" aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>
      <Button
        variant="secondary"
        size="sm"
        className="justify-self-start"
        onClick={() => {
          setDraft((d) => {
            const out = addCustomSection(d.content, {
              ...d.layout,
              sectionOrder: resolveSectionOrder(d.content, d.layout),
            });
            return { ...d, content: out.content, layout: out.layout };
          });
          onClose();
        }}
      >
        <Plus className="size-4" aria-hidden="true" /> Add a custom section
      </Button>
      {template?.sideSections && (
        <p className="text-sm text-muted">
          In {template.name}, the order applies within each column. Choose which column a section
          uses in Design.
        </p>
      )}
      <section aria-labelledby="layout-photo">
        <h3 id="layout-photo" className="mb-2 text-sm font-semibold text-ink">
          Photo
        </h3>
        <ResumePhotoPanel template={template} layout={layout} patchLayout={patchLayout} />
      </section>
      {hiddenItems.length > 0 && (
        <section aria-labelledby="hidden-entries">
          <h3 id="hidden-entries" className="mb-2 text-sm font-semibold text-ink">
            Hidden entries
          </h3>
          <ul className="grid gap-1">
            {hiddenItems.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted">{x.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    patchLayout({ hiddenItems: layout.hiddenItems.filter((id) => id !== x.id) })
                  }
                >
                  Show
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Dialog>
  );
}

/**
 * Page view: the resume itself is the editor. A slim bar above it switches template, opens the
 * layout controls and the checks; everything else lives in the main editor toolbar.
 */
export function CanvasWorkspace({
  draft,
  setDraft,
  meta,
  onTemplateChange,
  photo,
  report,
  quality,
  profileChanges,
  onShowForm,
}) {
  const toast = useToast();
  const [dialog, setDialog] = useState(null);

  return (
    <div className="flex flex-1 flex-col bg-sunken/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-surface px-4 py-2 sm:px-6">
        <Button variant="secondary" size="sm" onClick={() => setDialog('templates')}>
          <LayoutTemplate className="size-4" aria-hidden="true" /> Templates
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setDialog('layout')}>
          <Rows3 className="size-4" aria-hidden="true" /> Layout
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setDialog('checks')}>
          <ListChecks className="size-4" aria-hidden="true" /> Checks ({report.counts.total})
        </Button>
        {profileChanges > 0 && (
          <button
            type="button"
            onClick={onShowForm}
            className="rounded-md bg-warn-soft px-2.5 py-1 text-sm text-ink hover:underline"
          >
            {profileChanges} {profileChanges === 1 ? 'difference' : 'differences'} from your master
            profile: review
          </button>
        )}
        <p className="ml-auto hidden text-xs text-muted lg:block">
          Click any text to edit. Enter adds a bullet; Backspace on an empty one removes it.
        </p>
      </div>

      <div className="flex-1 overflow-x-auto px-4 py-8">
        <CanvasEditor
          content={draft.content}
          layout={draft.layout}
          templateId={meta.templateId}
          pageSize={meta.pageSize}
          accentColor={meta.accentColor}
          pattern={meta.backgroundPattern}
          photo={photo}
          onTextEdit={(next, path) =>
            setDraft((d) => ({ ...d, content: next }), { coalesceKey: `canvas:${path}` })
          }
          onChange={({ content, layout }) =>
            setDraft((d) => ({
              ...d,
              ...(content ? { content } : {}),
              ...(layout ? { layout } : {}),
            }))
          }
          onNotice={(message) => toast.info(message)}
        />
      </div>

      <Dialog
        open={dialog === 'templates'}
        onClose={() => setDialog(null)}
        size="lg"
        title="Change template"
        description="Your content stays the same; only the design changes."
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <TemplateGrid
            compact
            cardLabel="Use"
            selectedId={meta.templateId}
            content={draft.content}
            photo={draft.layout.showPhoto ? photo : null}
            accentColor={meta.accentColor}
            pattern={meta.backgroundPattern}
            onCardClick={(t) => {
              onTemplateChange(t.id);
              setDialog(null);
            }}
          />
        </div>
      </Dialog>
      <LayoutDialog
        open={dialog === 'layout'}
        onClose={() => setDialog(null)}
        draft={draft}
        setDraft={setDraft}
        templateId={meta.templateId}
      />
      <Dialog open={dialog === 'checks'} onClose={() => setDialog(null)} size="lg" title="Checks">
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <QualityPanel
            report={report}
            onJump={(f) => {
              setDialog(null);
              quality.onJump(f);
            }}
            onFix={quality.onFix}
            onDismiss={quality.onDismiss}
            onRestore={quality.onRestore}
          />
        </div>
      </Dialog>
    </div>
  );
}
