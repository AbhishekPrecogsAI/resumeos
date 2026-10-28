import { PageHeader, Prose } from '../../components/layout/PageHeader.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export function SecurityPage() {
  useDocumentTitle('Security');
  return (
    <>
      <PageHeader
        title="Security and privacy"
        lead="Your resume holds your contact details and work history. Here is how the application protects them."
      />
      <Prose>
        <h2>Accounts and sessions</h2>
        <ul>
          <li>Passwords are hashed with Argon2id. We never store or log them in plain text.</li>
          <li>
            Sessions use HttpOnly, SameSite cookies, so page scripts cannot read your session.
          </li>
          <li>Changing your password or signing out everywhere revokes other sessions.</li>
          <li>
            Sign-in and registration are rate-limited. A failed sign-in doesn't say whether the
            email is registered; registration does say when an address is already in use, because
            without email verification there's no other way to let you know.
          </li>
        </ul>
        <h2>Your data</h2>
        <ul>
          <li>
            Every request is checked against the signed-in account; you can only read and change
            your own records.
          </li>
          <li>Resume text, job descriptions, passwords and tokens are kept out of server logs.</li>
          <li>Exported files are kept only briefly for download and then deleted.</li>
          <li>
            You can export all of your data as JSON, and delete your account and everything in it.
          </li>
        </ul>
        <h2>What we don't do</h2>
        <ul>
          <li>We don't sell or share your data.</li>
          <li>We don't send your content to AI services.</li>
          <li>We don't run third-party trackers. Fonts are served from our own origin.</li>
        </ul>
        <h2>Reporting a problem</h2>
        <p>
          This is a pre-release product. A security contact address will be published here before
          public launch.
        </p>
      </Prose>
    </>
  );
}
