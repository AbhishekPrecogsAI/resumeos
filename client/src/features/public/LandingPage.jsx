import { ArrowRight, Check, Download, EyeOff, History, ShieldCheck } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { Hero } from './Hero.jsx';
import { TemplateShowcase, MakeItYours } from './LandingShowcase.jsx';
import { Faq } from './Faq.jsx';

const STEPS = [
  {
    title: 'Record your career once',
    body: 'Roles, projects, skills and education go into one profile. Every resume starts from it, so nothing gets copied and forgotten.',
  },
  {
    title: 'Pick a template and edit on the page',
    body: 'Click any line of the resume to change it. Reorder, hide or move sections, and switch templates without retyping.',
  },
  {
    title: 'Tailor it to the job',
    body: 'Paste a job description to see which of its terms your resume already covers, which your profile has but this version hides, and which you never saved.',
  },
  {
    title: 'Export, share and keep the record',
    body: 'Download a checked PDF or Word file, or send a link. The exact version you sent stays in your history.',
  },
];

const FINDINGS = [
  {
    severity: 'warning',
    where: 'Experience: Tallyhouse Payments and Northwind Freight',
    text: 'These roles overlap by 2 months. That may be accurate; reviewers sometimes ask about it.',
  },
  {
    severity: 'info',
    where: 'Experience, bullet 1',
    text: '"Cutting p95 latency from 820 ms to 310 ms" is a measurable claim with no evidence attached. This is a reminder, not a judgment.',
  },
  {
    severity: 'warning',
    where: 'Projects: queue-lens',
    text: 'This bullet is 46 words. Readers skimming tend to drop long bullets; consider splitting it.',
  },
];

const SEVERITY = {
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
    body: 'Versions are kept until you delete them. Deleting your account removes your data, and we confirm only after the server has.',
  },
  {
    icon: ShieldCheck,
    title: 'No AI rewriting your claims',
    body: 'Checks are rules you can read. Nothing edits your content without your approval.',
  },
];

const FREE_FACTS = ['No card required', 'Downloads never paywalled', 'Export your data any time'];

function SectionHeading({ id, title, lead, className }) {
  return (
    <div className={className}>
      <h2
        id={id}
        className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
      >
        {title}
      </h2>
      {lead && <p className="mt-4 max-w-2xl text-lg text-muted">{lead}</p>}
    </div>
  );
}

export function LandingPage() {
  useDocumentTitle(null);

  return (
    <div className="landing">
      <Hero />

      <TemplateShowcase />

      <section aria-labelledby="how-heading" className="l-section l-band">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            id="how-heading"
            title="From profile to sent resume in four steps"
            lead="One record feeds every version, so tailoring a resume never means starting over."
          />
          <ol className="steps mt-12">
            {STEPS.map((step, i) => (
              <li key={step.title} className="step">
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <MakeItYours />

      <section aria-labelledby="checks-heading" className="l-section l-band">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div>
            <SectionHeading
              id="checks-heading"
              title="Checks that say what they found, and where"
            />
            <p className="mt-4 text-lg text-muted">
              There is no universal "ATS score", so we don't invent one. Each finding names the
              rule, the exact place, why it matters and what you could do.
            </p>
            <p className="mt-4 text-muted">
              Job matching is reported as plain counts, like "12 of 18 job terms found". You can
              dismiss any finding, and nothing changes without your approval.
            </p>
          </div>
          <div>
            <ul className="grid gap-4" aria-label="Example findings (sample)">
              {FINDINGS.map((finding) => {
                const severity = SEVERITY[finding.severity];
                return (
                  <li key={finding.where} className={`finding finding-${finding.severity}`}>
                    <Badge tone={severity.tone}>{severity.label}</Badge>
                    <p className="mt-3 text-sm font-medium text-ink">{finding.where}</p>
                    <p className="mt-1 text-sm text-muted">{finding.text}</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-faint">
              Example findings for the fictional sample resume.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="privacy-heading" className="l-section">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            id="privacy-heading"
            title="Your career history is personal data"
            lead="We treat it that way, from logs to deletion."
          />
          <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="l-icon">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <ButtonLink to="/security" variant="link" className="group mt-10">
            Read how we handle your data
            <ArrowRight
              className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="pricing-heading" className="l-section l-band">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div className="l-card p-8">
            <h2 id="pricing-heading" className="text-sm font-medium text-muted">
              Pricing
            </h2>
            <p className="mt-2 text-5xl font-semibold tracking-tight text-ink">Free</p>
            <p className="mt-4 text-muted">
              There are no paid plans today. If paid plans come later, they'll add things like extra
              templates. They will never put your own resume download behind payment.
            </p>
            <ul className="mt-6 grid gap-2.5 text-sm text-ink">
              {FREE_FACTS.map((fact) => (
                <li key={fact} className="flex items-center gap-2">
                  <Check className="size-4 text-accent" aria-hidden="true" />
                  {fact}
                </li>
              ))}
            </ul>
            <ButtonLink to="/pricing" variant="secondary" className="mt-8">
              Pricing details
            </ButtonLink>
          </div>

          <div className="l-card p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Questions</h2>
            <Faq className="mt-4" />
          </div>
        </div>
      </section>

      <section className="l-section">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="l-cta">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Your next resume, ready to send
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg">
              Pick a template, fill it from your profile, and keep the exact version you sent.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink to="/register" size="lg" className="l-cta-primary group">
                Create my resume
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </ButtonLink>
              <ButtonLink to="/templates" size="lg" className="l-cta-secondary">
                Browse templates
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
