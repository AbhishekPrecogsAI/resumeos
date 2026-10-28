import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileDown,
  History,
  Save,
  Keyboard,
  Plus,
  Redo2,
  Trash2,
  Undo2,
} from 'lucide-react';
import { resolveSectionOrder, sectionTitle } from '@resumeos/shared/resumeModel.js';
import { compareWithProfile, pullFromProfile, acknowledgeProfile } from '@resumeos/shared/sync.js';
import { TEMPLATES, getTemplate } from '@resumeos/shared/templates/index.js';
import { AccentPicker } from '../../../components/editor/AccentPicker.jsx';
import { photoApi, PHOTO_KEY } from '../../../api/photo.api.js';
import { LIMITS } from '@resumeos/shared/limits.js';
import { resumesApi } from '../../../api/resumes.api.js';
import { profileApi } from '../../../api/profile.api.js';
import { useAutosave } from '../../../hooks/useAutosave.js';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard.jsx';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { LoadingState, ErrorState } from '../../../components/ui/States.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { SaveStatus } from '../../../components/editor/SaveStatus.jsx';
import { ConflictBanner } from '../../../components/editor/ConflictBanner.jsx';
import { EntryFields } from '../../../components/editor/EntryFields.jsx';
import { EntryListEditor } from '../../../components/editor/EntryListEditor.jsx';
import { TextField, Checkbox } from '../../../components/ui/Field.jsx';
import { ProfileSection } from '../../profile/ProfileSectionsEditor.jsx';
import {
  CONTACT_FIELDS,
  CUSTOM_ITEM_FIELDS,
  newCustomItem,
  newCustomSection,
} from '../../profile/sectionConfig.js';
import { PROFILE_KEY } from '../../profile/ProfilePage.jsx';
import { moveItem } from '../../../lib/array.js';
import { cx } from '../../../lib/cx.js';
import { RESUMES_KEY, resumeKey } from '../resumeQueries.js';
import { SectionNavigator } from './SectionNavigator.jsx';
import { ProfileSyncPanel } from './ProfileSyncPanel.jsx';
import { PreviewPane } from './PreviewPane.jsx';
import { ShortcutsDialog } from './ShortcutsDialog.jsx';
import { ExportDialog } from './ExportDialog.jsx';
import { QualityPanel } from './QualityPanel.jsx';
import { runQualityChecks } from '@resumeos/shared/quality/engine.js';
import { applyFix } from '@resumeos/shared/quality/fixes.js';
import { qualityApi } from '../../../api/resumes.api.js';
import { SaveVersionDialog } from '../versions/SaveVersionDialog.jsx';
import { versionsApi, versionsKey } from '../../../api/versions.api.js';
import { contentHash } from '@resumeos/shared/hash.js';

const RESUME_DELETE_MESSAGE =
  'This removes it from this resume only. Your master profile keeps it.';

/** Which navigator key a sync change belongs to. */
function navKeyFor(change) {
  if (change.section === 'headline' || change.section === 'summary') return 'summary';
  if (change.section === 'customSections') return `custom:${change.id}`;
  return change.section;
}

function isEditable(el) {
  return el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

function useEditorShortcuts({ undo, redo, flush, openHelp }) {
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        flush();
      } else if (mod && e.key.toLowerCase() === 'z' && !isEditable(document.activeElement)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y' && !isEditable(document.activeElement)) {
        e.preventDefault();
        redo();
      } else if (
        e.key === '?' &&
        !isEditable(document.activeElement) &&
        !document.querySelector('dialog[open]')
      ) {
        e.preventDefault();
        openHelp();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, flush, openHelp]);
}

function TitleInput({ value, onCommit }) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setText(value);
  }
  const commit = () => {
    const next = text.trim();
    if (!next) setText(value);
    else if (next !== value) onCommit(next);
  };
  return (
    <>
      <label htmlFor="resume-title" className="sr-only">
        Resume name
      </label>
      <input
        id="resume-title"
        value={text}
        maxLength={120}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-lg font-semibold text-ink hover:border-rule focus:border-rule-strong focus-visible:outline-2 focus-visible:outline-accent"
      />
    </>
  );
}

function CustomSectionEditor({ section, onChange, onDelete, renderHeaderExtra, isMuted }) {
  return (
    <div className="grid gap-5">
      <div className="flex items-end gap-3">
        <TextField
          className="flex-1"
          label="Section title"
          value={section.title}
          onChange={(e) =>
            onChange(
              { ...section, title: e.target.value },
              { coalesceKey: `sec:${section.id}:title` },
            )
          }
          hint="Shown as the heading on your resume."
        />
        <Button
          variant="ghost"
          onClick={onDelete}
          aria-label={`Delete section ${section.title || 'untitled'}`}
        >
          <Trash2 className="size-4" aria-hidden="true" /> Delete section
        </Button>
      </div>
      <EntryListEditor
        items={section.items}
        onChange={(items, opts) => onChange({ ...section, items }, opts)}
        noun="entry"
        emptyText="No entries in this section yet."
        deleteMessage={RESUME_DELETE_MESSAGE}
        describe={(i) => i.title}
        newItem={newCustomItem}
        fields={CUSTOM_ITEM_FIELDS}
        renderHeaderExtra={renderHeaderExtra}
        isMuted={isMuted}
      />
    </div>
  );
}

/** "Matches v3" / "Changes since v3", computed by hashing the local draft like the server does. */
function VersionIndicator({ resumeId, draft }) {
  const versions = useQuery({
    queryKey: versionsKey(resumeId),
    queryFn: () => versionsApi.list(resumeId, { limit: 50 }),
  });
  const hash = useMemo(
    () => contentHash({ content: draft.content, layout: draft.layout }),
    [draft.content, draft.layout],
  );
  if (!versions.data) return null;
  const current = versions.data.items.find((v) => v.id === versions.data.currentVersionId);
  if (!current)
    return <span className="hidden text-sm text-muted md:inline">No saved versions</span>;
  const matches = current.contentHash === hash;
  return (
    <Link
      to={
        matches
          ? `/app/resumes/${resumeId}/versions`
          : `/app/resumes/${resumeId}/compare/${current.id}/draft`
      }
      className="hidden text-sm text-muted underline-offset-2 hover:text-ink hover:underline md:inline"
    >
      {matches ? `Matches v${current.versionNumber}` : `Changes since v${current.versionNumber}`}
    </Link>
  );
}

function ResumeEditor({ resume, profile }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [meta, setMeta] = useState({
    title: resume.title,
    templateId: resume.templateId,
    pageSize: resume.pageSize,
    accentColor: resume.accentColor ?? null,
    targetRole: resume.targetRole,
  });
  const [selected, setSelected] = useState('contact');
  const [mobileTab, setMobileTab] = useState('edit');
  const [sidePanel, setSidePanel] = useState('preview');
  const [dismissals, setDismissals] = useState(resume.qualityDismissals ?? []);
  const [helpOpen, setHelpOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [saveVersionOpen, setSaveVersionOpen] = useState(false);
  const [pendingSectionDelete, setPendingSectionDelete] = useState(null);
  const [resolving, setResolving] = useState(false);
  useDocumentTitle(`Edit ${meta.title}`);

  const save = useCallback(
    async (revision, draft) => {
      const saved = await resumesApi.saveDraft(resume.id, revision, draft);
      queryClient.setQueryData(resumeKey(resume.id), saved);
      return { revision: saved.draftRevision };
    },
    [queryClient, resume.id],
  );

  const autosave = useAutosave({
    initialData: resume.draft,
    initialRevision: resume.draftRevision,
    save,
    history: true,
  });
  const guard = useUnsavedChangesGuard(autosave);
  const { content, layout, baselines } = autosave.data;
  const previewDraft = useDebouncedValue(autosave.data, 200);
  const photo = useQuery({ queryKey: PHOTO_KEY, queryFn: photoApi.get });
  const previewPhoto =
    previewDraft.layout.showPhoto && getTemplate(meta.templateId)?.photo
      ? (photo.data?.dataUrl ?? null)
      : null;
  const report = useMemo(
    () => runQualityChecks(previewDraft.content, previewDraft.layout, { dismissals }),
    [previewDraft.content, previewDraft.layout, dismissals],
  );
  const openHelp = useCallback(() => setHelpOpen(true), []);
  useEditorShortcuts({ undo: autosave.undo, redo: autosave.redo, flush: autosave.flush, openHelp });

  const setDraft = autosave.setData;
  const patchContent = (changes, opts) =>
    setDraft((d) => ({ ...d, content: { ...d.content, ...changes } }), opts);
  const patchLayout = (changes) => setDraft((d) => ({ ...d, layout: { ...d.layout, ...changes } }));

  const updateMeta = useMutation({
    mutationFn: (changes) => resumesApi.update(resume.id, changes),
    onMutate: (changes) => {
      const previous = meta;
      setMeta((m) => ({ ...m, ...changes }));
      return { previous };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RESUMES_KEY }),
    onError: (err, _changes, ctx) => {
      setMeta(ctx.previous);
      toast.error("Couldn't save that change", err.message);
    },
  });

  const order = resolveSectionOrder(content, layout);
  const hiddenItems = useMemo(() => new Set(layout.hiddenItems), [layout.hiddenItems]);
  const comparison = useMemo(
    () => compareWithProfile(content, profile.content, baselines),
    [content, profile.content, baselines],
  );
  const changes = useMemo(() => comparison.filter((c) => c.status !== 'customised'), [comparison]);
  const customised = useMemo(
    () => new Set(comparison.filter((c) => c.status === 'customised').map((c) => c.id)),
    [comparison],
  );
  const noticeCounts = useMemo(() => {
    const counts = {};
    for (const c of changes) counts[navKeyFor(c)] = (counts[navKeyFor(c)] ?? 0) + 1;
    return counts;
  }, [changes]);

  const pull = (change) => {
    setDraft((d) => {
      const next = pullFromProfile(d.content, profile.content, d.baselines, change);
      return { ...d, content: next.content, baselines: next.baselines };
    });
    toast.success('Updated from your profile', 'Use Undo if you change your mind.');
  };
  const keep = (change) =>
    setDraft((d) => ({
      ...d,
      baselines: acknowledgeProfile(d.baselines, profile.content, change),
    }));

  const toggleItem = (id) =>
    patchLayout({
      hiddenItems: hiddenItems.has(id)
        ? layout.hiddenItems.filter((x) => x !== id)
        : [...layout.hiddenItems, id],
    });

  const entryExtras = (item) => {
    const hidden = hiddenItems.has(item.id);
    const label = item.title || item.name || item.institution || 'entry';
    return (
      <span className="flex items-center gap-1">
        {customised.has(item.id) && <Badge className="hidden sm:inline-flex">Edited here</Badge>}
        <button
          type="button"
          aria-pressed={hidden}
          aria-label={hidden ? `Show ${label} on this resume` : `Hide ${label} from this resume`}
          title={hidden ? 'Hidden from this resume' : 'Shown on this resume'}
          onClick={() => toggleItem(item.id)}
          className="grid size-8 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
        >
          {hidden ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </span>
    );
  };

  const addCustomSection = () => {
    const section = newCustomSection();
    setDraft((d) => ({
      ...d,
      content: { ...d.content, customSections: [...d.content.customSections, section] },
      layout: {
        ...d.layout,
        sectionOrder: [...resolveSectionOrder(d.content, d.layout), `custom:${section.id}`],
      },
    }));
    setSelected(`custom:${section.id}`);
  };

  const deleteCustomSection = (id) => {
    setDraft((d) => ({
      ...d,
      content: {
        ...d.content,
        customSections: d.content.customSections.filter((s) => s.id !== id),
      },
      layout: {
        ...d.layout,
        sectionOrder: d.layout.sectionOrder.filter((k) => k !== `custom:${id}`),
        hiddenSections: d.layout.hiddenSections.filter((k) => k !== `custom:${id}`),
      },
    }));
    setSelected('contact');
    setPendingSectionDelete(null);
  };

  const reloadLatest = async () => {
    setResolving(true);
    try {
      const latest = await resumesApi.get(resume.id);
      queryClient.setQueryData(resumeKey(resume.id), latest);
      autosave.reset(latest.draft, latest.draftRevision);
      toast.info('Loaded the latest version of this resume');
    } catch (err) {
      toast.error("Couldn't load the latest version", err.message);
    } finally {
      setResolving(false);
    }
  };
  const keepMine = async () => {
    setResolving(true);
    try {
      const latest = await resumesApi.get(resume.id);
      if (await autosave.overwrite(latest.draftRevision)) toast.success('Your edits were saved');
    } catch (err) {
      toast.error("Couldn't save your edits", err.message);
    } finally {
      setResolving(false);
    }
  };

  const rightPanel = mobileTab === 'edit' ? sidePanel : mobileTab;

  const jumpTo = (finding) => {
    const key = finding.section === 'contact' ? 'contact' : finding.section;
    setSelected(key);
    setMobileTab('edit');
  };
  const fix = (finding) => {
    setDraft((d) => ({ ...d, content: applyFix(d.content, finding.fix) }));
    toast.success('Fixed', 'Use Undo if you change your mind.');
  };
  const dismiss = async (finding, reason) => {
    const previous = dismissals;
    setDismissals((list) => [
      ...list.filter((x) => x.key !== finding.key),
      { key: finding.key, ruleId: finding.ruleId, reason },
    ]);
    try {
      setDismissals(await qualityApi.dismiss(resume.id, { key: finding.key, reason }));
    } catch (err) {
      setDismissals(previous);
      toast.error("Couldn't dismiss that finding", err.message);
    }
  };
  const restoreFinding = async (finding) => {
    const previous = dismissals;
    setDismissals((list) => list.filter((x) => x.key !== finding.key));
    try {
      setDismissals(await qualityApi.restore(resume.id, finding.key));
    } catch (err) {
      setDismissals(previous);
      toast.error("Couldn't restore that finding", err.message);
    }
  };

  const selectedChanges = changes.filter((c) =>
    selected === 'contact' ? c.section === 'contact' : navKeyFor(c) === selected,
  );
  const customSection = selected.startsWith('custom:')
    ? content.customSections.find((s) => `custom:${s.id}` === selected)
    : null;
  const selectedTitle =
    selected === 'contact' ? 'Header and contact' : sectionTitle(content, selected);
  const sectionHidden = layout.hiddenSections.includes(selected);

  let editor;
  if (selected === 'contact') {
    editor = (
      <>
        {getTemplate(meta.templateId)?.photo && (
          <div className="mb-6 rounded-lg border border-rule bg-surface p-4">
            <Checkbox
              label="Show my photo on this resume"
              hint={
                photo.data
                  ? 'Many employers in the US, UK and Canada prefer resumes without photos; applicant tracking systems ignore them.'
                  : 'Upload a photo in your master profile (Contact) first.'
              }
              checked={Boolean(layout.showPhoto)}
              disabled={!photo.data && !layout.showPhoto}
              onChange={(e) => patchLayout({ showPhoto: e.target.checked })}
            />
            {!photo.data && (
              <Link
                to="/app/profile#contact"
                className="mt-2 inline-block text-sm text-accent underline underline-offset-2"
              >
                Add a photo to your profile
              </Link>
            )}
          </div>
        )}
        <EntryFields
          fields={CONTACT_FIELDS}
          value={content.contact}
          idPrefix="contact"
          onChange={(contact, opts) => patchContent({ contact }, opts)}
        />
      </>
    );
  } else if (customSection) {
    editor = (
      <CustomSectionEditor
        section={customSection}
        onChange={(next, opts) =>
          patchContent(
            { customSections: content.customSections.map((s) => (s.id === next.id ? next : s)) },
            opts,
          )
        }
        onDelete={() => setPendingSectionDelete(customSection)}
        renderHeaderExtra={entryExtras}
        isMuted={(item) => hiddenItems.has(item.id)}
      />
    );
  } else {
    editor = (
      <ProfileSection
        id={selected}
        content={content}
        onChange={patchContent}
        evidenceItems={profile.content.evidenceItems ?? []}
        deleteMessage={RESUME_DELETE_MESSAGE}
        renderHeaderExtra={entryExtras}
        isMuted={(item) => hiddenItems.has(item.id)}
      />
    );
  }

  const navigator = (
    <>
      <SectionNavigator
        content={content}
        order={order}
        hiddenSections={layout.hiddenSections}
        selected={selected}
        onSelect={(key) => {
          setSelected(key);
          setMobileTab('edit');
          setNavOpen(false);
        }}
        onMove={(from, to) => patchLayout({ sectionOrder: moveItem(order, from, to) })}
        onToggleVisible={(key) =>
          patchLayout({
            hiddenSections: layout.hiddenSections.includes(key)
              ? layout.hiddenSections.filter((k) => k !== key)
              : [...layout.hiddenSections, key],
          })
        }
        noticeCounts={noticeCounts}
      />
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 ml-6"
        onClick={addCustomSection}
        disabled={content.customSections.length >= LIMITS.customSections}
      >
        <Plus className="size-4" aria-hidden="true" /> Add custom section
      </Button>
      {changes.length > 0 && (
        <p className="mt-4 rounded-md bg-sunken px-3 py-2 text-xs text-muted">
          {changes.length} {changes.length === 1 ? 'difference' : 'differences'} from your master
          profile. Numbers next to sections show where.
        </p>
      )}
    </>
  );

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      {guard}
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 border-b border-rule bg-canvas/95 px-4 py-2 backdrop-blur sm:px-6">
        <Link
          to="/app/resumes"
          aria-label="Back to resumes"
          className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <TitleInput value={meta.title} onCommit={(title) => updateMeta.mutate({ title })} />
        <SaveStatus
          status={autosave.status}
          lastSavedAt={autosave.lastSavedAt}
          onRetry={autosave.retry}
        />
        <VersionIndicator resumeId={resume.id} draft={autosave.data} />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={autosave.undo}
            disabled={!autosave.canUndo}
            aria-label="Undo"
            title="Undo"
          >
            <Undo2 className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={autosave.redo}
            disabled={!autosave.canRedo}
            aria-label="Redo"
            title="Redo"
          >
            <Redo2 className="size-4" aria-hidden="true" />
          </Button>
          <label htmlFor="resume-template" className="sr-only">
            Template
          </label>
          <select
            id="resume-template"
            value={meta.templateId}
            onChange={(e) => updateMeta.mutate({ templateId: e.target.value })}
            className="h-9 rounded-md border border-rule-strong bg-surface px-2 text-sm text-ink"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <label htmlFor="resume-page-size" className="sr-only">
            Page size
          </label>
          <select
            id="resume-page-size"
            value={meta.pageSize}
            onChange={(e) => updateMeta.mutate({ pageSize: e.target.value })}
            className="h-9 rounded-md border border-rule-strong bg-surface px-2 text-sm text-ink"
          >
            <option value="A4">A4</option>
            <option value="Letter">US Letter</option>
          </select>
          {getTemplate(meta.templateId)?.accent && (
            <AccentPicker
              value={meta.accentColor}
              defaultAccent={getTemplate(meta.templateId).accent.default}
              onChange={(accentColor) => updateMeta.mutate({ accentColor })}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={openHelp}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setSaveVersionOpen(true)}>
            <Save className="size-4" aria-hidden="true" /> Save version
          </Button>
          <Link
            to={`/app/resumes/${resume.id}/versions`}
            aria-label="Version history"
            title="Version history"
            className="grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
          >
            <History className="size-4" aria-hidden="true" />
          </Link>
          <Button size="sm" onClick={() => setExportOpen(true)}>
            <FileDown className="size-4" aria-hidden="true" /> Export
          </Button>
        </div>
      </div>

      {autosave.status === 'conflict' && (
        <div className="px-4 pt-4 sm:px-6">
          <ConflictBanner
            what="This resume"
            onReload={reloadLatest}
            onOverwrite={keepMine}
            busy={resolving}
          />
        </div>
      )}
      {autosave.status === 'error' && autosave.error?.code === 'VALIDATION_FAILED' && (
        <div
          role="alert"
          className="mx-4 mt-4 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-ink sm:mx-6"
        >
          <p className="font-medium">Some fields need attention before this can save:</p>
          <ul className="mt-1 list-disc pl-5">
            {(autosave.error.details?.fields ?? []).slice(0, 6).map((f) => (
              <li key={f.path}>
                {f.path}: {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Editor view"
        className="flex gap-1 border-b border-rule px-4 xl:hidden"
      >
        {['edit', 'preview', 'checks'].map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={cx(
              '-mb-px border-b-2 px-3 py-2 text-sm',
              mobileTab === tab
                ? 'border-accent font-medium text-ink'
                : 'border-transparent text-muted',
            )}
          >
            {tab === 'edit'
              ? 'Edit'
              : tab === 'preview'
                ? 'Preview'
                : `Checks (${report.counts.total})`}
          </button>
        ))}
      </div>

      <div className="grid flex-1 xl:grid-cols-[16rem_minmax(0,1fr)_minmax(0,34rem)] lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside
          className={cx(
            'border-rule px-3 py-5 lg:border-r',
            mobileTab === 'edit' ? 'block' : 'hidden xl:block',
          )}
        >
          <button
            type="button"
            aria-expanded={navOpen}
            aria-controls="resume-section-nav"
            onClick={() => setNavOpen((v) => !v)}
            className="w-full rounded-md px-2 py-2 text-left text-sm font-medium text-ink hover:bg-sunken lg:hidden"
          >
            Sections: {selectedTitle}
          </button>
          {/* Rendered once; collapsible below the lg breakpoint. */}
          <div
            id="resume-section-nav"
            className={cx('mt-2 lg:mt-0 lg:block', navOpen ? 'block' : 'hidden')}
          >
            {navigator}
          </div>
        </aside>

        <section
          aria-labelledby="section-heading"
          className={cx(
            'min-w-0 px-4 py-6 sm:px-6',
            mobileTab === 'edit' ? 'block' : 'hidden xl:block',
          )}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="section-heading" className="text-lg font-semibold text-ink">
              {selectedTitle}
            </h2>
            {sectionHidden && <Badge>Hidden from this resume</Badge>}
          </div>
          <ProfileSyncPanel changes={selectedChanges} onPull={pull} onKeep={keep} />
          {editor}
        </section>

        <section
          aria-label={rightPanel === 'checks' ? 'Quality checks' : 'Preview'}
          className={cx(
            'min-w-0 border-rule bg-sunken/40 px-4 py-6 sm:px-6 xl:border-l',
            mobileTab !== 'edit' ? 'block lg:col-span-2 xl:col-span-1' : 'hidden xl:block',
          )}
        >
          <div
            role="tablist"
            aria-label="Side panel"
            className="mb-4 hidden gap-1 border-b border-rule xl:flex"
          >
            {[
              ['preview', 'Preview'],
              ['checks', `Checks (${report.counts.total})`],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={rightPanel === value}
                onClick={() => {
                  setSidePanel(value);
                  if (mobileTab !== 'edit') setMobileTab(value);
                }}
                className={cx(
                  '-mb-px border-b-2 px-3 py-2 text-sm',
                  rightPanel === value
                    ? 'border-accent font-medium text-ink'
                    : 'border-transparent text-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {rightPanel === 'checks' ? (
            <QualityPanel
              report={report}
              onJump={jumpTo}
              onFix={fix}
              onDismiss={dismiss}
              onRestore={restoreFinding}
            />
          ) : (
            <div className="xl:sticky xl:top-32">
              <PreviewPane
                content={previewDraft.content}
                layout={previewDraft.layout}
                templateId={meta.templateId}
                pageSize={meta.pageSize}
                accentColor={meta.accentColor}
                photo={previewPhoto}
              />
            </div>
          )}
        </section>
      </div>

      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SaveVersionDialog
        open={saveVersionOpen}
        onClose={() => setSaveVersionOpen(false)}
        resumeId={resume.id}
        flush={autosave.flush}
      />
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        resume={resume}
        meta={meta}
        flush={autosave.flush}
        saveStatus={autosave.status}
      />
      <Dialog
        open={Boolean(pendingSectionDelete)}
        onClose={() => setPendingSectionDelete(null)}
        size="sm"
        title={`Delete "${pendingSectionDelete?.title || 'Untitled section'}"?`}
        description="The section and its entries are removed from this resume. Your master profile isn't changed. You can undo this."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingSectionDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteCustomSection(pendingSectionDelete.id)}>
              Delete section
            </Button>
          </>
        }
      />
    </div>
  );
}

export function ResumeEditorPage() {
  const { resumeId } = useParams();
  const resume = useQuery({
    queryKey: resumeKey(resumeId),
    queryFn: ({ signal }) => resumesApi.get(resumeId, { signal }),
    staleTime: Infinity,
    refetchOnMount: 'always',
  });
  const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: profileApi.get });

  if (resume.isPending || (!resume.isFetchedAfterMount && resume.isFetching) || profile.isPending)
    return <LoadingState label="Loading the editor" />;
  if (resume.isError) {
    const missing = resume.error?.status === 404;
    return (
      <ErrorState
        title={missing ? 'Resume not found' : "Couldn't load this resume"}
        error={
          missing
            ? { message: 'It may have been deleted, or it belongs to another account.' }
            : resume.error
        }
        onRetry={missing ? undefined : resume.refetch}
      />
    );
  }
  if (profile.isError)
    return (
      <ErrorState
        title="Couldn't load your profile"
        error={profile.error}
        onRetry={profile.refetch}
      />
    );
  return <ResumeEditor key={resume.data.id} resume={resume.data} profile={profile.data} />;
}
