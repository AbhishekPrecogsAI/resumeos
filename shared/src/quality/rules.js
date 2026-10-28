import { compareMonths, parseMonth, formatMonth } from '../dates.js';
import { safeHref } from '../escape.js';
import {
  words,
  normalizeForCompare,
  normalizeLoose,
  excerpt,
  firstWord,
  hasMetric,
} from './text.js';
import { finding, entryLocation, bulletLocation } from './model.js';

const LONG_BULLET_WORDS = 40;
const LONG_BULLET_CHARS = 300;
const LONG_RESUME_WORDS = 1100;
const UNBROKEN_TOKEN = 60;

const monthNow = (today) =>
  `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;

/** Convert date-only values to a comparable month index, treating "current" as now. */
function span(entry, today) {
  const start = parseMonth(entry.startDate);
  if (!start) return null;
  const endValue = entry.current ? monthNow(today) : entry.endDate;
  const end = parseMonth(endValue);
  if (!end) return null;
  return { from: start.year * 12 + (start.month ?? 1), to: end.year * 12 + (end.month ?? 12) };
}

export const RULES = [
  {
    id: 'EMPTY_REQUIRED_SECTION',
    category: 'completeness',
    severity: 'error',
    title: 'Missing name',
    description: 'The header has a name.',
    whyItMatters:
      'Without a name the reader, or a parser, has no way to tell whose resume this is.',
    limitations: 'Only checks that the name field isn’t blank.',
    check: (m, content, ctx, self) =>
      content.contact?.name?.trim()
        ? []
        : [
            finding(self, {
              location: 'Header',
              section: 'contact',
              field: 'name',
              message: 'The resume has no name.',
              suggestion: 'Add your name in Header and contact.',
            }),
          ],
  },
  {
    id: 'INVALID_OR_MISSING_CONTACT_LINK',
    category: 'completeness',
    severity: 'warning',
    title: 'No way to contact you',
    description: 'The header includes an email address or at least one link.',
    whyItMatters: 'Recruiters need a way to reach you; an email is the most expected.',
    limitations: "Doesn't verify that the address or link actually works.",
    check: (m, content, ctx, self) => {
      const c = content.contact ?? {};
      const out = [];
      if (!c.email?.trim()) {
        const hasLink = ['website', 'linkedin', 'github', 'portfolio'].some((k) => c[k]?.trim());
        out.push(
          finding(self, {
            severity: hasLink ? 'info' : 'warning',
            location: 'Header',
            section: 'contact',
            field: 'email',
            message: hasLink
              ? 'There is no email address, only links.'
              : 'There is no email address or link.',
            suggestion: 'Add an email address in Header and contact.',
          }),
        );
      }
      return out;
    },
  },
  {
    id: 'LINK_FORMAT_INVALID',
    category: 'integrity',
    severity: 'warning',
    title: 'Link may not work',
    description: 'Links are full web addresses with a domain.',
    whyItMatters: "Links that aren't full addresses don't become clickable in the PDF.",
    limitations: 'Checks the format only; it never visits the link.',
    check: (m, content, ctx, self) => {
      const out = [];
      const test = (value, location, section, entryId, field) => {
        if (!value?.trim()) return;
        const href = safeHref(value);
        const host = href ? new URL(href).hostname : '';
        if (!href || !host.includes('.')) {
          out.push(
            finding(self, {
              location,
              section,
              entryId,
              field,
              excerpt: excerpt(value),
              keyParts: [value],
              message: `"${excerpt(value, 60)}" isn't a complete web address.`,
              suggestion: 'Use the full address, starting with https:// and including the domain.',
            }),
          );
        }
      };
      for (const k of ['website', 'linkedin', 'github', 'portfolio'])
        test(content.contact?.[k], `Header: ${k}`, 'contact', null, k);
      for (const e of m.entries)
        for (const k of ['url', 'repositoryUrl'])
          test(e.entry[k], entryLocation(e), e.section, e.entry.id, k);
      return out;
    },
  },
  {
    id: 'DATE_ORDER_INVALID',
    category: 'consistency',
    severity: 'error',
    title: 'Dates out of order',
    description:
      'End dates come after start dates; start dates aren’t in the future; current roles have no end date.',
    whyItMatters:
      'Impossible dates look like typos and undermine trust in the rest of the document.',
    limitations: 'Year-only dates are compared at year precision.',
    check: (m, content, { today }, self) => {
      const out = [];
      for (const e of m.entries) {
        const { startDate, endDate, current } = e.entry;
        if (startDate && endDate && !current && compareMonths(endDate, startDate) < 0) {
          out.push(
            finding(self, {
              location: entryLocation(e),
              section: e.section,
              entryId: e.entry.id,
              field: 'endDate',
              excerpt: `${formatMonth(startDate)} – ${formatMonth(endDate)}`,
              keyParts: [startDate, endDate],
              message: 'The end date is before the start date.',
              suggestion: 'Check both dates.',
            }),
          );
        }
        if (startDate && compareMonths(startDate, monthNow(today)) > 0) {
          out.push(
            finding(self, {
              severity: 'warning',
              location: entryLocation(e),
              section: e.section,
              entryId: e.entry.id,
              field: 'startDate',
              excerpt: formatMonth(startDate),
              keyParts: [startDate],
              message: 'The start date is in the future.',
              suggestion: "If this is an upcoming role, that's fine; otherwise correct the date.",
            }),
          );
        }
        if (current && endDate) {
          out.push(
            finding(self, {
              severity: 'info',
              location: entryLocation(e),
              section: e.section,
              entryId: e.entry.id,
              field: 'endDate',
              excerpt: formatMonth(endDate),
              keyParts: [endDate],
              message: 'Marked as current but also has an end date. The end date is not shown.',
              suggestion: 'Clear the end date, or untick "current".',
              fix: {
                type: 'clearEndDate',
                label: 'Clear the end date',
                section: e.section,
                entryId: e.entry.id,
                customSectionId: e.customSectionId ?? null,
              },
            }),
          );
        }
      }
      return out;
    },
  },
  {
    id: 'MISSING_DATE',
    category: 'completeness',
    severity: 'warning',
    title: 'Role without dates',
    description: 'Every visible role has a start date.',
    whyItMatters: 'Readers use dates to understand how long you held each role.',
    limitations: 'Only checks roles in Experience.',
    check: (m, content, ctx, self) =>
      m.entries
        .filter((e) => e.section === 'experience' && !e.entry.startDate)
        .map((e) =>
          finding(self, {
            location: entryLocation(e),
            section: e.section,
            entryId: e.entry.id,
            field: 'startDate',
            message: 'This role has no start date.',
            suggestion: 'Add at least the start year.',
          }),
        ),
  },
  {
    id: 'DATE_OVERLAP_REVIEW',
    category: 'consistency',
    severity: 'info',
    title: 'Overlapping roles',
    description: 'Flags roles whose dates overlap by more than a month.',
    whyItMatters:
      'Overlaps are often accurate (part-time work, transitions), but reviewers may ask about them.',
    limitations:
      "Can't know whether overlapping roles were part-time or concurrent by design. Dismiss if it's accurate.",
    check: (m, content, { today }, self) => {
      const roles = m.entries
        .filter((e) => e.section === 'experience')
        .map((e) => ({ e, s: span(e.entry, today) }))
        .filter((r) => r.s);
      const out = [];
      for (let i = 0; i < roles.length; i += 1) {
        for (let j = i + 1; j < roles.length; j += 1) {
          const a = roles[i];
          const b = roles[j];
          const months = Math.min(a.s.to, b.s.to) - Math.max(a.s.from, b.s.from);
          if (months > 1) {
            out.push(
              finding(self, {
                location: `Experience: ${a.e.label} and ${b.e.label}`,
                section: 'experience',
                entryId: a.e.entry.id,
                keyParts: [
                  b.e.entry.id,
                  a.e.entry.startDate,
                  a.e.entry.endDate,
                  b.e.entry.startDate,
                  b.e.entry.endDate,
                ],
                message: `These roles overlap by about ${months} months.`,
                suggestion:
                  "If that's accurate, dismiss this. If one was part-time, you could say so in the employment type.",
              }),
            );
          }
        }
      }
      return out;
    },
  },
  {
    id: 'INCONSISTENT_DATE_FORMAT',
    category: 'consistency',
    severity: 'info',
    title: 'Mixed date precision',
    description: 'Dates are either all month-and-year or all year-only.',
    whyItMatters: 'Mixing "Mar 2021" with "2019" looks inconsistent and can hide gaps.',
    limitations: 'Considers start and end dates of visible entries with dates.',
    check: (m, content, ctx, self) => {
      const dated = m.entries.flatMap((e) =>
        ['startDate', 'endDate']
          .map((f) => ({ e, v: e.entry[f] }))
          .filter((x) => x.v && !(x.e.entry.current && x.v === x.e.entry.endDate)),
      );
      const yearOnly = dated.filter((d) => !parseMonth(d.v)?.month);
      if (!yearOnly.length || yearOnly.length === dated.length) return [];
      return [
        finding(self, {
          location: `${yearOnly.length} of ${dated.length} dates`,
          section: yearOnly[0].e.section,
          entryId: yearOnly[0].e.entry.id,
          keyParts: yearOnly.map((d) => `${d.e.entry.id}:${d.v}`),
          excerpt: yearOnly
            .slice(0, 3)
            .map((d) => `${d.e.label} (${d.v})`)
            .join('; '),
          message: 'Some dates show only the year while others include the month.',
          suggestion: 'Add months where you know them, or use years throughout.',
        }),
      ];
    },
  },
  {
    id: 'INCONSISTENT_ROLE_STRING',
    category: 'consistency',
    severity: 'info',
    title: 'Same name written differently',
    description: 'A company or institution is spelled the same way everywhere.',
    whyItMatters:
      'Inconsistent spelling looks careless and can split one employer into two in parsed data.',
    limitations: 'Only catches differences in case, spacing and punctuation.',
    check: (m, content, ctx, self) => {
      const groups = new Map();
      for (const e of m.entries) {
        const raw = e.entry.company ?? e.entry.institution;
        if (!raw?.trim()) continue;
        const key = normalizeForCompare(raw).replace(/[.\s]/g, '');
        if (!groups.has(key)) groups.set(key, new Map());
        groups.get(key).set(raw.trim(), e);
      }
      return [...groups.values()]
        .filter((variants) => variants.size > 1)
        .map((variants) => {
          const names = [...variants.keys()];
          const first = variants.get(names[0]);
          return finding(self, {
            location: names.map((n) => `"${n}"`).join(' and '),
            section: first.section,
            entryId: first.entry.id,
            keyParts: names,
            excerpt: names.join(' / '),
            message: 'The same organisation appears with different spelling.',
            suggestion: 'Use one spelling everywhere.',
          });
        });
    },
  },
  {
    id: 'EMPTY_BULLET',
    category: 'readability',
    severity: 'info',
    title: 'Empty bullet',
    description: 'No bullet is blank.',
    whyItMatters:
      "Empty bullets aren't printed, but they clutter the editor and make counts misleading.",
    limitations: 'None known.',
    check: (m, content, ctx, self) =>
      m.bullets
        .filter((b) => !b.text.trim())
        .map((b) =>
          finding(self, {
            location: bulletLocation(b),
            section: b.section,
            entryId: b.entry.id,
            bulletId: b.bullet.id,
            message: 'This bullet is empty.',
            suggestion: 'Write it or remove it.',
            fix: {
              type: 'removeBullet',
              label: 'Remove the empty bullet',
              section: b.section,
              entryId: b.entry.id,
              bulletId: b.bullet.id,
              customSectionId: b.customSectionId ?? null,
            },
          }),
        ),
  },
  {
    id: 'DUPLICATE_BULLET',
    category: 'readability',
    severity: 'warning',
    title: 'Repeated bullet',
    description: 'No bullet appears twice, ignoring case and punctuation.',
    whyItMatters: 'Repeating a bullet wastes space and reads as a copy-paste mistake.',
    limitations: 'Near-duplicates with different wording are not detected.',
    check: (m, content, ctx, self) => {
      const seen = new Map();
      const out = [];
      for (const b of m.bullets) {
        const key = normalizeLoose(b.text);
        if (!key) continue;
        const first = seen.get(key);
        if (!first) {
          seen.set(key, b);
          continue;
        }
        out.push(
          finding(self, {
            location: bulletLocation(b),
            section: b.section,
            entryId: b.entry.id,
            bulletId: b.bullet.id,
            excerpt: excerpt(b.text),
            keyParts: [key],
            message: `Same text as ${bulletLocation(first)}.`,
            suggestion: 'Remove one, or rewrite it to say something different.',
            fix: {
              type: 'removeBullet',
              label: 'Remove this copy',
              section: b.section,
              entryId: b.entry.id,
              bulletId: b.bullet.id,
              customSectionId: b.customSectionId ?? null,
            },
          }),
        );
      }
      return out;
    },
  },
  {
    id: 'VERY_LONG_BULLET',
    category: 'readability',
    severity: 'warning',
    title: 'Very long bullet',
    description: `Bullets are under ${LONG_BULLET_WORDS} words and ${LONG_BULLET_CHARS} characters.`,
    whyItMatters:
      'Readers skim; long bullets tend to be skipped, burying the result you wanted noticed.',
    limitations:
      'A length threshold, not a judgment of quality. Some dense technical bullets are fine.',
    check: (m, content, ctx, self) =>
      m.bullets
        .filter(
          (b) => words(b.text).length > LONG_BULLET_WORDS || b.text.length > LONG_BULLET_CHARS,
        )
        .map((b) =>
          finding(self, {
            location: bulletLocation(b),
            section: b.section,
            entryId: b.entry.id,
            bulletId: b.bullet.id,
            excerpt: excerpt(b.text),
            keyParts: [b.text],
            message: `${words(b.text).length} words, ${b.text.length} characters.`,
            suggestion:
              'Split it into two bullets, or lead with the outcome and cut supporting detail.',
          }),
        ),
  },
  {
    id: 'REPEATED_PHRASE',
    category: 'readability',
    severity: 'info',
    title: 'Repeated opening word',
    description: 'No single word starts four or more bullets.',
    whyItMatters: 'Starting many bullets with the same verb makes them blur together.',
    limitations: 'Looks only at the first word; varied phrasing after it is not considered.',
    check: (m, content, ctx, self) => {
      const counts = new Map();
      for (const b of m.bullets) {
        const w = firstWord(b.text);
        if (w.length < 3) continue;
        if (!counts.has(w)) counts.set(w, []);
        counts.get(w).push(b);
      }
      return [...counts.entries()]
        .filter(([, list]) => list.length >= 4)
        .map(([w, list]) =>
          finding(self, {
            location: `${list.length} bullets`,
            section: list[0].section,
            entryId: list[0].entry.id,
            keyParts: [w, list.length],
            excerpt: list
              .slice(0, 3)
              .map((b) => excerpt(b.text, 40))
              .join(' / '),
            message: `${list.length} bullets start with "${w}".`,
            suggestion: 'Vary the opening verb where a more specific one fits.',
          }),
        );
    },
  },
  {
    id: 'INCONSISTENT_BULLET_STYLE',
    category: 'readability',
    severity: 'info',
    title: 'Mixed bullet punctuation',
    description: 'Bullets either all end with a full stop or none do.',
    whyItMatters: 'Consistent punctuation makes the document look deliberate.',
    limitations: 'Only looks at the final character of each bullet.',
    check: (m, content, ctx, self) => {
      const filled = m.bullets.filter((b) => b.text.trim());
      const withPeriod = filled.filter((b) => /[.!?]\s*$/.test(b.text));
      if (!withPeriod.length || withPeriod.length === filled.length) return [];
      // Strict majority adds full stops; a tie removes them (the smaller edit to make by hand).
      const mode = withPeriod.length * 2 > filled.length ? 'add' : 'remove';
      return [
        finding(self, {
          location: `${withPeriod.length} of ${filled.length} bullets end with a full stop`,
          section: filled[0].section,
          keyParts: [withPeriod.length, filled.length],
          message: 'Some bullets end with a full stop and others don’t.',
          suggestion:
            mode === 'add'
              ? 'Most of your bullets end with a full stop; add it to the rest.'
              : 'Most of your bullets have no full stop; remove it from the rest.',
          fix: {
            type: 'setTrailingPeriods',
            label: mode === 'add' ? 'Add full stops to the rest' : 'Remove the full stops',
            mode,
            bulletIds: filled.map((b) => b.bullet.id),
          },
        }),
      ];
    },
  },
  {
    id: 'UNUSUAL_PUNCTUATION',
    category: 'readability',
    severity: 'info',
    title: 'Stray spacing or punctuation',
    description:
      'No double spaces, leading or trailing spaces, or repeated punctuation like "!!" in bullets.',
    whyItMatters: 'Small typos are easy to miss on screen but noticeable in print.',
    limitations: "Doesn't check spelling or grammar.",
    check: (m, content, ctx, self) =>
      m.bullets
        .filter(
          (b) =>
            b.text.trim() &&
            (/ {2,}/.test(b.text) || /^\s|\s$/.test(b.text) || /([!?,;:])\1/.test(b.text)),
        )
        .map((b) =>
          finding(self, {
            location: bulletLocation(b),
            section: b.section,
            entryId: b.entry.id,
            bulletId: b.bullet.id,
            excerpt: excerpt(b.text.replace(/ /g, '·')),
            keyParts: [b.text],
            message: 'Extra spaces or repeated punctuation.',
            suggestion: 'Tidy the spacing.',
            fix: /([!?,;:])\1/.test(b.text)
              ? null
              : {
                  type: 'normalizeSpacing',
                  label: 'Tidy the spacing',
                  section: b.section,
                  entryId: b.entry.id,
                  bulletId: b.bullet.id,
                  customSectionId: b.customSectionId ?? null,
                },
          }),
        ),
  },
  {
    id: 'MISSING_SECTION_HEADING',
    category: 'structure',
    severity: 'warning',
    title: 'Section without a heading',
    description: 'Custom sections that have entries also have a title.',
    whyItMatters: 'Headings let readers and parsers tell sections apart.',
    limitations: 'Applies to custom sections; built-in sections always have headings.',
    check: (m, content, ctx, self) =>
      (content.customSections ?? [])
        .filter(
          (s) => m.order.includes(`custom:${s.id}`) && !s.title?.trim() && (s.items ?? []).length,
        )
        .map((s) =>
          finding(self, {
            location: 'Custom section',
            section: `custom:${s.id}`,
            field: 'title',
            message: 'This section has entries but no heading.',
            suggestion: 'Give it a title such as "Publications" or "Awards".',
          }),
        ),
  },
  {
    id: 'POSSIBLE_CONTENT_OVERFLOW',
    category: 'integrity',
    severity: 'info',
    title: 'Very long unbroken text',
    description: `No word or address longer than ${UNBROKEN_TOKEN} characters.`,
    whyItMatters: 'Long unbroken strings, usually URLs, wrap awkwardly mid-word in the PDF.',
    limitations: 'Export checks measure actual overflow; this is an early warning.',
    check: (m, content, ctx, self) =>
      m.bullets
        .filter((b) => words(b.text).some((w) => w.length > UNBROKEN_TOKEN))
        .map((b) =>
          finding(self, {
            location: bulletLocation(b),
            section: b.section,
            entryId: b.entry.id,
            bulletId: b.bullet.id,
            excerpt: excerpt(
              words(b.text).find((w) => w.length > UNBROKEN_TOKEN),
              70,
            ),
            keyParts: [b.text],
            message: 'Contains a very long unbroken string.',
            suggestion: 'Shorten the link, or move it to the project URL field.',
          }),
        ),
  },
  {
    id: 'EXCESSIVE_LENGTH',
    category: 'structure',
    severity: 'info',
    title: 'Long resume',
    description: `Visible text stays under about ${LONG_RESUME_WORDS} words (roughly two pages).`,
    whyItMatters:
      'Most reviewers spend little time per resume; length dilutes your strongest points.',
    limitations:
      'Word count only. Senior or academic roles can justify more; the export reports the exact page count.',
    check: (m, content, ctx, self) => {
      const total =
        words(m.showSummary ? content.summary : '').length +
        m.bullets.reduce((n, b) => n + words(b.text).length, 0) +
        m.entries.reduce((n, e) => n + words(e.entry.description).length, 0);
      if (total <= LONG_RESUME_WORDS) return [];
      return [
        finding(self, {
          location: 'Whole resume',
          section: 'summary',
          keyParts: [Math.round(total / 100)],
          message: `About ${total} words of visible text.`,
          suggestion:
            'Hide older or less relevant entries for this version; they stay in your profile.',
        }),
      ];
    },
  },
  {
    id: 'CLAIM_WITHOUT_LINKED_EVIDENCE',
    category: 'claims',
    severity: 'info',
    title: 'Measurable claim without evidence',
    description:
      'Bullets with numbers, percentages or amounts have evidence linked from your profile.',
    whyItMatters:
      "A reminder, not a judgment: claims you can back up are easier to discuss in interviews. ResumeOS doesn't verify claims or evidence.",
    limitations:
      'Any number of two or more digits counts, so years and team sizes are flagged too. Dismiss where it doesn’t apply.',
    check: (m, content, ctx, self) =>
      m.bullets
        .filter((b) => hasMetric(b.text) && !(b.bullet.evidenceIds ?? []).length)
        .map((b) =>
          finding(self, {
            location: bulletLocation(b),
            section: b.section,
            entryId: b.entry.id,
            bulletId: b.bullet.id,
            excerpt: excerpt(b.text),
            keyParts: [b.text],
            message: 'No evidence attached.',
            suggestion:
              'If you have a benchmark, report or PR, add it under Evidence in your profile and link it to this bullet.',
          }),
        ),
  },
];

export const RULES_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r]));
