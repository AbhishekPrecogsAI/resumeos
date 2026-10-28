import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate } from '../src/templates/index.js';
import { sampleResume } from '../src/sample/sampleResume.js';
import { defaultLayout, emptyContent } from '../src/resumeModel.js';
import { addEntry, cycleLanguageLevel, deleteEntry } from '../src/editing.js';
import { shareableResume } from '../src/sharing.js';
import { diffResumes } from '../src/diff.js';

const markup = (html) => html.replace(/<style>[\s\S]*?<\/style>/, '');
const css = (html) => /<style>([\s\S]*?)<\/style>/.exec(html)[1];
const sectionOrder = (html) =>
  [...markup(html).matchAll(/<section data-section="([^"]+)"/g)].map((m) => m[1]);

describe('languages and interests', () => {
  it('prints every level as a word, with dots only on templates that have an accent', () => {
    const clarity = getTemplate('clarity').render(sampleResume, {});
    expect(markup(clarity)).toContain(
      '<dl class="langs"><div><dt>Swedish</dt><dd class="lvl">Native</dd></div>',
    );
    const orbit = getTemplate('orbit').render(sampleResume, {});
    expect(markup(orbit)).toContain('<dl class="langs dots">');
    expect(markup(orbit)).toMatch(/<dd class="lvl">Conversational<svg class="dots"/);
    // Five dots, as many solid as the level: Swedish (Native) 5, Portuguese (Conversational) 2.
    const dots = [...markup(orbit).matchAll(/<svg class="dots"[\s\S]*?<\/svg>/g)].map(
      (m) => (m[0].match(/<circle/g) ?? []).length - (m[0].match(/fill-opacity/g) ?? []).length,
    );
    expect(dots).toEqual([5, 4, 2]);
    expect(markup(clarity)).not.toContain('<svg class="dots"');
  });

  it('omits the level when none is set, and skips blank entries', () => {
    const content = {
      ...emptyContent(),
      contact: { name: 'A' },
      languages: [
        { id: 'lang_1', name: 'Dutch', level: '' },
        { id: 'lang_2', name: '  ', level: 'fluent' },
      ],
      interests: [{ id: 'int_1', name: 'Chess' }],
    };
    const html = markup(getTemplate('orbit').render(content, {}));
    expect(html).toContain('<div><dt>Dutch</dt></div>');
    expect(html).not.toContain('Fluent');
    expect(html).toContain('<p class="interests"><span class="chip">Chess</span></p>');
    expect(markup(getTemplate('clarity').render(content, {}))).toContain(
      '<p class="interests">Chess</p>',
    );
  });

  it('adds the list styles only when a resume shows the sections', () => {
    const plain = { ...sampleResume, languages: [], interests: [] };
    expect(getTemplate('clarity').render(plain, {})).not.toContain('.langs');
    expect(getTemplate('clarity').render(sampleResume, {})).toContain('.langs');
  });

  it('every heading-icon template draws an icon for the new sections', () => {
    for (const id of [
      'atlas',
      'beacon',
      'harbor',
      'summit',
      'tide',
      'circuit',
      'pulse',
      'keystone',
    ]) {
      const html = markup(getTemplate(id).render(sampleResume, {}));
      expect([id, html.includes('undefined')]).toEqual([id, false]);
      expect(html).toMatch(/<section data-section="languages"><h2><svg class="h-ico"/);
    }
  });

  it('canvas editing: Enter adds an entry, levels cycle and wrap to none', () => {
    const old = { ...emptyContent(), languages: undefined };
    const added = addEntry(old, 'languages');
    expect(added.content.languages).toHaveLength(1);
    expect(added.focus).toMatch(/^languages:lang_[A-Za-z0-9_-]+:name$/);

    const key = 'languages:lang_3';
    const levels = [];
    let c = sampleResume;
    for (let i = 0; i < 6; i += 1) {
      c = cycleLanguageLevel(c, key);
      levels.push(c.languages[2].level);
    }
    expect(levels).toEqual(['basic', '', 'native', 'fluent', 'professional', 'conversational']);
    expect(deleteEntry(sampleResume, 'interests:int_2').interests.map((x) => x.id)).toEqual([
      'int_1',
      'int_3',
    ]);
  });

  it('share links keep visible languages and interests and drop hidden ones', () => {
    const layout = { ...defaultLayout(sampleResume), hiddenItems: ['lang_3'] };
    const { content } = shareableResume(sampleResume, layout);
    expect(content.languages.map((l) => l.name)).toEqual(['Swedish', 'English']);
    expect(content.interests).toHaveLength(3);
  });
});

describe('section placement', () => {
  it('moves sections between columns and keeps the sidebar first', () => {
    const html = getTemplate('meridian').render(sampleResume, {
      placement: { projects: 'side', skills: 'main' },
    });
    expect(sectionOrder(html)).toEqual([
      'projects',
      'education',
      'certifications',
      'languages',
      'interests',
      'summary',
      'experience',
      'skills',
    ]);
    expect(html.indexOf('<aside class="sidebar">')).toBeLessThan(
      html.indexOf('<main class="main">'),
    );
  });

  it('a placed full-width section joins its column; nonsense values are ignored', () => {
    const orbit = getTemplate('orbit');
    expect(markup(orbit.render(sampleResume, {}))).toContain(
      '<div class="full"><section data-section="summary">',
    );
    const placed = markup(orbit.render(sampleResume, { placement: { summary: 'main' } }));
    expect(placed).not.toContain('<div class="full">');
    expect(placed).toMatch(/<main class="main"><section data-section="summary">/);
    const junk = orbit.render(sampleResume, { placement: { skills: 'upside-down' } });
    expect(junk).toBe(orbit.render(sampleResume, {}));
    expect(orbit.render(sampleResume, { placement: ['skills'] })).toBe(
      orbit.render(sampleResume, {}),
    );
  });

  it('single-column templates ignore placement', () => {
    const clarity = getTemplate('clarity');
    expect(clarity.render(sampleResume, { placement: { skills: 'side' } })).toBe(
      clarity.render(sampleResume, {}),
    );
  });

  it('every sidebar template declares its sidebar sections for the editor', () => {
    for (const t of TEMPLATES) {
      const hasSidebar = t.render(sampleResume, {}).includes('<aside class="sidebar">');
      expect([t.id, Array.isArray(t.sideSections)]).toEqual([t.id, hasSidebar]);
    }
  });
});

describe('font, text size and spacing', () => {
  it('leave the output untouched at their defaults', () => {
    for (const t of TEMPLATES)
      expect([
        t.id,
        t.render(sampleResume, { fontScale: 1, spacing: 'normal', font: null }),
      ]).toEqual([t.id, t.render(sampleResume, {})]);
  });

  it('scale the page with zoom, keeping the screen page page-sized, and clamp extremes', () => {
    const html = getTemplate('vertex').render(sampleResume, { fontScale: 0.9 });
    expect(css(html)).toContain('html { zoom: 0.9; }');
    expect(css(html)).toContain(
      'body { width: calc(210mm / 0.9); min-height: calc(297mm / 0.9); }',
    );
    expect(css(getTemplate('vertex').render(sampleResume, { fontScale: 5 }))).toContain(
      'zoom: 1.2;',
    );
    expect(css(getTemplate('vertex').render(sampleResume, { fontScale: 'big' }))).not.toContain(
      'zoom',
    );
  });

  it('apply spacing presets after the template CSS', () => {
    const html = getTemplate('orbit').render(sampleResume, { spacing: 'compact' });
    const style = css(html);
    expect(style.indexOf('section { margin-top: 9pt; }')).toBeGreaterThan(style.indexOf('.chip {'));
    expect(css(getTemplate('orbit').render(sampleResume, { spacing: 'cosy' }))).toBe(
      css(getTemplate('orbit').render(sampleResume, {})),
    );
  });

  it('switch the body font to a listed font only', () => {
    const html = getTemplate('clarity').render(sampleResume, { font: 'Lora' });
    expect(css(html)).toContain("font-family: 'Lora', Georgia, serif");
    expect(getTemplate('clarity').render(sampleResume, { font: 'Comic Sans' })).toBe(
      getTemplate('clarity').render(sampleResume, {}),
    );
  });

  it('never position or fade anything, at any setting', () => {
    for (const t of TEMPLATES) {
      const style = css(
        t.render(sampleResume, { fontScale: 0.85, spacing: 'relaxed', font: 'Inter' }),
      ).replace(/@font-face\{[^}]*\}/g, '');
      expect([
        t.id,
        style.match(
          /(?<![-\w])(?:position:\s*(?:relative|absolute|fixed|sticky)|transform:|opacity:|z-index:)/g,
        ),
      ]).toEqual([t.id, null]);
    }
  });

  it('show up in version comparisons as settings changes', () => {
    const base = {
      content: sampleResume,
      layout: defaultLayout(sampleResume),
      templateId: 'orbit',
      pageSize: 'A4',
    };
    const changed = {
      ...base,
      layout: {
        ...base.layout,
        font: 'Lora',
        fontScale: 0.9,
        spacing: 'compact',
        placement: { projects: 'side' },
      },
    };
    expect(diffResumes(base, changed).template).toEqual([
      { field: 'font', before: null, after: 'Lora' },
      { field: 'fontScale', before: 1, after: 0.9 },
      { field: 'spacing', before: 'normal', after: 'compact' },
      { field: 'placement', before: [], after: ['projects:side'] },
    ]);
  });
});
