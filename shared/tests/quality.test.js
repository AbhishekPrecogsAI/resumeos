import { describe, it, expect } from 'vitest';
import { runQualityChecks, RULES } from '../src/quality/engine.js';
import { applyFix } from '../src/quality/fixes.js';
import { hasMetric } from '../src/quality/text.js';
import { emptyContent, defaultLayout } from '../src/resumeModel.js';
import { sampleResume } from '../src/sample/sampleResume.js';

const TODAY = new Date(Date.UTC(2026, 9, 15));
const b = (id, text, evidenceIds = []) => ({ id, text, evidenceIds });
const role = (id, extra = {}) => ({
  id,
  company: 'Northwind',
  title: 'Engineer',
  location: '',
  employmentType: '',
  startDate: '2020-01',
  endDate: '2021-06',
  current: false,
  bullets: [],
  ...extra,
});

function base(extra = {}) {
  const c = emptyContent();
  c.contact = { ...c.contact, name: 'Sam Lee', email: 'sam@example.com' };
  return { ...c, ...extra };
}

const run = (content, layout = defaultLayout(content), opts = {}) =>
  runQualityChecks(content, layout, { today: TODAY, ...opts });
const ids = (report, ruleId) => report.findings.filter((f) => f.ruleId === ruleId);

describe('quality engine', () => {
  it('a clean minimal resume has no findings', () => {
    expect(run(base()).findings).toEqual([]);
  });

  it('lists every rule that ran, with limitations, and has no score', () => {
    const report = run(base());
    expect(report.rulesRun).toHaveLength(RULES.length);
    expect(report.rulesRun.every((r) => r.limitations && r.description)).toBe(true);
    expect(JSON.stringify(report)).not.toMatch(/score/i);
  });

  it('is deterministic for the same input and date', () => {
    expect(run(sampleResume)).toEqual(run(sampleResume));
  });

  it('every finding has the required explanation fields', () => {
    const c = base({
      experience: [
        role('exp_1', { endDate: '2019-01', bullets: [b('b1', ''), b('b2', 'Grew revenue 40%')] }),
      ],
    });
    for (const f of run(c).findings) {
      expect(f).toEqual(
        expect.objectContaining({
          severity: expect.stringMatching(/error|warning|info/),
          location: expect.any(String),
          message: expect.any(String),
          suggestion: expect.any(String),
          whyItMatters: expect.any(String),
          key: expect.any(String),
        }),
      );
    }
  });
});

describe('rules', () => {
  it('EMPTY_REQUIRED_SECTION', () => {
    expect(
      ids(run(base({ contact: { ...emptyContent().contact } })), 'EMPTY_REQUIRED_SECTION'),
    ).toHaveLength(1);
    expect(ids(run(base()), 'EMPTY_REQUIRED_SECTION')).toHaveLength(0);
  });

  it('INVALID_OR_MISSING_CONTACT_LINK: warning without any contact, info with only links', () => {
    const none = base();
    none.contact.email = '';
    expect(ids(run(none), 'INVALID_OR_MISSING_CONTACT_LINK')[0].severity).toBe('warning');
    none.contact.github = 'https://github.com/sam';
    expect(ids(run(none), 'INVALID_OR_MISSING_CONTACT_LINK')[0].severity).toBe('info');
    expect(ids(run(base()), 'INVALID_OR_MISSING_CONTACT_LINK')).toHaveLength(0);
  });

  it('LINK_FORMAT_INVALID', () => {
    const c = base();
    c.contact.website = 'https://localhost';
    c.projects = [
      {
        id: 'prj_1',
        name: 'X',
        url: 'https://example.com',
        repositoryUrl: '',
        technologies: [],
        bullets: [],
      },
    ];
    expect(ids(run(c), 'LINK_FORMAT_INVALID').map((f) => f.field)).toEqual(['website']);
  });

  it('DATE_ORDER_INVALID: reversed, future, and current-with-end-date', () => {
    const c = base({
      experience: [
        role('exp_1', { startDate: '2022-05', endDate: '2021-01' }),
        role('exp_2', { startDate: '2027-01', endDate: '', current: true }),
        role('exp_3', { current: true, endDate: '2023-01' }),
      ],
    });
    const f = ids(run(c), 'DATE_ORDER_INVALID');
    expect(f.map((x) => `${x.entryId}:${x.severity}`).sort()).toEqual([
      'exp_1:error',
      'exp_2:warning',
      'exp_3:info',
    ]);
    expect(ids(run(base({ experience: [role('exp_1')] })), 'DATE_ORDER_INVALID')).toHaveLength(0);
  });

  it('MISSING_DATE', () => {
    expect(
      ids(
        run(base({ experience: [role('exp_1', { startDate: '', endDate: '' })] })),
        'MISSING_DATE',
      ),
    ).toHaveLength(1);
    expect(ids(run(base({ experience: [role('exp_1')] })), 'MISSING_DATE')).toHaveLength(0);
  });

  it('DATE_OVERLAP_REVIEW ignores a one-month handover', () => {
    const overlap = base({
      experience: [
        role('exp_1', { startDate: '2020-01', endDate: '2021-12' }),
        role('exp_2', { company: 'B', startDate: '2021-06', endDate: '2022-06' }),
      ],
    });
    expect(ids(run(overlap), 'DATE_OVERLAP_REVIEW')[0].message).toMatch(/about 6 months/);
    const handover = base({
      experience: [
        role('exp_1', { startDate: '2020-01', endDate: '2021-06' }),
        role('exp_2', { company: 'B', startDate: '2021-06', endDate: '2022-06' }),
      ],
    });
    expect(ids(run(handover), 'DATE_OVERLAP_REVIEW')).toHaveLength(0);
  });

  it('INCONSISTENT_DATE_FORMAT', () => {
    expect(
      ids(
        run(
          base({
            experience: [
              role('exp_1'),
              role('exp_2', { company: 'B', startDate: '2018', endDate: '2019' }),
            ],
          }),
        ),
        'INCONSISTENT_DATE_FORMAT',
      ),
    ).toHaveLength(1);
    expect(
      ids(
        run(base({ experience: [role('exp_1', { startDate: '2018', endDate: '2019' })] })),
        'INCONSISTENT_DATE_FORMAT',
      ),
    ).toHaveLength(0);
  });

  it('INCONSISTENT_ROLE_STRING', () => {
    const c = base({
      experience: [
        role('exp_1', { company: 'Northwind Inc.' }),
        role('exp_2', { company: 'northwind inc', startDate: '2022-01', endDate: '2023-01' }),
      ],
    });
    expect(ids(run(c), 'INCONSISTENT_ROLE_STRING')).toHaveLength(1);
    expect(
      ids(
        run(
          base({
            experience: [
              role('exp_1'),
              role('exp_2', { startDate: '2022-01', endDate: '2023-01' }),
            ],
          }),
        ),
        'INCONSISTENT_ROLE_STRING',
      ),
    ).toHaveLength(0);
  });

  it('EMPTY_BULLET with a removal fix', () => {
    const c = base({
      experience: [role('exp_1', { bullets: [b('b1', 'Built things'), b('b2', '   ')] })],
    });
    const [f] = ids(run(c), 'EMPTY_BULLET');
    expect(f.fix.type).toBe('removeBullet');
    expect(applyFix(c, f.fix).experience[0].bullets.map((x) => x.id)).toEqual(['b1']);
    expect(c.experience[0].bullets).toHaveLength(2);
  });

  it('DUPLICATE_BULLET ignores case and punctuation and flags the second copy', () => {
    const c = base({
      experience: [
        role('exp_1', { bullets: [b('b1', 'Built the API.')] }),
        role('exp_2', {
          company: 'B',
          startDate: '2022-01',
          endDate: '2023-01',
          bullets: [b('b2', 'built the api')],
        }),
      ],
    });
    const [f] = ids(run(c), 'DUPLICATE_BULLET');
    expect(f.bulletId).toBe('b2');
    expect(
      ids(
        run(
          base({
            experience: [
              role('exp_1', { bullets: [b('b1', 'Built the API'), b('b2', 'Built the CLI')] }),
            ],
          }),
        ),
        'DUPLICATE_BULLET',
      ),
    ).toHaveLength(0);
  });

  it('VERY_LONG_BULLET', () => {
    expect(
      ids(
        run(base({ experience: [role('exp_1', { bullets: [b('b1', 'word '.repeat(41))] })] })),
        'VERY_LONG_BULLET',
      ),
    ).toHaveLength(1);
    expect(
      ids(
        run(base({ experience: [role('exp_1', { bullets: [b('b1', 'word '.repeat(20))] })] })),
        'VERY_LONG_BULLET',
      ),
    ).toHaveLength(0);
  });

  it('REPEATED_PHRASE', () => {
    const many = ['Built A', 'Built B', 'Built C', 'Built D'].map((t, i) => b(`b${i}`, t));
    expect(
      ids(run(base({ experience: [role('exp_1', { bullets: many })] })), 'REPEATED_PHRASE')[0]
        .message,
    ).toMatch(/4 bullets start with "built"/);
    expect(
      ids(
        run(base({ experience: [role('exp_1', { bullets: many.slice(0, 3) })] })),
        'REPEATED_PHRASE',
      ),
    ).toHaveLength(0);
  });

  it('INCONSISTENT_BULLET_STYLE follows the majority and fixes only the rest', () => {
    const c = base({
      experience: [
        role('exp_1', { bullets: [b('b1', 'One.'), b('b2', 'Two.'), b('b3', 'Three')] }),
      ],
    });
    const [f] = ids(run(c), 'INCONSISTENT_BULLET_STYLE');
    expect(f.fix.mode).toBe('add');
    expect(applyFix(c, f.fix).experience[0].bullets.map((x) => x.text)).toEqual([
      'One.',
      'Two.',
      'Three.',
    ]);
    const remove = base({
      experience: [
        role('exp_1', {
          bullets: [b('b1', 'One.'), b('b2', 'Two'), b('b3', 'Three'), b('b4', 'Wait...')],
        }),
      ],
    });
    const [g] = ids(run(remove), 'INCONSISTENT_BULLET_STYLE');
    expect(applyFix(remove, g.fix).experience[0].bullets.map((x) => x.text)).toEqual([
      'One',
      'Two',
      'Three',
      'Wait...',
    ]);
    expect(
      ids(
        run(base({ experience: [role('exp_1', { bullets: [b('b1', 'One'), b('b2', 'Two')] })] })),
        'INCONSISTENT_BULLET_STYLE',
      ),
    ).toHaveLength(0);
  });

  it('UNUSUAL_PUNCTUATION offers a spacing fix but not for repeated punctuation', () => {
    const c = base({
      experience: [role('exp_1', { bullets: [b('b1', ' Cut  costs '), b('b2', 'Shipped it!!')] })],
    });
    const f = ids(run(c), 'UNUSUAL_PUNCTUATION');
    expect(f).toHaveLength(2);
    const spacing = f.find((x) => x.bulletId === 'b1');
    expect(applyFix(c, spacing.fix).experience[0].bullets[0].text).toBe('Cut costs');
    expect(f.find((x) => x.bulletId === 'b2').fix).toBeNull();
  });

  it('MISSING_SECTION_HEADING', () => {
    const c = base({
      customSections: [
        { id: 'sec_1', title: '', items: [{ id: 'itm_1', title: 'Award', bullets: [] }] },
      ],
    });
    expect(ids(run(c), 'MISSING_SECTION_HEADING')).toHaveLength(1);
    c.customSections[0].title = 'Awards';
    expect(ids(run(c), 'MISSING_SECTION_HEADING')).toHaveLength(0);
  });

  it('POSSIBLE_CONTENT_OVERFLOW', () => {
    expect(
      ids(
        run(
          base({
            experience: [
              role('exp_1', { bullets: [b('b1', `See https://example.com/${'x'.repeat(70)}`)] }),
            ],
          }),
        ),
        'POSSIBLE_CONTENT_OVERFLOW',
      ),
    ).toHaveLength(1);
    expect(
      ids(
        run(
          base({
            experience: [role('exp_1', { bullets: [b('b1', 'See https://example.com/a')] })],
          }),
        ),
        'POSSIBLE_CONTENT_OVERFLOW',
      ),
    ).toHaveLength(0);
  });

  it('EXCESSIVE_LENGTH', () => {
    const bullets = Array.from({ length: 60 }, (_, i) => b(`b${i}`, 'word '.repeat(20)));
    expect(
      ids(run(base({ experience: [role('exp_1', { bullets })] })), 'EXCESSIVE_LENGTH'),
    ).toHaveLength(1);
    expect(
      ids(
        run(base({ experience: [role('exp_1', { bullets: bullets.slice(0, 10) })] })),
        'EXCESSIVE_LENGTH',
      ),
    ).toHaveLength(0);
  });

  it('CLAIM_WITHOUT_LINKED_EVIDENCE is cleared by linking evidence', () => {
    const c = base({
      experience: [
        role('exp_1', {
          bullets: [
            b('b1', 'Cut p95 latency by 62%'),
            b('b2', 'Reduced cost by 30%', ['ev_1']),
            b('b3', 'Led the migration'),
          ],
        }),
      ],
    });
    expect(ids(run(c), 'CLAIM_WITHOUT_LINKED_EVIDENCE').map((f) => f.bulletId)).toEqual(['b1']);
  });
});

describe('metric detection', () => {
  it.each([
    ['62%', true],
    ['3x faster', true],
    ['$40k saved', true],
    ['820 ms', true],
    ['team of 12', true],
    ['Led the team', false],
    ['Go 1 project', false],
  ])('%s → %s', (text, expected) => {
    expect(hasMetric(text)).toBe(expected);
  });
});

describe('visibility and dismissals', () => {
  it('ignores hidden sections and entries', () => {
    const c = base({ experience: [role('exp_1', { bullets: [b('b1', '')] })] });
    expect(run(c, { ...defaultLayout(c), hiddenItems: ['exp_1'] }).findings).toEqual([]);
    expect(run(c, { ...defaultLayout(c), hiddenSections: ['experience'] }).findings).toEqual([]);
  });

  it('dismissed findings move aside, and return when the text changes', () => {
    const c = base({ experience: [role('exp_1', { bullets: [b('b1', 'Grew revenue 40%')] })] });
    const [f] = run(c).findings;
    const dismissals = [{ key: f.key, ruleId: f.ruleId, reason: 'Public figure' }];
    const after = run(c, undefined, { dismissals });
    expect(after.findings).toEqual([]);
    expect(after.dismissed[0]).toMatchObject({
      key: f.key,
      dismissal: { reason: 'Public figure' },
    });
    c.experience[0].bullets[0].text = 'Grew revenue 45%';
    expect(run(c, undefined, { dismissals }).findings).toHaveLength(1);
  });

  it('sorts errors first', () => {
    const c = base({
      contact: { ...emptyContent().contact },
      experience: [role('exp_1', { bullets: [b('b1', '')] })],
    });
    const severities = run(c).findings.map((f) => f.severity);
    expect(severities).toEqual(
      [...severities].sort(
        (a, z) => ['error', 'warning', 'info'].indexOf(a) - ['error', 'warning', 'info'].indexOf(z),
      ),
    );
  });
});
