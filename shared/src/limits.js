// Bounds on stored content. Shared so the UI can warn before the server rejects.
export const LIMITS = {
  shortText: 200,
  url: 500,
  headline: 200,
  summary: 3000,
  description: 2000,
  bullet: 1000,
  bulletsPerEntry: 30,
  entriesPerSection: 50,
  skills: 200,
  customSections: 10,
  evidenceItems: 200,
  evidencePerBullet: 10,
  technologies: 40,
};

// Advisory only: shown as hints, never enforced.
export const ADVISORY = {
  bulletChars: 220,
  summaryChars: 600,
};
