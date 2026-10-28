import { describe, it, expect } from 'vitest';
import { shareableResume } from '../src/sharing.js';
import { sampleResume } from '../src/sample/sampleResume.js';
import { defaultLayout } from '../src/resumeModel.js';
import { getTemplate } from '../src/templates/index.js';

const withEvidence = {
  ...sampleResume,
  experience: sampleResume.experience.map((x) => ({
    ...x,
    evidenceIds: ['ev_1'],
    bullets: x.bullets.map((b) => ({ ...b, evidenceIds: ['ev_1'] })),
  })),
  customSections: [
    { id: 'sec_a', title: 'Talks', items: [{ id: 'itm_a', title: 'Public talk', bullets: [] }] },
    { id: 'sec_b', title: 'Private notes', items: [{ id: 'itm_b', title: 'Hidden item' }] },
  ],
};

describe('shareableResume', () => {
  it('removes hidden sections, hidden entries and evidence links', () => {
    const hiddenEntry = withEvidence.experience[1];
    const layout = {
      ...defaultLayout(withEvidence),
      hiddenSections: ['certifications', 'custom:sec_b'],
      hiddenItems: [hiddenEntry.id],
      showPhoto: true,
    };
    const { content, layout: out } = shareableResume(withEvidence, layout);
    const text = JSON.stringify(content);
    expect(text).not.toContain(hiddenEntry.company);
    expect(text).not.toContain('Private notes');
    expect(text).not.toContain('evidenceIds');
    expect(content.certifications).toEqual([]);
    expect(content.customSections.map((s) => s.title)).toEqual(['Talks']);
    expect(out).toMatchObject({ hiddenItems: [], showPhoto: true });
    expect(out.sectionOrder).not.toContain('custom:sec_b');
    expect(out.sectionOrder).not.toContain('certifications');
  });

  it('renders exactly what the owner sees, apart from contact details when hidden', () => {
    const layout = { ...defaultLayout(sampleResume), hiddenItems: [sampleResume.projects[0].id] };
    const orbit = getTemplate('orbit');
    const shared = shareableResume(sampleResume, layout);
    expect(orbit.render(shared.content, shared.layout)).toBe(orbit.render(sampleResume, layout));

    const withPhone = {
      ...sampleResume,
      contact: { ...sampleResume.contact, phone: '+44 20 7946 0000' },
    };
    expect(orbit.render(withPhone, layout)).toContain('+44 20 7946 0000');
    const private_ = shareableResume(withPhone, layout, { hideContactDetails: true });
    const html = orbit.render(private_.content, private_.layout);
    expect(html).not.toContain(sampleResume.contact.email);
    expect(html).not.toContain('+44 20 7946 0000');
    expect(html).toContain(sampleResume.contact.name);
  });
});
