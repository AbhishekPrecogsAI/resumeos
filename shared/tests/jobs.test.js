import { describe, it, expect } from 'vitest';
import { extractTerms, customTerm } from '../src/jobs/extract.js';
import { matchKind, countMatches } from '../src/jobs/match.js';
import { coverage } from '../src/jobs/coverage.js';
import { applySuggestions } from '../src/jobs/tailor.js';
import { findDictionaryEntry } from '../src/jobs/dictionary.js';
import { defaultLayout } from '../src/resumeModel.js';
import { buildBaselines } from '../src/sync.js';
import { sampleResume } from '../src/sample/sampleResume.js';

const JD = `Senior Backend Engineer (sample posting)

We're a logistics company building APIs used by carriers worldwide.

Requirements:
- 5+ years building services in Node.js or Go
- Strong PostgreSQL and data modeling experience
- Experience running workloads on Kubernetes in AWS
- Comfortable with CI/CD and on-call

Nice to have:
- Kafka or RabbitMQ
- Terraform
- Experience with Snowflake. Snowflake is used by our analytics team.

Our stack: NodeJS, Postgres, K8s, Terraform, Kafka.`;

const byTerm = (terms) => Object.fromEntries(terms.map((t) => [t.term, t]));

describe('matching boundaries', () => {
  it('does not match inside other words or languages', () => {
    expect(countMatches('JavaScript developer', 'Java', true)).toBe(0);
    expect(countMatches('C++ and C#', 'C', true)).toBe(0);
    expect(countMatches('Experience with C and C++', 'C', true)).toBe(1);
    expect(countMatches('going to market', 'Go', true)).toBe(0);
    expect(countMatches('Services in Go.', 'Go', true)).toBe(1);
    expect(countMatches('Built with Node.js.', 'Node.js')).toBe(1);
  });

  it('distinguishes exact from normalized matches', () => {
    const node = findDictionaryEntry('Node.js');
    expect(matchKind('Node.js services', node)).toBe('exact');
    expect(matchKind('NodeJS services', node)).toBe('normalized');
    expect(matchKind('node-js services', { term: 'Node.js', variants: [] })).toBe('normalized');
    expect(matchKind('Python services', node)).toBeNull();
  });

  it('does not report JavaScript for text that only mentions Node.js', () => {
    expect(matchKind('Services in Node.js', findDictionaryEntry('JavaScript'))).toBeNull();
    expect(matchKind('Services in JS and Node.js', findDictionaryEntry('JavaScript'))).toBe(
      'normalized',
    );
  });

  it('treats ambiguous names as case-sensitive', () => {
    const go = findDictionaryEntry('Go');
    expect(matchKind('let go of legacy', go)).toBeNull();
    expect(matchKind('written in Golang', go)).toBe('normalized');
  });
});

describe('extractTerms', () => {
  const terms = extractTerms(JD);
  const t = byTerm(terms);

  it('finds dictionary terms including variants', () => {
    expect(Object.keys(t)).toEqual(
      expect.arrayContaining([
        'Node.js',
        'Go',
        'PostgreSQL',
        'Kubernetes',
        'AWS',
        'CI/CD',
        'Kafka',
        'RabbitMQ',
        'Terraform',
        'data modeling',
        'incident response',
      ]),
    );
    expect(t['Node.js'].matchedForms).toEqual(expect.arrayContaining(['Node.js', 'NodeJS']));
    expect(t.Kubernetes.matchedForms).toEqual(expect.arrayContaining(['Kubernetes', 'K8s']));
  });

  it('never double-counts text claimed by a longer term', () => {
    // "JS" inside "Node.js" must not produce a JavaScript match; K8s/k8s is one occurrence.
    expect(t.JavaScript).toBeUndefined();
    expect(t['Node.js'].count).toBe(2);
    expect(t.Kubernetes.count).toBe(2);
    expect(t['incident response'].count).toBe(1);
  });

  it('marks importance from headings', () => {
    expect(t.PostgreSQL.importance).toBe('required');
    expect(t.Kafka.importance).toBe('preferred');
    // Terraform is in "Nice to have" and in the stack line under it.
    expect(t.Terraform.importance).toBe('preferred');
  });

  it('adds repeated capitalised words as candidates', () => {
    expect(t.Snowflake.source).toBe('dictionary');
    const candidates = terms.filter((x) => x.source === 'candidate').map((x) => x.term);
    expect(candidates).not.toContain('Experience');
    expect(candidates).not.toContain('Senior');
  });

  it('is deterministic and capped', () => {
    expect(extractTerms(JD)).toEqual(terms);
    expect(extractTerms('x '.repeat(30000)).length).toBeLessThanOrEqual(80);
  });

  it('returns nothing for empty input', () => {
    expect(extractTerms('')).toEqual([]);
  });

  it('builds custom terms, reusing dictionary variants when known', () => {
    expect(customTerm('postgres')).toMatchObject({ term: 'PostgreSQL', source: 'user' });
    expect(customTerm('Temporal')).toMatchObject({
      term: 'Temporal',
      variants: [],
      source: 'user',
    });
  });
});

describe('coverage', () => {
  const profile = structuredClone(sampleResume);
  profile.experience.push({
    id: 'exp_old',
    company: 'Old Co',
    title: 'Developer',
    location: '',
    employmentType: '',
    startDate: '2015-01',
    endDate: '2018-12',
    current: false,
    bullets: [{ id: 'b_k', text: 'Ran Kafka clusters', evidenceIds: [] }],
  });
  const resumeContent = structuredClone(sampleResume);
  const terms = ['Node.js', 'Go', 'Kubernetes', 'Kafka', 'RabbitMQ', 'Elixir'].map((x) =>
    findDictionaryEntry(x),
  );

  it('separates in-resume, in-profile and not-found, with exact vs normalized', () => {
    const layout = { ...defaultLayout(resumeContent), hiddenSections: ['projects'] };
    const r = coverage(terms, { content: resumeContent, layout }, profile);
    const s = Object.fromEntries(r.results.map((x) => [x.term.term, x]));
    expect(s['Node.js']).toMatchObject({ status: 'in-resume', match: 'exact' });
    expect(s.Kubernetes.status).toBe('in-resume');
    // RabbitMQ only appears in the hidden Projects section.
    expect(s.RabbitMQ.status).toBe('in-profile');
    expect(s.RabbitMQ.suggestions).toEqual([
      { type: 'showSection', section: 'projects', label: 'Show the Projects section' },
    ]);
    // Kafka only exists in a profile role that this resume doesn't include.
    expect(s.Kafka.suggestions).toEqual([
      expect.objectContaining({ type: 'addFromProfile', section: 'experience', id: 'exp_old' }),
    ]);
    expect(s.Elixir).toMatchObject({ status: 'not-found', suggestions: [] });
    expect(r.counts).toMatchObject({ total: 6, notFound: 1, inProfile: 2 });
    expect(r.counts.exact + r.counts.normalized).toBe(r.counts.inResume);
  });

  it('suggests showing a hidden entry', () => {
    const content = structuredClone(profile);
    const layout = { ...defaultLayout(content), hiddenItems: ['exp_old'] };
    const kafka = coverage([findDictionaryEntry('Kafka')], { content, layout }, profile).results[0];
    expect(kafka.suggestions).toEqual([
      expect.objectContaining({ type: 'showItem', id: 'exp_old' }),
    ]);
  });

  it('applies only approved suggestions, reusing profile content', () => {
    const draft = {
      content: resumeContent,
      layout: { ...defaultLayout(resumeContent), hiddenSections: ['projects'] },
      baselines: buildBaselines(resumeContent),
    };
    const next = applySuggestions(draft, profile, [
      { type: 'showSection', section: 'projects' },
      { type: 'addFromProfile', section: 'experience', id: 'exp_old' },
    ]);
    expect(next.layout.hiddenSections).toEqual([]);
    expect(next.content.experience.map((e) => e.id)).toContain('exp_old');
    expect(next.content.experience.find((e) => e.id === 'exp_old')).toEqual(
      profile.experience.find((e) => e.id === 'exp_old'),
    );
    expect(draft.content.experience.map((e) => e.id)).not.toContain('exp_old');
  });
});
