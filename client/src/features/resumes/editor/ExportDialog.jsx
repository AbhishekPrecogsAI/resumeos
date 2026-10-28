import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, XCircle } from 'lucide-react';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { exportsApi } from '../../../api/exports.api.js';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { SelectField } from '../../../components/ui/Field.jsx';
import { FormAlert } from '../../../components/ui/FormAlert.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { formatRelative, formatDateTime } from '../../../lib/formatters.js';
import { cx } from '../../../lib/cx.js';

export const exportsKey = (resumeId) => ['exports', { resumeId }];

const FORMAT_LABEL = { pdf: 'PDF', docx: 'Word (DOCX)' };

const RESULT = {
  pass: { icon: CheckCircle2, className: 'text-added', label: 'Passed' },
  warn: { icon: AlertTriangle, className: 'text-warn', label: 'Warning' },
  fail: { icon: XCircle, className: 'text-danger', label: 'Failed' },
};

const STATUS_TEXT = {
  passed: { tone: 'added', label: 'All checks passed' },
  warnings: { tone: 'warn', label: 'Passed with warnings' },
  failed: { tone: 'danger', label: 'Checks failed' },
};

function newKey() {
  return globalThis.crypto.randomUUID().replace(/-/g, '');
}

export function ValidationReport({ validation }) {
  return (
    <div className="grid gap-2">
      <ul className="grid gap-2">
        {validation.checks.map((c) => {
          const r = RESULT[c.result];
          const Icon = r.icon;
          return (
            <li key={c.id} className="flex gap-2.5 text-sm">
              <Icon className={cx('mt-0.5 size-4 shrink-0', r.className)} aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium text-ink">
                  <span className="sr-only">{r.label}: </span>
                  {c.label}
                </p>
                <p className="break-words text-muted">{c.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-faint">
        Method: {validation.method}. These checks test this file; they can't predict how a
        particular applicant tracking system will read it.
      </p>
    </div>
  );
}

/**
 * Export flow: choose page size → generate on the server → show the validation results that were
 * actually run → download. The server renders the last saved draft, so pending edits are saved first.
 */
export function ExportDialog({ open, onClose, resume, meta, flush, saveStatus }) {
  const queryClient = useQueryClient();
  const [pageSize, setPageSize] = useState(meta.pageSize);
  const [result, setResult] = useState(null);
  const [key, setKey] = useState(newKey);
  const template = getTemplate(meta.templateId);
  const [format, setFormat] = useState('pdf');

  const history = useQuery({
    queryKey: exportsKey(resume.id),
    queryFn: () => exportsApi.list({ resumeId: resume.id, limit: 5 }),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: async () => {
      const saved = await flush();
      if (!saved)
        throw new Error(
          "Your latest edits couldn't be saved, so the export would be out of date. Fix the save problem and try again.",
        );
      return exportsApi.create(resume.id, { format, pageSize }, { idempotencyKey: key });
    },
    onSuccess: (record) => {
      setResult(record);
      setKey(newKey());
      queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
  });

  const close = () => {
    setResult(null);
    create.reset();
    onClose();
  };

  const status = result ? STATUS_TEXT[result.validation.status] : null;

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title="Export"
      description={`${meta.title}: ${template?.name ?? meta.templateId} template, version ${template?.version ?? '?'}. Exports the last saved draft.`}
    >
      {!result ? (
        <div className="grid gap-5">
          <FormAlert error={create.error} title="The export didn't complete" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Page size"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
            >
              <option value="A4">A4</option>
              <option value="Letter">US Letter</option>
            </SelectField>
            <SelectField
              label="Format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              hint={
                format === 'docx'
                  ? 'Plain, editable Word layout with the same content and order. It uses a standard system font, so it looks simpler than the PDF.'
                  : 'Matches the preview exactly.'
              }
            >
              <option value="pdf">PDF</option>
              <option value="docx">Word (DOCX)</option>
            </SelectField>
          </div>
          {saveStatus === 'conflict' && (
            <p className="text-sm text-warn">Resolve the editing conflict before exporting.</p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate()}
              loading={create.isPending}
              loadingLabel={`Generating ${FORMAT_LABEL[format]}`}
              disabled={saveStatus === 'conflict'}
            >
              {create.isPending
                ? 'Generating and checking…'
                : `Generate ${format === 'pdf' ? 'PDF' : 'DOCX'}`}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5">
          <div role="status" className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="text-sm text-muted">
              {FORMAT_LABEL[result.format] ?? 'PDF'},{' '}
              {result.pageCount
                ? `${result.pageCount} ${result.pageCount === 1 ? 'page' : 'pages'}, `
                : ''}
              {Math.max(1, Math.round(result.byteSize / 1024))} KB,{' '}
              {result.pageSize === 'Letter' ? 'US Letter' : 'A4'}
            </span>
          </div>
          <ValidationReport validation={result.validation} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setResult(null)}>
              Export again
            </Button>
            {result.downloadAvailable ? (
              <a
                href={exportsApi.downloadUrl(result.id)}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 font-medium text-on-accent hover:bg-accent-hover"
              >
                <Download className="size-4" aria-hidden="true" /> Download{' '}
                {result.format === 'docx' ? 'DOCX' : 'PDF'}
              </a>
            ) : (
              <p className="text-sm text-danger">
                This file failed its checks, so it isn't offered for download.
              </p>
            )}
          </div>
        </div>
      )}

      {history.data?.items?.length > 0 && (
        <section aria-labelledby="export-history" className="mt-2 border-t border-rule pt-4">
          <h3 id="export-history" className="text-sm font-semibold text-ink">
            Recent exports of this resume
          </h3>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {history.data.items.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted">
                  <time dateTime={x.createdAt} title={formatDateTime(x.createdAt)}>
                    {formatRelative(x.createdAt)}
                  </time>
                  , {x.format === 'docx' ? 'DOCX' : 'PDF'}, draft revision {x.draftRevision},{' '}
                  {x.pageSize === 'Letter' ? 'Letter' : 'A4'},{' '}
                  {STATUS_TEXT[x.validation.status].label.toLowerCase()}
                </span>
                {x.downloadAvailable ? (
                  <a
                    href={exportsApi.downloadUrl(x.id)}
                    className="font-medium text-accent underline underline-offset-2"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-faint">File expired</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-faint">
            Files are deleted after an hour; the record of what you exported stays.
          </p>
        </section>
      )}
    </Dialog>
  );
}
