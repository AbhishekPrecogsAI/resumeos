import { PageHeader, Prose } from '../../components/layout/PageHeader.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

const DRAFT_NOTE = 'Draft for the pre-release product. Not yet reviewed by legal counsel.';

export function PrivacyPage() {
  useDocumentTitle('Privacy');
  return (
    <>
      <PageHeader title="Privacy policy" lead={DRAFT_NOTE} />
      <Prose>
        <h2>What we collect</h2>
        <ul>
          <li>
            Account details: email address, display name, password hash, and preferences such as
            theme.
          </li>
          <li>
            Content you enter: your profile, resumes, versions, evidence notes, any job descriptions
            you choose to save, and an optional profile photo (resized in your browser before
            upload; location data in the file isn't uploaded).
          </li>
          <li>
            Export records: when you exported, which version and template, and the validation
            result. Not the file contents.
          </li>
          <li>Operational logs: request path, status and timing, without your content.</li>
        </ul>
        <h2>How we use it</h2>
        <p>
          Only to provide the service to you. We don't use your content for advertising or model
          training.
        </p>
        <h2>Retention and deletion</h2>
        <ul>
          <li>Your content stays until you delete it or delete your account.</li>
          <li>Temporary export files are deleted automatically shortly after creation.</li>
          <li>
            Deleting your account removes your profile, resumes, versions, job descriptions and
            export records, and ends all sessions.
          </li>
          <li>
            Database backups, once configured, expire on a fixed schedule; the schedule will be
            published here.
          </li>
        </ul>
        <h2>Your rights</h2>
        <p>You can view, correct, export and delete your data from Settings at any time.</p>
      </Prose>
    </>
  );
}

export function TermsPage() {
  useDocumentTitle('Terms');
  return (
    <>
      <PageHeader title="Terms of use" lead={DRAFT_NOTE} />
      <Prose>
        <h2>Your content</h2>
        <p>
          You own what you write. You are responsible for its accuracy; ResumeOS does not verify
          claims or evidence.
        </p>
        <h2>No guarantees about outcomes</h2>
        <p>
          ResumeOS does not guarantee interviews, offers, or acceptance by any applicant tracking
          system. Quality checks describe what they tested and nothing more.
        </p>
        <h2>Acceptable use</h2>
        <p>
          Don't use the service to impersonate others, misrepresent qualifications for fraud, or
          attack the service.
        </p>
        <h2>Availability</h2>
        <p>
          This is pre-release software and may change. Export your data regularly if you depend on
          it.
        </p>
      </Prose>
    </>
  );
}
