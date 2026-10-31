import { useEffect, useMemo, useRef, useState } from 'react';
import { getTemplate, DEFAULT_TEMPLATE_ID } from '@resumeos/shared/templates/index.js';
import { cx } from '../../lib/cx.js';
import { templateFontCss } from '../../lib/templateFonts.js';
import { PAGE_PX, documentHeight, pagesFor } from '../../lib/measurePages.js';

/**
 * Renders a template's HTML in a sandboxed iframe (no scripts) scaled to the container width.
 * The same renderer is used for PDF export, so this preview matches exported layout.
 */
export function TemplatePreview({
  content,
  layout,
  templateId = DEFAULT_TEMPLATE_ID,
  pageSize = 'A4',
  firstPageOnly = false,
  title,
  className,
  onPageCount,
  accentColor = null,
  pattern = 'none',
  photo = null,
  // Defer rendering until the preview scrolls near the viewport (for pages with many previews).
  lazy = false,
}) {
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [docHeight, setDocHeight] = useState(PAGE_PX[pageSize].h);
  const page = PAGE_PX[pageSize] ?? PAGE_PX.A4;

  const html = useMemo(() => {
    const template = getTemplate(templateId) ?? getTemplate(DEFAULT_TEMPLATE_ID);
    return template.render(content, layout, {
      pageSize,
      accentColor,
      pattern,
      photo,
      fontCss: templateFontCss(templateId, layout?.font),
    });
  }, [content, layout, templateId, pageSize, accentColor, pattern, photo]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const measure = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.documentElement) return;
    const height = Math.max(page.h, documentHeight(doc));
    setDocHeight(height);
    // Screen layout approximates print pagination; exact page breaks are checked at export.
    onPageCount?.(pagesFor(height, pageSize));
  };

  const scale = width ? width / page.w : 0;
  const shownHeight = firstPageOnly ? page.h : docHeight;

  return (
    <div
      ref={containerRef}
      className={cx('relative w-full overflow-hidden', className)}
      style={{ height: shownHeight * scale || undefined }}
    >
      {scale > 0 && (
        <iframe
          ref={frameRef}
          title={title ?? 'Resume preview'}
          srcDoc={html}
          // allow-same-origin (without allow-scripts) lets us measure height; no script can run.
          sandbox="allow-same-origin"
          loading={lazy ? 'lazy' : undefined}
          // A first-page crop of a longer resume mustn't show its own scrollbar.
          scrolling={firstPageOnly ? 'no' : undefined}
          onLoad={measure}
          tabIndex={-1}
          className="absolute top-0 left-0 origin-top-left border-0 bg-white"
          style={{ width: page.w, height: shownHeight, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}
