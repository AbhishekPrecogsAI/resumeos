import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ExternalLink, Link2, Trash2 } from 'lucide-react';
import { sharesApi, sharesKey, shareUrl } from '../../../api/shares.api.js';
import { versionsApi, versionsKey } from '../../../api/versions.api.js';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Checkbox, SelectField, TextField } from '../../../components/ui/Field.jsx';
import { FormAlert } from '../../../components/ui/FormAlert.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { formatRelative } from '../../../lib/formatters.js';
import { fieldErrors } from '../../../api/client.js';

const EXPIRY_OPTIONS = [
  { value: '', label: 'Never' },
  { value: '7', label: 'In 7 days' },
  { value: '30', label: 'In 30 days' },
  { value: '90', label: 'In 90 days' },
];

const EMPTY_FORM = {
  label: '',
  versionId: '',
  allowDownload: true,
  hideContactDetails: false,
  expiresInDays: '',
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ShareStatus({ share }) {
  if (!share.enabled) return <Badge tone="neutral">Turned off</Badge>;
  if (share.expired) return <Badge tone="danger">Expired</Badge>;
  if (share.versionMissing) return <Badge tone="danger">Version deleted</Badge>;
  return <Badge tone="added">Active</Badge>;
}

function ShareRow({ resumeId, share, highlight }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const url = shareUrl(share);
  const refresh = () => queryClient.invalidateQueries({ queryKey: sharesKey(resumeId) });

  const update = useMutation({
    mutationFn: (changes) => sharesApi.update(resumeId, share.id, changes),
    onSuccess: refresh,
    onError: (err) => toast.error("Couldn't update the link", err.message),
  });
  const remove = useMutation({
    mutationFn: () => sharesApi.remove(resumeId, share.id),
    onSuccess: () => {
      refresh();
      toast.success('Link deleted', 'Anyone opening it now sees that it isn’t active.');
    },
    onError: (err) => toast.error("Couldn't delete the link", err.message),
  });

  const copy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Couldn't copy", 'Select the link and copy it yourself.');
    }
  };

  return (
    <li
      className={
        highlight
          ? 'rounded-lg border-2 border-accent bg-surface p-3'
          : 'rounded-lg border border-rule bg-surface p-3'
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto font-medium text-ink">{share.label || 'Untitled link'}</p>
        <ShareStatus share={share} />
      </div>
      <div className="mt-2 flex gap-2">
        <input
          readOnly
          value={url}
          aria-label={`Link for ${share.label || 'untitled link'}`}
          onFocus={(e) => e.target.select()}
          className="h-9 min-w-0 flex-1 rounded-md border border-rule-strong bg-sunken px-2 font-mono text-xs text-ink"
        />
        <Button variant="secondary" size="sm" onClick={copy}>
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open link in a new tab"
          title="Open link in a new tab"
          className="grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
      <p className="mt-2 text-sm text-muted">
        {share.versionId
          ? `Shows ${share.versionLabel ?? 'a saved version'}`
          : 'Shows this resume as you edit it'}
        {' · '}
        {share.expiresAt
          ? `${share.expired ? 'Expired' : 'Expires'} ${formatRelative(share.expiresAt)}`
          : 'Never expires'}
        {' · '}
        {share.viewCount === 0
          ? 'Not opened yet'
          : `Opened ${share.viewCount} ${share.viewCount === 1 ? 'time' : 'times'}, last ${formatRelative(share.lastViewedAt)}`}
        {share.downloadCount > 0 &&
          ` · Downloaded ${share.downloadCount} ${share.downloadCount === 1 ? 'time' : 'times'}`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Checkbox
          label="Allow PDF download"
          checked={share.allowDownload}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ allowDownload: e.target.checked })}
        />
        <Checkbox
          label="Hide email and phone"
          checked={share.hideContactDetails}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ hideContactDetails: e.target.checked })}
        />
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            loading={update.isPending}
            onClick={() => update.mutate({ enabled: !share.enabled })}
          >
            {share.enabled ? 'Turn off' : 'Turn on'}
          </Button>
          {confirmDelete ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={remove.isPending}
                loadingLabel="Deleting link"
                onClick={() => remove.mutate()}
              >
                Delete link
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" aria-hidden="true" /> Delete
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Create and manage read-only links to this resume. Each link has its own options, so the owner
 * can give one recruiter a downloadable copy and post another with contact details hidden.
 */
export function ShareDialog({ open, onClose, resumeId, flush }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [newId, setNewId] = useState(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const shares = useQuery({
    queryKey: sharesKey(resumeId),
    queryFn: () => sharesApi.list(resumeId),
    enabled: open,
  });
  const versions = useQuery({
    queryKey: versionsKey(resumeId),
    queryFn: () => versionsApi.list(resumeId),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: async () => {
      // A live link shows the saved draft, so save any pending edits first.
      if (!form.versionId && flush && !(await flush()))
        throw new Error(
          "Your latest edits couldn't be saved, so the link would show an older copy. Fix the save problem and try again.",
        );
      return sharesApi.create(resumeId, {
        label: form.label.trim(),
        versionId: form.versionId || null,
        allowDownload: form.allowDownload,
        hideContactDetails: form.hideContactDetails,
        expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : null,
      });
    },
    onSuccess: async (share) => {
      setNewId(share.id);
      setForm(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: sharesKey(resumeId) });
      const copied = await copyText(shareUrl(share));
      toast.success('Link created', copied ? 'It’s copied to your clipboard.' : undefined);
    },
  });
  const errors = create.error ? fieldErrors(create.error) : {};
  const formError = create.error && !Object.keys(errors).length ? create.error : null;

  const close = () => {
    setNewId(null);
    create.reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      size="lg"
      title="Share this resume"
      description="Anyone with a link can view the resume. They can't edit it or see anything you've hidden."
    >
      <form
        noValidate
        className="grid gap-4 rounded-lg border border-rule bg-sunken/50 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <FormAlert error={formError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Who is it for?"
            hint="Only you see this name."
            placeholder="Recruiter at Acme"
            maxLength={60}
            value={form.label}
            onChange={(e) => set({ label: e.target.value })}
            error={errors.label}
          />
          <SelectField
            label="Link expires"
            value={form.expiresInDays}
            onChange={(e) => set({ expiresInDays: e.target.value })}
            error={errors.expiresInDays}
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>
        <SelectField
          label="What they see"
          value={form.versionId}
          onChange={(e) => set({ versionId: e.target.value })}
          error={errors.versionId}
          hint={
            form.versionId
              ? 'This saved version stays exactly as it is, whatever you change later.'
              : 'The link updates as you edit, so they always see your latest changes.'
          }
        >
          <option value="">This resume, kept up to date</option>
          {(versions.data?.items ?? []).map((v) => (
            <option key={v.id} value={v.id}>
              Saved version v{v.versionNumber}: {v.name}
            </option>
          ))}
        </SelectField>
        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox
            label="Allow PDF download"
            hint="Viewers get a Download PDF button."
            checked={form.allowDownload}
            onChange={(e) => set({ allowDownload: e.target.checked })}
          />
          <Checkbox
            label="Hide email and phone"
            hint="For links you post publicly. Name, location and links still show."
            checked={form.hideContactDetails}
            onChange={(e) => set({ hideContactDetails: e.target.checked })}
          />
        </div>
        <div>
          <Button type="submit" loading={create.isPending} loadingLabel="Creating link">
            <Link2 className="size-4" aria-hidden="true" /> Create link
          </Button>
        </div>
      </form>

      <section aria-labelledby="share-links" className="mt-6">
        <h3 id="share-links" className="mb-2 text-sm font-semibold text-ink">
          Your links {shares.data?.length ? `(${shares.data.length})` : ''}
        </h3>
        {shares.isPending ? (
          <p className="text-sm text-muted">Loading links…</p>
        ) : shares.isError ? (
          <FormAlert error={shares.error} />
        ) : shares.data.length === 0 ? (
          <p className="text-sm text-muted">
            No links yet. Create one above, then paste it into an email or message.
          </p>
        ) : (
          <ul className="grid gap-3">
            {shares.data.map((s) => (
              <ShareRow key={s.id} resumeId={resumeId} share={s} highlight={s.id === newId} />
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-faint">
          Opens are counted each time the page loads, including your own visits. Shared pages ask
          search engines not to index them.
        </p>
      </section>
    </Dialog>
  );
}
