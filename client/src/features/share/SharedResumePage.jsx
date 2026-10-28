import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, LinkIcon } from 'lucide-react';
import { sharesApi } from '../../api/shares.api.js';
import { TemplatePreview } from '../../components/preview/TemplatePreview.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { LoadingState } from '../../components/ui/States.jsx';
import { LogoMark } from '../../components/layout/Logo.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { formatRelative } from '../../lib/formatters.js';

/** Shared resumes are personal: ask search engines not to index this page while it's open. */
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.append(meta);
    return () => meta.remove();
  }, []);
}

async function downloadPdf(token, name) {
  const res = await fetch(sharesApi.pdfUrl(token));
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message ?? `The PDF couldn't be downloaded (${res.status}).`);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(name || 'resume').replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'resume'} resume.pdf`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Unavailable({ error }) {
  const expired = error?.code === 'SHARE_EXPIRED';
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <LinkIcon className="mx-auto size-8 text-faint" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        {expired ? 'This link has expired' : "This link isn't active"}
      </h1>
      <p className="mt-3 text-muted">
        {error?.status === 0
          ? error.message
          : 'The person who shared it may have turned it off or deleted it. Ask them for a new link.'}
      </p>
    </div>
  );
}

/** What someone opening a share link sees: the resume, read-only, and a download if allowed. */
export function SharedResumePage() {
  const { token } = useParams();
  const toast = useToast();
  const [pages, setPages] = useState(1);
  useNoIndex();

  const view = useQuery({
    queryKey: ['shared', token],
    queryFn: () => sharesApi.view(token),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const r = view.data;
  useDocumentTitle(r ? `${r.name}'s resume` : 'Shared resume');

  const download = useMutation({
    mutationFn: () => downloadPdf(token, r?.name),
    onError: (err) => toast.error("Couldn't download the PDF", err.message),
  });

  return (
    <div className="flex min-h-dvh flex-col bg-sunken">
      <header className="sticky top-0 z-10 border-b border-rule bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[880px] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">{r?.name ?? 'Shared resume'}</p>
            {r?.headline && <p className="truncate text-sm text-muted">{r.headline}</p>}
          </div>
          {r?.allowDownload && (
            <Button
              size="sm"
              onClick={() => download.mutate()}
              loading={download.isPending}
              loadingLabel="Preparing PDF"
            >
              <Download className="size-4" aria-hidden="true" /> Download PDF
            </Button>
          )}
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="flex-1 px-3 py-6 focus:outline-none sm:px-6 sm:py-10"
      >
        {view.isPending ? (
          <LoadingState label="Loading resume" />
        ) : view.isError ? (
          <Unavailable error={view.error} />
        ) : (
          <div className="mx-auto max-w-[832px]">
            <div className="theme-light overflow-hidden rounded-sm bg-white shadow-paper">
              <TemplatePreview
                content={r.content}
                layout={r.layout}
                templateId={r.templateId}
                pageSize={r.pageSize}
                accentColor={r.accentColor}
                pattern={r.backgroundPattern}
                photo={r.photo}
                title={`${r.name}'s resume`}
                onPageCount={setPages}
              />
            </div>
            <p className="mt-4 text-center text-xs text-faint">
              {pages} {pages === 1 ? 'page' : 'pages'} · Updated {formatRelative(r.updatedAt)}
              {r.expiresAt && ` · Link expires ${formatRelative(r.expiresAt)}`}
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-rule bg-surface py-4">
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
          <LogoMark className="size-4" /> Shared with{' '}
          <Link to="/" className="font-medium text-ink underline-offset-2 hover:underline">
            ResumeOS
          </Link>
        </p>
      </footer>
    </div>
  );
}
