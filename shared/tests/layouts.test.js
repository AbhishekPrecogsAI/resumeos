import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate } from '../src/templates/index.js';
import { sampleResume } from '../src/sample/sampleResume.js';
import { defaultLayout, resolveSectionOrder } from '../src/resumeModel.js';
import {
  applyPreset,
  hideSection,
  matchingPreset,
  moveSection,
  placeSection,
  presetsFor,
  sectionColumn,
  sectionColumns,
  showSection,
  sidebarSide,
} from '../src/layouts.js';

const orbit = getTemplate('orbit');
const clarity = getTemplate('clarity');
const layout = defaultLayout(sampleResume);
const markup = (html) => html.replace(/<style>[\s\S]*?<\/style>/, '');
const sectionsIn = (html, tag) => {
  const part = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(markup(html))?.[1] ?? '';
  return [...part.matchAll(/data-section="([^"]+)"/g)].map((m) => m[1]);
};

describe('section columns', () => {
  it('follow the template, the resume placement, and single-column templates', () => {
    expect(sectionColumns(orbit, sampleResume, layout)).toEqual({
      full: ['summary'],
      // Interests is empty but listed in the order, so the editor shows it with "+ Add".
      side: ['skills', 'education', 'certifications', 'languages', 'interests'],
      main: ['experience', 'projects'],
    });
    expect(sectionColumn(orbit, { placement: { skills: 'main' } }, 'skills')).toBe('main');
    expect(sectionColumn(clarity, layout, 'skills')).toBe('main');
  });

  it('move up and down within the column shown on the page', () => {
    // Projects moves above Experience, not above Certifications from the other column.
    const up = moveSection(orbit, sampleResume, layout, 'projects', -1);
    expect(sectionColumns(orbit, sampleResume, up).main).toEqual(['projects', 'experience']);
    const down = moveSection(orbit, sampleResume, layout, 'skills', 1);
    expect(sectionColumns(orbit, sampleResume, down).side.slice(0, 2)).toEqual([
      'education',
      'skills',
    ]);
    // At either end nothing changes.
    expect(moveSection(orbit, sampleResume, layout, 'experience', -1)).toBe(layout);
    // Hidden sections are skipped over.
    const hidden = hideSection(layout, 'education');
    const skipped = moveSection(orbit, sampleResume, hidden, 'certifications', -1);
    expect(sectionColumns(orbit, sampleResume, skipped).side.slice(0, 2)).toEqual([
      'certifications',
      'skills',
    ]);
  });

  it('move between columns, storing nothing when back at the template choice', () => {
    const moved = placeSection(orbit, layout, 'skills', 'main');
    expect(moved.placement).toEqual({ skills: 'main' });
    expect(placeSection(orbit, moved, 'skills', 'side')).not.toHaveProperty('placement');
  });

  it('hide and show', () => {
    const hidden = hideSection(layout, 'projects');
    expect(hidden.hiddenSections).toEqual(['projects']);
    expect(hideSection(hidden, 'projects').hiddenSections).toEqual(['projects']);
    expect(showSection(hidden, 'projects').hiddenSections).toEqual([]);
  });
});

describe('layout presets', () => {
  it('set the order and columns, keeping custom sections and hidden ones', () => {
    const content = {
      ...sampleResume,
      customSections: [{ id: 'sec_a', title: 'Talks', items: [] }],
    };
    const base = { ...defaultLayout(content), hiddenSections: ['projects'] };
    const skills = applyPreset(orbit, content, base, 'skills');
    expect(resolveSectionOrder(content, skills).slice(0, 3)).toEqual([
      'summary',
      'skills',
      'experience',
    ]);
    expect(skills.sectionOrder.at(-1)).toBe('custom:sec_a');
    expect(skills.placement).toEqual({ skills: 'main' });
    expect(skills.hiddenSections).toEqual(['projects']);
    expect(matchingPreset(orbit, content, skills)).toBe('skills');
    // Single-column templates get the order only, and no two-column presets.
    expect(applyPreset(clarity, content, base, 'skills')).not.toHaveProperty('placement');
    expect(presetsFor(clarity).map((p) => p.id)).not.toContain('compact');
    expect(presetsFor(orbit).map((p) => p.id)).toContain('compact');
  });

  it('every preset renders and keeps the sidebar first in the document', () => {
    for (const t of TEMPLATES)
      for (const p of presetsFor(t)) {
        const html = t.render(sampleResume, applyPreset(t, sampleResume, layout, p.id));
        if (t.sideSections)
          expect([
            t.id,
            p.id,
            html.indexOf('<aside class="sidebar">') < html.indexOf('<main'),
          ]).toEqual([t.id, p.id, true]);
      }
  });
});

describe('sidebar side', () => {
  it('every two-column template declares its side and column width', () => {
    for (const t of TEMPLATES.filter((x) => x.sideSections)) {
      expect([t.id, ['left', 'right'].includes(t.sidebarSide)]).toEqual([t.id, true]);
      expect(sidebarSide(t, {})).toBe(t.sidebarSide);
    }
  });

  it('flips on screen only: the sidebar stays first in the document', () => {
    for (const t of TEMPLATES.filter((x) => x.sideSections)) {
      const other = t.sidebarSide === 'left' ? 'right' : 'left';
      const html = t.render(sampleResume, { ...layout, sidebarSide: other });
      const css = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
      expect([t.id, html.includes('class="has-sidebar flipped"')]).toEqual([t.id, true]);
      expect(css).toContain(
        `.columns .sidebar { grid-column: ${other === 'left' ? 1 : 2}; grid-row: 1; }`,
      );
      expect(html.indexOf('<aside class="sidebar">')).toBeLessThan(html.indexOf('<main'));
      // Same sections in the same places in the document as unflipped.
      const plain = t.render(sampleResume, layout);
      expect(sectionsIn(html, 'aside')).toEqual(sectionsIn(plain, 'aside'));
      expect(sectionsIn(html, 'main')).toEqual(sectionsIn(plain, 'main'));
      // Choosing the template's own side changes nothing at all.
      expect(t.render(sampleResume, { ...layout, sidebarSide: t.sidebarSide })).toBe(plain);
    }
    expect(clarity.render(sampleResume, { sidebarSide: 'left' })).toBe(
      clarity.render(sampleResume, {}),
    );
  });

  it('mirrors a full-height sidebar band', () => {
    const html = getTemplate('meridian').render(sampleResume, { ...layout, sidebarSide: 'right' });
    expect(/<style>([\s\S]*?)<\/style>/.exec(html)[1]).toMatch(
      /html \{ background: linear-gradient\(to left, var\(--accent\)/,
    );
  });
});

describe('hidden sections on the page', () => {
  it('are listed with a Show button in the editor, never in exports', () => {
    const hidden = { ...layout, hiddenSections: ['projects', 'certifications'] };
    const editable = orbit.render(sampleResume, hidden, { editable: true });
    expect(editable).toContain('<button type="button" data-show="projects">Projects');
    expect(editable).toContain('data-show="certifications"');
    expect(orbit.render(sampleResume, hidden)).not.toMatch(/ed-hidden|data-show/);
    expect(orbit.render(sampleResume, layout, { editable: true })).not.toContain('ed-hidden"');
  });
});
