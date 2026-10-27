import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

const FEATURES = [
  {
    title: 'A profile that is the source of truth',
    points: [
      'Contact details, headline, summary, experience, projects, skills, education, certifications and custom sections.',
      'Every entry has a stable identity, so resumes can tell when the profile version of an entry has changed.',
      'Profile edits never silently overwrite a resume. You decide, per resume, whether to bring a change in.',
    ],
  },
  {
    title: 'Versions you can compare and restore',
    points: [
      'Save named versions with an optional note, such as "Platform role, shortened projects".',
      'Compare any two versions at section and field level: added, removed, changed and reordered content, each labelled in text as well as colour.',
      'Restoring an old version creates a new one. History is not rewritten.',
    ],
  },
  {
    title: 'Evidence you attach to your claims',
    points: [
      'Link a bullet to a project, URL or private note that backs it up.',
      'The app shows "Evidence attached" or "No evidence attached". It never claims to have verified anything.',
    ],
  },
  {
    title: 'Deterministic quality checks',
    points: [
      'Separate categories: structure, consistency, completeness, readability, job relevance, and claims without evidence.',
      'Each finding shows severity, location, explanation and a suggested action.',
      'No composite "ATS score". Coverage is reported as counts you can verify.',
    ],
  },
  {
    title: 'Job description comparison',
    points: [
      'Paste a job description; terms are extracted with documented rules, and you can edit the list.',
      'Results separate exact matches, normalized matches (Node.js and NodeJS), terms in your profile but hidden from this resume, and terms not found in your saved profile.',
      'Nothing is added to your resume without your confirmation. Saving the job description is optional.',
    ],
  },
  {
    title: 'Exports that are checked after they are made',
    points: [
      'PDF export in A4 or US Letter, generated from the same renderer as the live preview.',
      'After export, the file is reopened and its text checked for content and section order. Results are reported as found, including warnings.',
      'Each export records the exact version and template it came from.',
    ],
  },
];

export function FeaturesPage() {
  useDocumentTitle('Features');
  return (
    <>
      <PageHeader
        title="What ResumeOS does"
        lead="A resume here is an output generated from structured career data. Everything below follows from that."
      />
      <div className="mx-auto grid max-w-6xl gap-x-14 gap-y-12 px-4 py-14 sm:px-6 md:grid-cols-2">
        {FEATURES.map((f) => (
          <section key={f.title} aria-labelledby={`f-${f.title}`}>
            <h2 id={`f-${f.title}`} className="text-xl font-semibold text-ink">
              {f.title}
            </h2>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-muted marker:text-faint">
              {f.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <ButtonLink to="/register" size="lg">
          Build your resume
        </ButtonLink>
      </div>
    </>
  );
}
