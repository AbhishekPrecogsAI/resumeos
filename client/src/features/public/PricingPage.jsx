import { Check, Sparkles } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { Faq } from './Faq.jsx';
import { CtaBand } from './CtaBand.jsx';

const INCLUDED = [
  'Your master profile and unlimited resumes, within fair storage limits shown in the app',
  'Every template, with colours, backgrounds, fonts and photo',
  'Version history, comparison and restore',
  'Quality checks and job description comparison',
  'PDF and Word export of anything you write',
  'Share links with download, privacy and expiry options',
  'Full JSON export of your data, and account deletion',
];

export function PricingPage() {
  useDocumentTitle('Pricing');
  return (
    <>
      <PageHeader
        title="Free while we build it."
        accent="No card, no catch."
        lead="There is no paid plan today. Everything below is included for everyone."
      />
      <section aria-label="Plan" className="relative isolate px-4 py-14 sm:px-6 lg:py-20">
        <div className="section-glow section-glow-right" aria-hidden="true">
          <span />
        </div>
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-stretch">
          <div className="price-card flex flex-col">
            <p className="text-sm font-medium text-white/80">Everything, for everyone</p>
            <p className="mt-2 text-6xl font-semibold tracking-tight text-white">Free</p>
            <p className="mt-4 text-white/85">
              If paid plans arrive later, we'll announce them before they apply to anyone, and they
              will cover optional extras. Downloading your own resume and exporting your own data
              will stay free.
            </p>
            <div className="mt-auto pt-8">
              <ButtonLink to="/register" size="lg" className="price-card-button">
                Create my resume
              </ButtonLink>
            </div>
          </div>
          <div className="glass-card p-8">
            <h2 className="flex items-center gap-3 text-xl font-semibold text-ink">
              <span className="grad-tile grad-tile-violet">
                <Sparkles className="size-[18px]" aria-hidden="true" />
              </span>
              What's included
            </h2>
            <ul className="mt-6 grid gap-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-3 text-ink">
                  <span className="check-dot">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="glass-card mx-auto mt-6 max-w-6xl p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Questions</h2>
          <Faq className="mt-4" />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
