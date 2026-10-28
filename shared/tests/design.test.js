import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate } from '../src/templates/index.js';
import { sampleResume } from '../src/sample/sampleResume.js';
import { defaultLayout, emptyContent } from '../src/resumeModel.js';
import { addEntry, cycleLevel, deleteEntry } from '../src/editing.js';
import { shareableResume } from '../src/sharing.js';
import { diffResumes } from '../src/diff.js';

// The sample keeps these sections short so it fits one page; tests use a fuller copy.
const rich = {
  ...sampleResume,
  languages: [
    { id: 'lang_1', name: 'Swedish', level: 'native' },
    { id: 'lang_2', name: 'English', level: 'fluent' },
    { id: 'lang_3', name: 'Portuguese', level: 'conversational' },
  ],
  interests: [
    { id: 'int_1', name: 'Trail running' },
    { id: 'int_2', name: 'Film photography' },
    { id: 'int_3', name: 'Mentoring new engineers' },
  ],
};

const markup = (html) => html.replace(/<style>[\s\S]*?<\/style>/, '');
const css = (html) => /<style>([\s\S]*?)<\/style>/.exec(html)[1];
const sectionOrder = (html) =>
  [...markup(html).matchAll(/<section data-section="([^"]+)"/g)].map((m) => m[1]);

describe('languages and interests', () => {
  it('prints every level as a word, with dots only on templates that have an accent', () => {
    const clarity = getTemplate('clarity').render(rich, {});
    expect(markup(clarity)).toContain(
      '<dl class="langs"><div><dt>Swedish</dt><dd class="lvl">Native</dd></div>',
    );
    const orbit = getTemplate('orbit').render(rich, {});
    expect(markup(orbit)).toContain('<dl class="langs dots">');
    expect(markup(orbit)).toMatch(/<dd class="lvl">Conversational<svg class="meter dots"/);
    // Five dots, as many solid as the level: Swedish (Native) 5, Portuguese (Conversational) 2.
    const dots = [...markup(orbit).matchAll(/<svg class="meter dots"[\s\S]*?<\/svg>/g)].map(
      (m) => (m[0].match(/<circle/g) ?? []).length - (m[0].match(/fill-opacity/g) ?? []).length,
    );
    expect(dots).toEqual([5, 4, 2]);
    expect(markup(clarity)).not.toContain('<svg class="meter dots"');
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
    const plain = { ...rich, languages: [], interests: [] };
    expect(getTemplate('clarity').render(plain, {})).not.toContain('.langs');
    expect(getTemplate('clarity').render(rich, {})).toContain('.langs');
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
      const html = markup(getTemplate(id).render(rich, {}));
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
    let c = rich;
    for (let i = 0; i < 6; i += 1) {
      c = cycleLevel(c, key);
      levels.push(c.languages[2].level);
    }
    expect(levels).toEqual(['basic', '', 'native', 'fluent', 'professional', 'conversational']);
    expect(deleteEntry(rich, 'interests:int_2').interests.map((x) => x.id)).toEqual([
      'int_1',
      'int_3',
    ]);
  });

  it('share links keep visible languages and interests and drop hidden ones', () => {
    const layout = { ...defaultLayout(rich), hiddenItems: ['lang_3'] };
    const { content } = shareableResume(rich, layout);
    expect(content.languages.map((l) => l.name)).toEqual(['Swedish', 'English']);
    expect(content.interests).toHaveLength(3);
  });
});

describe('section placement', () => {
  it('moves sections between columns and keeps the sidebar first', () => {
    const html = getTemplate('meridian').render(rich, {
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
    expect(markup(orbit.render(rich, {}))).toContain(
      '<div class="full"><section data-section="summary">',
    );
    const placed = markup(orbit.render(rich, { placement: { summary: 'main' } }));
    expect(placed).not.toContain('<div class="full">');
    expect(placed).toMatch(/<main class="main"><section data-section="summary">/);
    const junk = orbit.render(rich, { placement: { skills: 'upside-down' } });
    expect(junk).toBe(orbit.render(rich, {}));
    expect(orbit.render(rich, { placement: ['skills'] })).toBe(orbit.render(rich, {}));
  });

  it('single-column templates ignore placement', () => {
    const clarity = getTemplate('clarity');
    expect(clarity.render(rich, { placement: { skills: 'side' } })).toBe(clarity.render(rich, {}));
  });

  it('every sidebar template declares its sidebar sections for the editor', () => {
    for (const t of TEMPLATES) {
      const hasSidebar = t.render(rich, {}).includes('<aside class="sidebar">');
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

describe('skill levels', () => {
  const leveled = {
    ...sampleResume,
    skills: sampleResume.skills.map((s, i) => (i < 4 ? { ...s, level: 5 - i } : s)),
  };

  it('draw rows of name and meter on accent templates, dots or bars by template', () => {
    const orbit = markup(getTemplate('orbit').render(leveled, {}));
    expect(orbit).toContain('<dl class="skills leveled">');
    expect(orbit).toMatch(/<span class="lv"><span>Node\.js<\/span><svg class="meter dots"/);
    const atlas = markup(getTemplate('atlas').render(leveled, {}));
    expect(atlas).toMatch(/<span class="lv"><span>Node\.js<\/span><svg class="meter bar"/);
    // Bar fill is level × 10 of 50.
    expect(atlas).toContain('<rect width="50" height="5" rx="2.5" fill="currentColor"/>');
    expect(atlas).toContain('<rect width="20" height="5" rx="2.5" fill="currentColor"/>');
    // A skill without a level in a leveled resume gets a row without a meter.
    const unleveled = leveled.skills[5].name;
    expect(orbit).toContain(`<span class="lv"><span>${unleveled}</span></span>`);
  });

  it('change nothing on Clarity or for resumes without levels', () => {
    const clarity = getTemplate('clarity');
    expect(clarity.render(leveled, {})).toBe(clarity.render(sampleResume, {}));
    expect(getTemplate('orbit').render({ ...sampleResume }, {})).toBe(
      getTemplate('orbit').render(sampleResume, {}),
    );
  });

  it('add no words: every template still prints exactly the same text', () => {
    const words = (html) =>
      markup(html)
        .replace(/<[^>]+>/g, ' ')
        .replace(/[,|]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .sort();
    const [first, ...rest] = TEMPLATES.map((t) => words(t.render(leveled, {})));
    for (const w of rest) expect(w).toEqual(first);
  });

  it('cycle 1 to 5 on the page, then back to no level stored', () => {
    let c = sampleResume;
    const seen = [];
    for (let i = 0; i < 6; i += 1) {
      c = cycleLevel(c, 'skills:sk_1');
      seen.push(c.skills[0].level);
    }
    expect(seen).toEqual([1, 2, 3, 4, 5, undefined]);
    expect(c.skills[0]).not.toHaveProperty('level');
  });

  it('the editor shows a clickable meter on every row once any skill has a level', () => {
    const html = markup(getTemplate('orbit').render(leveled, {}, { editable: true }));
    expect(html.match(/data-level="skills:/g)).toHaveLength(leveled.skills.length);
  });
});

describe('sections added after a resume was created', () => {
  const oldLayout = {
    sectionOrder: ['summary', 'experience', 'projects', 'skills', 'education', 'certifications'],
    hiddenSections: [],
    hiddenItems: [],
  };
  const empty = { ...sampleResume, languages: [], interests: [] };
  const editable = (content, layout) =>
    sectionOrder(getTemplate('orbit').render(content, layout, { editable: true }));

  it("don't appear on the page editor of older resumes until used", () => {
    expect(editable(empty, oldLayout)).not.toContain('languages');
    expect(editable(empty, oldLayout)).not.toContain('interests');
  });

  it('appear once they have content or are in the saved order, and on new resumes', () => {
    expect(editable(rich, oldLayout)).toEqual(expect.arrayContaining(['languages', 'interests']));
    expect(
      editable(empty, { ...oldLayout, sectionOrder: [...oldLayout.sectionOrder, 'languages'] }),
    ).toContain('languages');
    expect(editable(empty, defaultLayout(empty))).toEqual(
      expect.arrayContaining(['languages', 'interests']),
    );
  });
});
