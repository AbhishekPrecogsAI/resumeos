import { describe, it, expect } from 'vitest';
import { renderClarity } from '../src/templates/clarity.js';
import { sampleResume } from '../src/sample/sampleResume.js';
import { emptyContent } from '../src/resumeModel.js';

describe('renderClarity', () => {
  it('renders sections in layout order', () => {
    const html = renderClarity(sampleResume, {
      sectionOrder: ['skills', 'experience', 'summary', 'projects', 'education', 'certifications'],
    });
    const order = [...html.matchAll(/data-section="([^"]+)"/g)].map((m) => m[1]);
    expect(order).toEqual([
      'skills',
      'experience',
      'summary',
      'projects',
      'education',
      'certifications',
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
  it('every template renders the same reading order and text', async () => {
    const { TEMPLATES } = await import('../src/templates/index.js');
    const strip = (html) => html.replace(/<style>[\s\S]*?<\/style>/, '');
    const [first, ...rest] = TEMPLATES.map((t) => strip(t.render(sampleResume, {})));
    for (const html of rest) expect(html).toBe(first);
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
