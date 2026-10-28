import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { safeHref } from '@resumeos/shared/escape.js';

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const unescape = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m]);
const stripTags = (s) => unescape(s.replace(/<[^>]+>/g, ' '));

/** Compare text ignoring whitespace, case and Unicode presentation forms (e.g. ligatures). */
export const normalizeText = (s) => String(s).normalize('NFKC').toLowerCase().replace(/\s+/g, '');

/** What the rendered HTML says the PDF should contain, in reading order. */
export function expectationsFromHtml(html) {
  const name = stripTags(/<h1>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '').trim();
  const headings = [...html.matchAll(/<section data-section="[^"]*"><h2>([\s\S]*?)<\/h2>/g)].map(
    (m) => stripTags(m[1]).trim(),
  );
  const bullets = [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map((m) => stripTags(m[1]).trim())
    .filter(Boolean);
  const links = [
    ...new Set(
      [...html.matchAll(/<a href="([^"]+)"/g)].map((m) => safeHref(unescape(m[1]))).filter(Boolean),
    ),
  ];
  // Headings and bullets in document order: each bullet must extract under its own heading.
  const sequence = [
    ...html.replace(/<style>[\s\S]*?<\/style>/, '').matchAll(/<(h2|li)>([\s\S]*?)<\/\1>/g),
  ]
    .map((m) => ({ kind: m[1] === 'h2' ? 'heading' : 'bullet', text: stripTags(m[2]).trim() }))
    .filter((x) => x.text);
  return {
    sequence,
    name,
    headings,
    bullets,
    links,
    sourceText: stripTags(html),
  };
}

/** Parse a PDF buffer: per-page lines of text, link URLs and page count. */
export async function parsePdf(buffer) {
  const task = getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  });
  const lines = [];
  const links = [];
  try {
    const doc = await task.promise;
    for (let p = 1; p <= doc.numPages; p += 1) {
      const page = await doc.getPage(p);
      const { items } = await page.getTextContent();
      // Rebuild lines in content-stream order, as pdf.js and most extractors read text. A new
      // line starts when the baseline moves or text jumps back left; a space is inserted at
      // visible gaps. Grouping by height across the page instead would merge side-by-side
      // columns into one garbled line.
      let text = '';
      let prev = null;
      const flush = () => {
        const t = text.replace(/\s+/g, ' ').trim();
        if (t) lines.push({ page: p, text: t });
        text = '';
      };
      for (const item of items) {
        if (!('str' in item)) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        if (prev) {
          const newLine =
            Math.abs(y - prev.y) > Math.max(2, (item.height || prev.height) * 0.5) ||
            x < prev.end - 1;
          if (newLine) flush();
          else if (
            x - prev.end > Math.max(1, item.height * 0.15) &&
            !/\s$/.test(text) &&
            !/^\s/.test(item.str)
          )
            text += ' ';
        }
        text += item.str;
        if (item.str) prev = { y, end: x + item.width, height: item.height };
        if (item.hasEOL) {
          flush();
          prev = null;
        }
      }
      flush();
      for (const a of await page.getAnnotations())
        if (a.subtype === 'Link' && a.url) links.push(a.url);
    }
    return { pageCount: doc.numPages, lines, links };
  } finally {
    await task.destroy();
  }
}

const check = (id, label, result, detail) => ({ id, label, result, detail });
const PDF_METHOD = 'pdfjs text extraction and layout measurement in headless Chrome';

/**
 * Run export acceptance checks on a generated PDF. Every check is reported, including passes,
 * so the UI shows exactly what was tested.
 */
export async function validatePdf(buffer, { html, overflow }) {
  const checks = [];
  const isPdf = buffer.length > 800 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
  checks.push(
    check(
      'FILE_VALID',
      'File is a non-empty PDF',
      isPdf ? 'pass' : 'fail',
      isPdf ? `${Math.round(buffer.length / 1024)} KB` : 'The file is empty or not a PDF.',
    ),
  );
  if (!isPdf) return summarize(checks, null, PDF_METHOD);

  let parsed;
  try {
    parsed = await parsePdf(buffer);
    checks.push(
      check(
        'PARSES',
        'Opens in a PDF parser',
        'pass',
        `${parsed.pageCount} ${parsed.pageCount === 1 ? 'page' : 'pages'}`,
      ),
    );
  } catch (err) {
    checks.push(
      check(
        'PARSES',
        'Opens in a PDF parser',
        'fail',
        `The parser couldn't open the file (${err.name}).`,
      ),
    );
    return summarize(checks, null, PDF_METHOD);
  }

  checks.push(
    ...contentChecks({ lines: parsed.lines, links: parsed.links, html, formatLabel: 'PDF' }),
  );

  const overflowed = overflow?.pageOverflow || overflow?.offenders?.length;
  checks.push(
    overflowed
      ? check(
          'POSSIBLE_CONTENT_OVERFLOW',
          'Nothing runs off the page',
          'warn',
          `Content may extend past the right margin${overflow.offenders.length ? `: "${overflow.offenders.join('", "')}"` : ''}. Long unbroken text such as URLs is the usual cause.`,
        )
      : check(
          'POSSIBLE_CONTENT_OVERFLOW',
          'Nothing runs off the page',
          'pass',
          'No content wider than the printable area was detected.',
        ),
  );

  return summarize(checks, parsed, PDF_METHOD);
}

/**
 * Checks shared by every export format: extractable text, expected content, section order,
 * duplicates, placeholders and links. `lines` are extracted text lines; `links` are URLs found.
 */
export function contentChecks({ lines, links, html, formatLabel }) {
  const checks = [];
  const expected = expectationsFromHtml(html);
  const fullText = lines.map((l) => l.text).join('\n');
  const flat = normalizeText(fullText);

  checks.push(
    flat.length > 0
      ? check(
          'EXPORTED_TEXT_EMPTY',
          'Contains extractable text',
          'pass',
          `${fullText.length} characters extracted`,
        )
      : check(
          'EXPORTED_TEXT_EMPTY',
          'Contains extractable text',
          'fail',
          'No text could be extracted; applicant tracking systems would see a blank page.',
        ),
  );

  const missing = [];
  if (expected.name && !flat.includes(normalizeText(expected.name)))
    missing.push(`name "${expected.name}"`);
  for (const h of expected.headings)
    if (!flat.includes(normalizeText(h))) missing.push(`heading "${h}"`);
  const missingBullets = expected.bullets.filter((b) => !flat.includes(normalizeText(b)));
  for (const b of missingBullets.slice(0, 3))
    missing.push(`bullet "${b.slice(0, 60)}${b.length > 60 ? '…' : ''}"`);
  checks.push(
    missing.length
      ? check(
          'EXPECTED_TEXT',
          'Contains your resume text',
          'fail',
          `Not found in the extracted text: ${missing.join('; ')}${missingBullets.length > 3 ? ` and ${missingBullets.length - 3} more bullets` : ''}.`,
        )
      : check(
          'EXPECTED_TEXT',
          'Contains your resume text',
          'pass',
          `Name, ${expected.headings.length} section headings and ${expected.bullets.length} bullets found.`,
        ),
  );

  // Walk headings and bullets in document order through the extracted text. A bullet that
  // extracts before its heading, or a heading that comes before its own content, breaks the walk.
  let cursor = -1;
  let outOfOrder = null;
  for (const item of expected.sequence) {
    const at = flat.indexOf(normalizeText(item.text), cursor + 1);
    if (at < 0) {
      outOfOrder = item;
      break;
    }
    cursor = at;
  }
  checks.push(
    outOfOrder
      ? check(
          'EXPORT_TEXT_ORDER_WARNING',
          'Text extracts in reading order',
          'warn',
          outOfOrder.kind === 'heading'
            ? `The "${outOfOrder.text}" heading doesn't come after the previous section's text, so parsers may attach text to the wrong section.`
            : `"${outOfOrder.text.slice(0, 60)}${outOfOrder.text.length > 60 ? '…' : ''}" doesn't extract under its heading, so parsers may attach it to the wrong section.`,
        )
      : check(
          'EXPORT_TEXT_ORDER_WARNING',
          'Text extracts in reading order',
          'pass',
          `${expected.headings.join(' → ') || 'No sections'}, with every bullet under its heading.`,
        ),
  );

  const lineCounts = new Map();
  for (const l of lines)
    lineCounts.set(normalizeText(l.text), (lineCounts.get(normalizeText(l.text)) ?? 0) + 1);
  const duplicated = expected.headings.filter((h) => (lineCounts.get(normalizeText(h)) ?? 0) > 1);
  checks.push(
    duplicated.length
      ? check(
          'DUPLICATE_SECTION',
          'No duplicated sections',
          'warn',
          `These headings appear more than once: ${duplicated.join(', ')}.`,
        )
      : check('DUPLICATE_SECTION', 'No duplicated sections', 'pass', 'Each heading appears once.'),
  );

  const placeholders = ['undefined', '[object object]', 'lorem ipsum'].filter(
    (p) => fullText.toLowerCase().includes(p) && !expected.sourceText.toLowerCase().includes(p),
  );
  checks.push(
    placeholders.length
      ? check(
          'PLACEHOLDER_TEXT',
          'No placeholder text',
          'fail',
          `Found: ${placeholders.join(', ')}.`,
        )
      : check('PLACEHOLDER_TEXT', 'No placeholder text', 'pass', 'None found.'),
  );

  const found = new Set(links.map((u) => safeHref(u)).filter(Boolean));
  const lostLinks = expected.links.filter((u) => !found.has(u));
  checks.push(
    lostLinks.length
      ? check(
          'LINKS_PRESERVED',
          'Links are clickable',
          'warn',
          `${lostLinks.length} of ${expected.links.length} links aren't clickable in the ${formatLabel}: ${lostLinks.join(', ')}.`,
        )
      : check(
          'LINKS_PRESERVED',
          'Links are clickable',
          'pass',
          expected.links.length
            ? `${expected.links.length} links preserved.`
            : 'No links in this resume.',
        ),
  );

  return checks;
}

export function summarize(checks, parsed, method) {
  const status = checks.some((c) => c.result === 'fail')
    ? 'failed'
    : checks.some((c) => c.result === 'warn')
      ? 'warnings'
      : 'passed';
  return {
    status,
    checks,
    pageCount: parsed?.pageCount ?? null,
    checkedAt: new Date().toISOString(),
    method,
  };
}
