import { describe, it, expect } from 'vitest';
import {
  setField,
  getField,
  addEntry,
  deleteEntry,
  moveEntry,
  addBullet,
  removeBullet,
  addSkill,
  removeSkill,
  getDates,
  setDates,
  addCustomSection,
  splitPath,
} from '../src/editing.js';
import { sampleResume } from '../src/sample/sampleResume.js';
import { defaultLayout } from '../src/resumeModel.js';
import { TEMPLATES } from '../src/templates/index.js';

const c = () => structuredClone(sampleResume);

describe('on-page editing', () => {
  it('sets every field the editable renderer exposes, without mutating input', () => {
    const content = c();
    const html = TEMPLATES[0].render(content, {}, { editable: true });
    const paths = [...html.matchAll(/data-edit="([^"]+)"/g)].map((m) =>
      m[1].replace(/&amp;/g, '&'),
    );
    expect(paths.length).toBeGreaterThan(40);
    for (const path of paths) {
      const next = setField(content, path, 'Edited Ø');
      // Renaming a category changes its path, so read it back under the new name.
      const readBack = path.startsWith('skillcat:')
        ? `skillcat:${encodeURIComponent('Edited Ø')}`
        : path;
      expect([path, getField(next, readBack)]).toEqual([path, 'Edited Ø']);
    }
    expect(content).toEqual(sampleResume);
  });

  it('renames a skill category across its skills', () => {
    const next = setField(c(), `skillcat:${encodeURIComponent('Data')}`, 'Databases');
    expect(next.skills.filter((s) => s.category === 'Databases').map((s) => s.name)).toEqual([
      'PostgreSQL',
      'MongoDB',
      'Redis',
    ]);
  });

  it('parses technologies as a list', () => {
    expect(
      setField(c(), 'projects:prj_1:technologies', 'Go,  Rust , ').projects[0].technologies,
    ).toEqual(['Go', 'Rust']);
  });

  it('adds, moves and deletes entries', () => {
    const { content, focus } = addEntry(c(), 'experience');
    expect(content.experience).toHaveLength(3);
    expect(focus).toMatch(/^experience:exp_[A-Za-z0-9]+:title$/);
    const id = focus.split(':')[1];
    const moved = moveEntry(content, `experience:${id}`, -1);
    expect(moved.experience[1].id).toBe(id);
    expect(moveEntry(moved, 'experience:exp_1', -1)).toEqual(moved);
    expect(deleteEntry(moved, `experience:${id}`).experience.map((e) => e.id)).toEqual([
      'exp_1',
      'exp_2',
    ]);
  });

  it('adds a bullet after the current one and removes it, moving focus back', () => {
    const { content, focus } = addBullet(c(), 'experience:exp_1', 'b_s1');
    const bullets = content.experience[0].bullets;
    expect(bullets[1].text).toBe('');
    expect(focus).toBe(`experience:exp_1:bullets:${bullets[1].id}:text`);
    const removed = removeBullet(content, 'experience:exp_1', bullets[1].id);
    expect(removed.content.experience[0].bullets).toHaveLength(3);
    expect(removed.focus).toBe('experience:exp_1:bullets:b_s1:text');
  });

  it('adds and removes skills within a category', () => {
    const { content, focus } = addSkill(c(), 'Data', 'sk_4');
    expect(content.skills[4]).toMatchObject({ name: '', category: 'Data' });
    const id = focus.split(':')[1];
    expect(removeSkill(content, id).focus).toBe('skills:sk_4:name');
  });

  it('reads and writes dates, clearing the end date for current roles', () => {
    expect(getDates(c(), 'experience:exp_2')).toMatchObject({
      start: '2019-01',
      end: '2022-02',
      current: false,
    });
    const next = setDates(c(), 'experience:exp_2', {
      start: '2019-03',
      end: '2022-02',
      current: true,
    });
    expect(next.experience[1]).toMatchObject({ startDate: '2019-03', endDate: '', current: true });
    expect(getDates(c(), 'certifications:cert_1')).toMatchObject({
      start: '2023-05',
      hasCurrent: false,
    });
  });

  it('adds a custom section with a first entry and puts it in the layout', () => {
    const out = addCustomSection(c(), defaultLayout(c()));
    expect(out.content.customSections).toHaveLength(1);
    expect(out.layout.sectionOrder.at(-1)).toBe(`custom:${out.content.customSections[0].id}`);
    expect(splitPath(out.focus)).toMatchObject({ sectionId: out.content.customSections[0].id });
    const itemPath = `custom:${out.content.customSections[0].id}:${out.content.customSections[0].items[0].id}:title`;
    expect(getField(setField(out.content, itemPath, 'Talk'), itemPath)).toBe('Talk');
  });

  it('every template exposes the same editable fields', () => {
    const fields = (t) =>
      [...t.render(c(), {}, { editable: true }).matchAll(/data-edit="([^"]+)"/g)]
        .map((m) => m[1])
        .sort();
    const [first, ...rest] = TEMPLATES.map(fields);
    for (const f of rest) expect(f).toEqual(first);
  });

  it('editable markup escapes user text', () => {
    const content = c();
    content.experience[0].title = '<img src=x onerror=alert(1)>';
    const html = TEMPLATES[0].render(content, {}, { editable: true });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });
});
