import { describe, it, expect } from 'vitest';
import {
  buildBaselines,
  compareWithProfile,
  pullFromProfile,
  acknowledgeProfile,
} from '../src/sync.js';
import { contentHash, stableStringify } from '../src/hash.js';
import { emptyContent } from '../src/resumeModel.js';

function profile() {
  const c = emptyContent();
  c.summary = 'Backend engineer.';
  c.experience = [
    {
      id: 'exp_a',
      company: 'Northwind',
      title: 'Engineer',
      bullets: [{ id: 'b_1', text: 'Built APIs', evidenceIds: [] }],
    },
    { id: 'exp_b', company: 'Tallyhouse', title: 'Engineer', bullets: [] },
  ];
  return c;
}

describe('hash', () => {
  it('is independent of key order', () => {
    expect(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(
      stableStringify({ a: [2, { c: 2, d: 1 }], b: 1 }),
    );
    expect(contentHash({ a: 1, b: 2 })).toBe(contentHash({ b: 2, a: 1 }));
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
  });
});

describe('profile sync', () => {
  it('reports nothing for an unchanged copy', () => {
    const p = profile();
    expect(compareWithProfile(structuredClone(p), p, buildBaselines(p))).toEqual([]);
  });

  it('detects an upstream profile change that is safe to pull', () => {
    const p = profile();
    const resume = structuredClone(p);
    const baselines = buildBaselines(p);
    p.experience[0].title = 'Senior Engineer';
    const [change] = compareWithProfile(resume, p, baselines);
    expect(change).toMatchObject({ section: 'experience', id: 'exp_a', status: 'profile-updated' });
    const pulled = pullFromProfile(resume, p, baselines, change);
    expect(pulled.content.experience[0].title).toBe('Senior Engineer');
    expect(compareWithProfile(pulled.content, p, pulled.baselines)).toEqual([]);
  });

  it('marks local customisation and conflicts separately', () => {
    const p = profile();
    const resume = structuredClone(p);
    const baselines = buildBaselines(p);
    resume.experience[1].title = 'Platform Engineer';
    expect(compareWithProfile(resume, p, baselines)).toEqual([
      expect.objectContaining({ id: 'exp_b', status: 'customised' }),
    ]);
    p.experience[1].title = 'Staff Engineer';
    expect(compareWithProfile(resume, p, baselines)).toEqual([
      expect.objectContaining({ id: 'exp_b', status: 'conflict' }),
    ]);
  });

  it('acknowledging keeps the resume version and dismisses the update', () => {
    const p = profile();
    const resume = structuredClone(p);
    let baselines = buildBaselines(p);
    p.summary = 'Platform engineer.';
    expect(compareWithProfile(resume, p, baselines)[0]).toMatchObject({
      section: 'summary',
      status: 'profile-updated',
    });
    baselines = acknowledgeProfile(baselines, p, { section: 'summary', id: null });
    expect(compareWithProfile(resume, p, baselines)).toEqual([
      expect.objectContaining({ status: 'customised' }),
    ]);
    expect(resume.summary).toBe('Backend engineer.');
  });

  it('lists profile entries missing from the resume and entries removed from the profile', () => {
    const p = profile();
    const resume = structuredClone(p);
    const baselines = buildBaselines(p);
    resume.experience = resume.experience.filter((e) => e.id !== 'exp_b');
    p.experience = p.experience.filter((e) => e.id !== 'exp_a');
    // exp_b was removed from the resume on purpose, so it's only re-suggested once the profile changes it.
    expect(compareWithProfile(resume, p, baselines).map((c) => `${c.id}:${c.status}`)).toEqual([
      'exp_a:removed-from-profile',
    ]);
    p.experience[0].title = 'Principal Engineer';
    const statuses = compareWithProfile(resume, p, baselines)
      .map((c) => `${c.id}:${c.status}`)
      .sort();
    expect(statuses).toEqual(['exp_a:removed-from-profile', 'exp_b:not-in-resume']);
  });
});

describe('acknowledging list changes', () => {
  it('"leave it out" hides a new profile entry until it changes again', () => {
    const p = profile();
    const resume = structuredClone(p);
    let baselines = buildBaselines(p);
    p.experience.push({ id: 'exp_new', company: 'New Co', title: 'Engineer', bullets: [] });
    expect(compareWithProfile(resume, p, baselines).map((c) => c.status)).toEqual([
      'not-in-resume',
    ]);
    baselines = acknowledgeProfile(baselines, p, { section: 'experience', id: 'exp_new' });
    expect(compareWithProfile(resume, p, baselines)).toEqual([]);
    p.experience[2].title = 'Lead Engineer';
    expect(compareWithProfile(resume, p, baselines).map((c) => c.status)).toEqual([
      'not-in-resume',
    ]);
  });

  it('an entry removed from the resume on purpose is not re-suggested', () => {
    const p = profile();
    const resume = structuredClone(p);
    resume.experience = resume.experience.slice(1);
    expect(compareWithProfile(resume, p, buildBaselines(p))).toEqual([]);
  });

  it('"keep it" for an entry deleted from the profile dismisses the notice', () => {
    const p = profile();
    const resume = structuredClone(p);
    let baselines = buildBaselines(p);
    p.experience = p.experience.slice(1);
    expect(compareWithProfile(resume, p, baselines).map((c) => c.status)).toEqual([
      'removed-from-profile',
    ]);
    baselines = acknowledgeProfile(baselines, p, { section: 'experience', id: 'exp_a' });
    expect(compareWithProfile(resume, p, baselines)).toEqual([]);
  });
});
