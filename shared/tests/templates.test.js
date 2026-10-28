import { describe, it, expect } from 'vitest';
import { renderClarity } from '../src/templates/clarity.js';
import { sampleResume } from '../src/sample/sampleResume.js';
import { emptyContent } from '../src/resumeModel.js';

describe('renderClarity', () => {
  it('renders sections in layout order', () => {
    const html = renderClarity(sampleResume, {
      sectionOrder: [
        'skills',
        'experience',
        'summary',
        'projects',
        'education',
        'certifications',
        'languages',
      ],
    });
    const order = [...html.matchAll(/data-section="([^"]+)"/g)].map((m) => m[1]);
    expect(order).toEqual([
      'skills',
      'experience',
      'summary',
      'projects',
      'education',
      'certifications',
      'languages',
    ]);
  });

  it('escapes user text and never emits scripts', () => {
    const content = emptyContent();
    content.contact.name = '<script>alert(1)</script>';
    content.summary = 'Uses <b> & "quotes"';
    const html = renderClarity(content);
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Uses &lt;b&gt; &amp; &quot;quotes&quot;');
  });

  it('drops unsafe link protocols', () => {
    const content = emptyContent();
    content.contact.name = 'A';
    content.contact.website = 'javascript:alert(1)';
    const html = renderClarity(content);
    expect(html).not.toContain('href="javascript');
  });

  it('omits hidden sections, hidden items and empty sections', () => {
    const html = renderClarity(sampleResume, {
      hiddenSections: ['projects'],
      hiddenItems: ['exp_2'],
    });
    expect(html).not.toContain('data-section="projects"');
    expect(html).not.toContain('Tallyhouse');
    expect(html).toContain('Northwind');
    const empty = renderClarity({ ...emptyContent(), contact: { name: 'X' } });
    expect(empty).not.toContain('<section');
  });

  it('preserves Unicode text', () => {
    const content = { ...emptyContent(), contact: { name: 'Zoë Ångström-Nguyễn 李' } };
    expect(renderClarity(content)).toContain('Zoë Ångström-Nguyễn 李');
  });

  it('sets the requested page size', () => {
    expect(renderClarity(sampleResume, {}, { pageSize: 'Letter' })).toContain('size: letter');
    expect(renderClarity(sampleResume, {}, { pageSize: 'A4' })).toContain('size: A4');
  });
});

describe('bullets', () => {
  it('renders bullet objects and legacy strings, skipping empty ones', () => {
    const content = { ...emptyContent(), contact: { name: 'A' } };
    content.experience = [
      {
        id: 'exp_1',
        title: 'T',
        company: 'C',
        bullets: [{ id: 'b1', text: 'Object bullet' }, 'String bullet', { id: 'b2', text: '  ' }],
      },
    ];
    const html = renderClarity(content);
    expect(html).toContain('<li>Object bullet</li>');
    expect(html).toContain('<li>String bullet</li>');
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).not.toContain('[object Object]');
  });
});

describe('templates registry', () => {
  it('every template contains exactly the same words', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    const words = (html) =>
      html
        .replace(/<style>[\s\S]*?<\/style>/, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[,|]/g, ' ') // chips and stacked contacts drop visible separators
        .split(/\s+/)
        .filter(Boolean)
        .sort();
    const [first, ...rest] = TEMPLATES.map((t) => words(t.render(sampleResume, {})));
    for (const w of rest) expect(w).toEqual(first);
  });

  it('templates without a sidebar keep the layout order in the document', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    const layout = {
      sectionOrder: [
        'skills',
        'experience',
        'summary',
        'projects',
        'education',
        'certifications',
        'languages',
      ],
    };
    for (const t of TEMPLATES) {
      const markup = t.render(sampleResume, layout).replace(/<style>[\s\S]*?<\/style>/, '');
      const order = [...markup.matchAll(/<section data-section="([^"]+)"/g)].map((m) => m[1]);
      if (!t.render(sampleResume, {}).includes('<aside class="sidebar">'))
        expect(order).toEqual(layout.sectionOrder);
      // Sidebar templates: any full-width sections (Orbit's summary), then sidebar sections, then the
      // main column, each in layout order.
      else if (['orbit', 'tide'].includes(t.id))
        expect(order).toEqual([
          'summary',
          'skills',
          'education',
          'certifications',
          'languages',
          'experience',
          'projects',
        ]);
      else
        expect(order).toEqual([
          'skills',
          'education',
          'certifications',
          'languages',
          'experience',
          'summary',
          'projects',
        ]);
    }
  });

  it('Clarity and Ledger share identical markup', async () => {
    const { getTemplate } = await import('../src/templates/index.js');
    // Ledger has an accent, so its language levels also get dots (drawn, no text; same words).
    const strip = (html) =>
      html
        .replace(/<style>[\s\S]*?<\/style>/, '')
        .replace('class="langs dots"', 'class="langs"')
        .replace(/<svg class="meter dots"[\s\S]*?<\/svg>/g, '');
    expect(strip(getTemplate('ledger').render(sampleResume, {}))).toBe(
      strip(getTemplate('clarity').render(sampleResume, {})),
    );
  });

  it('sidebar templates place the sidebar first in the document', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    for (const t of TEMPLATES.filter((x) => x.columns === 2 && x.id !== 'ledger')) {
      const html = t.render(sampleResume, {});
      expect(html.indexOf('<aside class="sidebar">')).toBeLessThan(
        html.indexOf('<main class="main">'),
      );
    }
  });

  it('escapes user text in chips and contact items', async () => {
    const { getTemplate } = await import('../src/templates/index.js');
    const content = {
      ...emptyContent(),
      contact: { name: 'A', location: '<img src=x onerror=1>' },
      skills: [{ id: 'sk_1', name: '<script>x</script>', category: 'C' }],
    };
    for (const id of ['horizon', 'meridian', 'atelier']) {
      const html = getTemplate(id).render(content, {});
      expect(html).not.toMatch(/<script|<img/i);
      expect(html).toContain('&lt;script&gt;');
    }
  });

  it('declares metadata needed by the gallery and exports', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    for (const t of TEMPLATES) {
      expect(t).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
          fonts: expect.any(Array),
          docxFont: expect.any(String),
          tradeOffs: expect.any(String),
          parsingNotes: expect.any(String),
        }),
      );
    }
  });
});

describe('accent colours in templates', () => {
  it('applies a valid accent and falls back to the default for an unreadable one', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    for (const t of TEMPLATES.filter((x) => x.accent)) {
      expect(t.render(sampleResume, {}, { accentColor: '#8a1f3d' })).toContain('--accent: #8a1f3d');
      const fallback = t.render(sampleResume, {}, { accentColor: '#ffee00' });
      expect(fallback).toContain(`--accent: ${t.accent.default}`);
      expect(
        t.render(sampleResume, {}, { accentColor: 'red; } body { display:none' }),
      ).not.toContain('display:none');
    }
  });

  it('Clarity ignores accents entirely', async () => {
    const { getTemplate } = await import('../src/templates/index.js');
    const c = getTemplate('clarity');
    expect(c.accent).toBeNull();
    expect(c.render(sampleResume, {}, { accentColor: '#8a1f3d' })).toBe(c.render(sampleResume, {}));
  });

  it('every accent template declares a readable default', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    const { accentProblem } = await import('../src/templates/color.js');
    for (const t of TEMPLATES.filter((x) => x.accent))
      expect([t.id, accentProblem(t.accent.default)]).toEqual([t.id, null]);
  });
});

describe('template CSS guards', () => {
  it('never hides separators outside the contact line (they keep words apart in extracted text)', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    for (const t of TEMPLATES) {
      const css = /<style>([\s\S]*?)<\/style>/.exec(t.render(sampleResume, {}))[1];
      expect([t.id, /(^|\n)\.sep\s*\{[^}]*display:\s*none/.test(css)]).toEqual([t.id, false]);
    }
  });

  it('never positions, transforms or fades anything (that reorders extracted text)', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    for (const t of TEMPLATES) {
      const css = /<style>([\s\S]*?)<\/style>/
        .exec(t.render(sampleResume, {}))[1]
        .replace(/@font-face\{[^}]*\}/g, '');
      expect([
        t.id,
        css.match(
          /(?<![-\w])(?:position:\s*(?:relative|absolute|fixed|sticky)|transform:|opacity:|z-index:)/g,
        ),
      ]).toEqual([t.id, null]);
    }
  });
});

describe('uncategorised skills', () => {
  it('render without a group label that would repeat the "Skills" heading', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    const content = {
      ...emptyContent(),
      contact: { name: 'A' },
      skills: [
        { id: 'sk_1', name: 'React', category: '' },
        { id: 'sk_2', name: 'AWS', category: '' },
      ],
    };
    for (const t of TEMPLATES) {
      const html = t.render(content, {}).replace(/<style>[\s\S]*?<\/style>/, '');
      expect([t.id, html.includes('<dt>Skills</dt>')]).toEqual([t.id, false]);
      expect(html).toMatch(/React/);
    }
  });
});
