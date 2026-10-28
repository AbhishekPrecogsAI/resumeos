import { describe, it, expect } from 'vitest';
import { diffResumes, wordDiff } from '../src/diff.js';
import { defaultLayout } from '../src/resumeModel.js';
import { sampleResume } from '../src/sample/sampleResume.js';

const state = (content = structuredClone(sampleResume), layout = defaultLayout(content)) => ({
  content,
  layout,
  templateId: 'clarity',
  pageSize: 'A4',
});
const section = (diff, key) => diff.sections.find((s) => s.key === key);

describe('wordDiff', () => {
  it('marks inserted and deleted words', () => {
    expect(wordDiff('cut latency by 30%', 'cut p95 latency by 62%')).toEqual([
      { type: 'same', text: 'cut ' },
      { type: 'add', text: 'p95 ' },
      { type: 'same', text: 'latency by ' },
      { type: 'del', text: '30%' },
      { type: 'add', text: '62%' },
    ]);
  });
  it('round-trips both sides', () => {
    const tokens = wordDiff('a b c d', 'a x c y d');
    expect(
      tokens
        .filter((t) => t.type !== 'add')
        .map((t) => t.text)
        .join(''),
    ).toBe('a b c d');
    expect(
      tokens
        .filter((t) => t.type !== 'del')
        .map((t) => t.text)
        .join(''),
    ).toBe('a x c y d');
  });
  it('falls back to replace for very long text', () => {
    const long = 'word '.repeat(400);
    expect(wordDiff(long, `${long}more`).map((t) => t.type)).toEqual(['del', 'add']);
  });
});

describe('diffResumes', () => {
  it('reports identical states', () => {
    const d = diffResumes(state(), state());
    expect(d.identical).toBe(true);
    expect(d.sections.every((s) => s.status === 'unchanged')).toBe(true);
  });

  it('detects added, removed, modified and reordered entries by id', () => {
    const left = state();
    const right = state();
    right.content.experience.reverse();
    right.content.experience[0].title = 'Staff Backend Engineer';
    right.content.projects = [];
    right.content.skills.push({
      id: 'sk_new',
      name: 'Rust',
      category: 'Languages',
      context: '',
      evidenceIds: [],
    });
    const d = diffResumes(left, right);
    const exp = section(d, 'experience');
    // Swapping two entries is one move: the edited entry is reported as modified and moved.
    expect(exp.entries).toEqual([
      expect.objectContaining({ id: 'exp_2', status: 'modified', moved: true }),
    ]);
    expect(exp.entries.find((e) => e.id === 'exp_2').fields).toEqual([
      expect.objectContaining({
        field: 'title',
        before: 'Backend Engineer',
        after: 'Staff Backend Engineer',
      }),
    ]);
    expect(section(d, 'projects').entries).toEqual([
      expect.objectContaining({ id: 'prj_1', status: 'removed' }),
    ]);
    expect(section(d, 'skills').entries).toEqual([
      expect.objectContaining({ id: 'sk_new', status: 'added' }),
    ]);
    expect(d.summary).toEqual({ added: 1, removed: 1, modified: 1, reordered: 0 });
  });

  it('reports the minimal set of moved entries', () => {
    const right = state();
    right.content.skills = [...right.content.skills.slice(1), right.content.skills[0]];
    const entries = section(diffResumes(state(), right), 'skills').entries;
    expect(entries).toEqual([expect.objectContaining({ id: 'sk_1', status: 'reordered' })]);
  });

  it('diffs bullets with word changes and moves', () => {
    const right = state();
    const bullets = right.content.experience[0].bullets;
    bullets[0].text = bullets[0].text.replace('310 ms', '290 ms');
    bullets.push({ id: 'b_new', text: 'Mentored two engineers.', evidenceIds: [] });
    [bullets[1], bullets[2]] = [bullets[2], bullets[1]];
    const entry = section(diffResumes(state(), right), 'experience').entries[0];
    const statuses = entry.bullets.map((b) => b.status).sort();
    expect(statuses).toEqual(['added', 'modified', 'reordered']);
    const modified = entry.bullets.find((b) => b.status === 'modified');
    expect(
      modified.words.filter((w) => w.type !== 'same').map((w) => `${w.type}:${w.text}`),
    ).toEqual(['del:310', 'add:290']);
  });

  it('reports contact and summary field changes', () => {
    const right = state();
    right.content.contact.location = 'Berlin, Germany';
    right.content.summary = `${right.content.summary} Now focused on platform work.`;
    const d = diffResumes(state(), right);
    expect(section(d, 'contact').fields).toEqual([
      expect.objectContaining({ field: 'location', after: 'Berlin, Germany' }),
    ]);
    expect(section(d, 'summary').fields[0].words.some((w) => w.type === 'add')).toBe(true);
  });

  it('separates layout and template changes from content', () => {
    const right = state();
    right.layout = {
      ...right.layout,
      sectionOrder: ['skills', ...right.layout.sectionOrder.filter((k) => k !== 'skills')],
      hiddenSections: ['projects'],
      hiddenItems: ['exp_2'],
    };
    right.pageSize = 'Letter';
    const d = diffResumes(state(), right);
    expect(d.sections.every((s) => s.status === 'unchanged')).toBe(true);
    expect(d.layout.orderChanged).toBe(true);
    expect(d.layout.visibility).toEqual([
      { section: 'projects', title: 'Projects', before: 'shown', after: 'hidden' },
    ]);
    expect(d.layout.itemsHidden).toBe(1);
    expect(d.template).toEqual([{ field: 'pageSize', before: 'A4', after: 'Letter' }]);
    expect(d.identical).toBe(false);
  });

  it('handles custom sections added and removed', () => {
    const left = state();
    left.content.customSections = [
      { id: 'sec_a', title: 'Talks', items: [{ id: 'itm_1', title: 'NodeConf', bullets: [] }] },
    ];
    const right = state();
    right.content.customSections = [{ id: 'sec_b', title: 'Awards', items: [] }];
    const d = diffResumes(left, right);
    expect(section(d, 'custom:sec_a').status).toBe('removed');
    expect(section(d, 'custom:sec_b').status).toBe('added');
  });
});
