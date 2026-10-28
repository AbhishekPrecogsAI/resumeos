import mammoth from 'mammoth';
import { contentChecks, summarize } from './validate.js';

const METHOD =
  "mammoth text and structure extraction. Word reflows text, so page count and overflow aren't measured for DOCX";

/** Reopen a generated DOCX and run the same content checks as PDF exports. */
export async function validateDocx(buffer, { html }) {
  const checks = [];
  const isZip = buffer.length > 1000 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  checks.push({
    id: 'FILE_VALID',
    label: 'File is a non-empty Word document',
    result: isZip ? 'pass' : 'fail',
    detail: isZip
      ? `${Math.round(buffer.length / 1024)} KB`
      : 'The file is empty or not a DOCX package.',
  });
  if (!isZip) return summarize(checks, null, METHOD);

  let raw;
  let structured;
  try {
    [raw, structured] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }),
    ]);
    checks.push({
      id: 'PARSES',
      label: 'Opens in a DOCX parser',
      result: 'pass',
      detail: `${(structured.value.match(/<h1>/g) ?? []).length} headings found`,
    });
  } catch (err) {
    checks.push({
      id: 'PARSES',
      label: 'Opens in a DOCX parser',
      result: 'fail',
      detail: `The parser couldn't open the file (${err.name}).`,
    });
    return summarize(checks, null, METHOD);
  }

  const lines = raw.value
    .split(/\n+/)
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((text) => ({ page: null, text }));
  const links = [...structured.value.matchAll(/<a href="([^"]+)"/g)].map((m) =>
    m[1].replace(/&amp;/g, '&'),
  );
  checks.push(...contentChecks({ lines, links, html, formatLabel: 'Word document' }));
  return summarize(checks, null, METHOD);
}
