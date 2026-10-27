import { describe, it, expect } from 'vitest';
import { profileCompletion } from '../src/completion.js';
import { emptyContent } from '../src/resumeModel.js';
import { sampleResume } from '../src/sample/sampleResume.js';
import { newId, ID_PATTERN } from '../src/ids.js';

describe('profileCompletion', () => {
  it('reports every rule as missing for an empty profile', () => {
    const r = profileCompletion(emptyContent());
    expect(r.done).toBe(0);
    expect(r.total).toBe(r.items.length);
  });
  it('reports the sample profile as complete', () => {
    const r = profileCompletion(sampleResume);
    expect(r.items.filter((i) => !i.done)).toEqual([]);
  });
  it('requires a real role, not an empty entry', () => {
    const c = emptyContent();
    c.experience = [{ id: 'exp_1', title: '', company: 'X', startDate: '2020-01', bullets: [] }];
    expect(profileCompletion(c).items.find((i) => i.id === 'experience').done).toBe(false);
  });
});

describe('newId', () => {
  it('produces unique, well-formed ids', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId('exp')));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(ID_PATTERN);
  });
});
