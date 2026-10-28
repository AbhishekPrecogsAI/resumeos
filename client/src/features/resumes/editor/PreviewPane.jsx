import { useState } from 'react';
import { AlertTriangle, Printer } from 'lucide-react';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { TemplatePreview } from '../../../components/preview/TemplatePreview.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { templateFontCss } from '../../../lib/templateFonts.js';
import { printHtml } from '../../../lib/print.js';

export function PreviewPane({ content, layout, templateId, pageSize }) {
  const [pages, setPages] = useState(1);
  const toast = useToast();

  const print = () => {
    const html = getTemplate(templateId).render(content, layout, {
      pageSize,
      fontCss: templateFontCss(templateId),
    });
    if (!printHtml(html))
      toast.error("Couldn't open the print preview", 'Allow pop-ups for this site and try again.');
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted" aria-live="polite">
          About {pages} {pages === 1 ? 'page' : 'pages'} (
          {pageSize === 'Letter' ? 'US Letter' : 'A4'})
        </p>
        <Button variant="ghost" size="sm" onClick={print}>
          <Printer className="size-4" aria-hidden="true" /> Print preview
        </Button>
      </div>
      {pages > 2 && (
        <p className="flex gap-2 rounded-md bg-warn-soft p-2.5 text-sm text-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden="true" />
          This runs past two pages. That's fine for some roles; consider hiding older entries if
          it's longer than you intend.
        </p>
      )}
      <div className="theme-light overflow-hidden rounded-sm shadow-paper">
        <TemplatePreview
          content={content}
          layout={layout}
          templateId={templateId}
          pageSize={pageSize}
          title="Live resume preview"
          onPageCount={setPages}
        />
      </div>
      <p className="text-xs text-faint">
        Preview uses the same renderer as export. Page breaks are approximate until you export.
      </p>
    </div>
  );
}
