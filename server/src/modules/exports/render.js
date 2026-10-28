import { getTemplate } from '@resumeos/shared/templates/index.js';
import { serverFontCss } from './fonts.js';
import { HttpError } from '../../utils/HttpError.js';

const PAGE_WIDTH_PX = { A4: 794, Letter: 816 };

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new HttpError(
              504,
              'EXPORT_TIMEOUT',
              'Generating the PDF took too long. Try again; if it keeps happening, shorten very long sections.',
            ),
          ),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Render resume content to PDF with headless Chrome, using the same template HTML as the
 * live preview. Also measures the laid-out page for content wider than the printable area.
 */
export async function renderPdf(pool, { content, layout, templateId, pageSize, timeoutMs }) {
  const template = getTemplate(templateId);
  if (!template)
    throw new HttpError(
      400,
      'UNKNOWN_TEMPLATE',
      'This resume uses a template that no longer exists.',
    );
  const html = template.render(content, layout, {
    pageSize,
    fontCss: serverFontCss(template.fonts),
  });

  const work = pool.withPage(async (page) => {
    await page.setViewportSize({
      width: PAGE_WIDTH_PX[pageSize] ?? PAGE_WIDTH_PX.A4,
      height: 1100,
    });
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth;
      const offenders = [];
      for (const el of document.body.querySelectorAll('*')) {
        const rect = el.getBoundingClientRect();
        if (rect.width && rect.right > limit + 1 && el.children.length === 0) {
          offenders.push((el.textContent || '').trim().slice(0, 80));
          if (offenders.length >= 5) break;
        }
      }
      return { pageOverflow: document.documentElement.scrollWidth > limit + 1, offenders };
    });
    const buffer = await page.pdf({
      format: pageSize === 'Letter' ? 'Letter' : 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
    });
    return { buffer, overflow };
  });

  const result = await withTimeout(work, timeoutMs);
  return { ...result, html };
}
