import { PageHeader, Prose } from '../../components/layout/PageHeader.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export function PricingPage() {
  useDocumentTitle('Pricing');
  return (
    <>
      <PageHeader
        title="Pricing"
        lead="ResumeOS is free while it is being built. There is no paid plan and no card to enter."
      />
      <Prose>
        <h2>What's included</h2>
        <ul>
          <li>
            Your master profile and unlimited resumes, within fair storage limits shown in the app.
          </li>
          <li>Version history, comparison and restore.</li>
          <li>Quality checks and job description comparison.</li>
          <li>PDF export of anything you've written.</li>
          <li>Full JSON export of your data, and account deletion.</li>
        </ul>
        <h2>If paid plans arrive later</h2>
        <p>
          We'll announce them before they apply to anyone, and they'll cover optional extras.
          Downloading your own resume and exporting your own data will stay free.
        </p>
      </Prose>
      <div className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <ButtonLink to="/register">Build your resume</ButtonLink>
      </div>
    </>
  );
}
