import {
  Database,
  FileCheck2,
  GitCompare,
  LayoutTemplate,
  Link2,
  MousePointerClick,
  Paperclip,
  ScanLine,
  Search,
} from 'lucide-react';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { CtaBand } from './CtaBand.jsx';

const FEATURES = [
  {
    icon: Database,
    tone: 'indigo',
    title: 'A profile that is the source of truth',
    points: [
      'Contact details, summary, experience, projects, skills, education, certifications, languages, interests and custom sections.',
      'Every entry has a stable identity, so resumes can tell when the profile version has changed.',
      'Profile edits never silently overwrite a resume. You decide, per resume, whether to bring a change in.',
    ],
  },
  {
    icon: LayoutTemplate,
    tone: 'violet',
    title: `${TEMPLATES.length} templates and real design controls`,
    points: [
      'Classic single columns through bold sidebars, header bands, photos and icons.',
      'Contrast-checked accent colours, page backgrounds, five fonts, text size, spacing and section columns.',
      'Fit to one page measures the real PDF, not a guess.',
    ],
  },
  {
    icon: MousePointerClick,
    tone: 'pink',
    title: 'Edit right on the page',
    points: [
      'Click any line of the resume to change it, with undo, autosave and keyboard shortcuts.',
      'Enter adds a bullet; dates, levels and sections have their own quick controls.',
      'Prefer forms? The form editor and the page editor share one draft.',
    ],
  },
  {
    icon: GitCompare,
    tone: 'amber',
    title: 'Versions you can compare and restore',
    points: [
      'Save named versions with a note, such as "Platform role, shortened projects".',
      'Compare any two versions field by field: added, removed, changed and moved, labelled in text as well as colour.',
      'Restoring an old version creates a new one. History is never rewritten.',
    ],
  },
  {
    icon: Search,
    tone: 'teal',
    title: 'Job description comparison',
    points: [
      'Paste a job description; terms are extracted with documented rules, and you can edit the list.',
      'See exact and normalised matches, terms your profile has but this resume hides, and terms you never saved.',
      'Nothing is added to your resume without your confirmation.',
    ],
  },
  {
    icon: ScanLine,
    tone: 'indigo',
    title: 'Deterministic quality checks',
    points: [
      'Structure, consistency, completeness, readability, job relevance and claims without evidence.',
      'Each finding shows severity, location, explanation and a suggested action.',
      'No composite "ATS score". Coverage is reported as counts you can verify.',
    ],
  },
  {
    icon: Paperclip,
    tone: 'violet',
    title: 'Evidence for your claims',
    points: [
      'Link a bullet to a project, URL or private note that backs it up.',
      'The app shows "Evidence attached" or not. It never claims to have verified anything.',
    ],
  },
  {
    icon: FileCheck2,
    tone: 'pink',
    title: 'Exports that are checked after they are made',
    points: [
      'PDF in A4 or US Letter from the same renderer as the preview, plus an editable Word file.',
      'Each file is reopened and its text checked for content and reading order; results are shown as found.',
      'Each export records the exact version and template it came from.',
    ],
  },
  {
    icon: Link2,
    tone: 'amber',
    title: 'Share links you control',
    points: [
      'Send a read-only link to the live resume or a saved version.',
      'Choose whether people can download a PDF, hide your email and phone, and set an expiry.',
      'See opens and downloads; turn a link off or delete it any time.',
    ],
  },
];

export function FeaturesPage() {
  useDocumentTitle('Features');
  return (
    <>
      <PageHeader
        title="Everything ResumeOS does,"
        accent="in plain terms"
        lead="A resume here is generated from structured career data, then designed, tailored, checked and shared. Here's each part."
      />
      <section aria-label="Features" className="relative isolate px-4 py-14 sm:px-6 lg:py-20">
        <div className="section-glow section-glow-left" aria-hidden="true">
          <span />
        </div>
        <ul className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, tone, title, points }) => (
            <li key={title} className="feature-card">
              <span className={`grad-tile grad-tile-${tone} grad-tile-lg`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-ink">{title}</h2>
              <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-muted">
                {points.map((p) => (
                  <li key={p} className="feature-point">
                    {p}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
      <CtaBand />
    </>
  );
}
