import { ShieldCheck, Download, History, EyeOff } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { TemplatePreview } from '../../components/preview/TemplatePreview.jsx';
import { sampleResume, SAMPLE_LABEL } from '@resumeos/shared/sample/sampleResume.js';
import { CLARITY } from '@resumeos/shared/templates/clarity.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { RedlineResume } from './RedlineResume.jsx';
import { Faq } from './Faq.jsx';

const STEPS = [
  {
    title: 'Record your career once',
    body: 'Roles, projects, skills and education go into one structured profile. Each entry keeps a stable identity, so nothing gets copied and forgotten.',
  },
  {
    title: 'Make a version for each role',
    body: 'Start a resume from the profile, then choose what to show, reorder it and rewrite bullets for this application. The profile stays untouched.',
  },
  {
    title: 'Check it against the job',
    body: 'Paste a job description to see which of its terms already appear in your resume, which exist in your profile but are hidden, and which you never saved.',
  },
  {
    title: 'Export and keep the record',
    body: 'Download a PDF, then see what the export check found. The exact version you sent stays in your history.',
  },
];

const FINDINGS = [
  {
    severity: 'warning',
    id: 'DATE_OVERLAP_REVIEW',
    where: 'Experience, Tallyhouse Payments and Northwind Freight',
    text: 'These roles overlap by 2 months. That may be accurate; reviewers sometimes ask about it.',
  },
  {
    severity: 'info',
    id: 'CLAIM_WITHOUT_LINKED_EVIDENCE',
    where: 'Experience, bullet 1',
    text: '"cutting p95 latency from 820 ms to 310 ms" is a measurable claim with no evidence attached. This is a reminder, not a judgment.',
  },
  {
    severity: 'warning',
    id: 'VERY_LONG_BULLET',
    where: 'Projects, queue-lens',
    text: 'This bullet is 46 words. Readers skimming tend to drop long bullets; consider splitting it.',
  },
];

const SEVERITY = {
  error: { tone: 'danger', label: 'Error' },
  warning: { tone: 'warn', label: 'Warning' },
  info: { tone: 'accent', label: 'Note' },
};

const PRINCIPLES = [
  {
    icon: EyeOff,
    title: 'Your content stays out of logs',
    body: 'Resume text, job descriptions and passwords are never written to server logs.',
  },
  {
    icon: Download,
    title: 'Downloads are never paywalled',
    body: 'You can always download a resume you wrote, and export all of your data.',
  },
  {
    icon: History,
    title: 'History you control',
    body: 'Versions are kept until you delete them. Deleting your account removes your data, and we tell you only after the server confirms it.',
  },
  {
    icon: ShieldCheck,
    title: 'No AI rewriting your claims',
    body: 'Checks are deterministic rules you can read. Nothing edits your content without your approval.',
  },
];

export function LandingPage() {
  useDocumentTitle(null);

  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16 lg:pt-20">
        <div>
          <h1 className="text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.025em] text-balance text-ink sm:text-5xl lg:text-[3.5rem]">
            One career record. A resume for every role, with every change on file.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted">
            ResumeOS stores your experience as structured data, builds a tailored resume for each
            application, and keeps a readable history of what changed between them. Built for
            software engineers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/register" size="lg">
              Build your resume
            </ButtonLink>
            <ButtonLink to="/templates" size="lg" variant="secondary">
              Explore the sample
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-faint">
            Free. No card. Your downloads are never paywalled.
          </p>
        </div>
        <RedlineResume />
      </section>

      <section aria-labelledby="how-heading" className="border-y border-rule bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="how-heading" className="max-w-xl text-3xl font-semibold tracking-tight text-ink">
            From profile to sent resume, without losing track
          </h2>
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-t-2 border-ink pt-4">
                <p className="font-mono text-sm text-faint" aria-hidden="true">
                  {i + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="checks-heading"
        className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
      >
        <div>
          <h2 id="checks-heading" className="text-3xl font-semibold tracking-tight text-ink">
            Checks that say what they found, and where
          </h2>
          <p className="mt-4 text-muted">
            There is no universal "ATS score", so we don't invent one. Each finding names the rule,
            the exact location, why it matters and what you could do. Job matching is reported as
            plain counts, like "12 of 18 job terms found in this resume".
          </p>
          <p className="mt-4 text-muted">
            You can dismiss any finding. Nothing is changed without your approval.
          </p>
        </div>
        <ul className="grid gap-3" aria-label="Example findings (sample)">
          {FINDINGS.map((f) => (
            <li key={f.id} className="rounded-lg border border-rule bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={SEVERITY[f.severity].tone}>{SEVERITY[f.severity].label}</Badge>
                <code className="font-mono text-xs text-faint">{f.id}</code>
              </div>
              <p className="mt-2 text-sm font-medium text-ink">{f.where}</p>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </li>
          ))}
          <li className="text-xs text-faint">Example findings for the fictional sample resume.</li>
        </ul>
      </section>

      <section aria-labelledby="templates-heading" className="border-y border-rule bg-sunken">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center">
          <div>
            <h2 id="templates-heading" className="text-3xl font-semibold tracking-tight text-ink">
              Few templates, each tested in export
            </h2>
            <p className="mt-4 max-w-lg text-muted">
              <span className="font-medium text-ink">{CLARITY.name}</span> is a single-column layout
              with real text and standard headings in reading order. A second template was added
              only after it held up in export testing, and every template lists its trade-offs.
            </p>
            <p className="mt-4 max-w-lg text-muted">{CLARITY.tradeOffs}</p>
            <ButtonLink to="/templates" variant="secondary" className="mt-6">
              View the templates
            </ButtonLink>
          </div>
          <div>
            <div className="overflow-hidden rounded-sm shadow-paper">
              <TemplatePreview
                content={sampleResume}
                firstPageOnly
                title={`${CLARITY.name} template with sample data`}
              />
            </div>
            <p className="mt-3 text-xs text-faint">{SAMPLE_LABEL}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="privacy-heading" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2
          id="privacy-heading"
          className="max-w-xl text-3xl font-semibold tracking-tight text-ink"
        >
          Your career history is personal data. We treat it that way.
        </h2>
        <ul className="mt-10 grid gap-8 sm:grid-cols-2">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <Icon className="mt-1 size-5 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <ButtonLink to="/security" variant="link" className="mt-8">
          Read how we handle your data
        </ButtonLink>
      </section>

      <section aria-labelledby="pricing-heading" className="border-t border-rule bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-2">
          <div>
            <h2 id="pricing-heading" className="text-3xl font-semibold tracking-tight text-ink">
              Free while we build it
            </h2>
            <p className="mt-4 text-muted">
              There are no paid plans today. If paid plans come later, they will add things like
              extra templates. They will never put your own resume download behind payment.
            </p>
            <ButtonLink to="/pricing" variant="link" className="mt-6">
              Pricing details
            </ButtonLink>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-ink">Questions</h2>
            <Faq className="mt-4" />
          </div>
        </div>
      </section>
    </>
  );
}
