import { CircleSlash, Database, KeyRound, LifeBuoy } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

const GROUPS = [
  {
    icon: KeyRound,
    tone: 'indigo',
    title: 'Accounts and sessions',
    points: [
      'Passwords are hashed with Argon2id. We never store or log them in plain text.',
      'Sessions use HttpOnly, SameSite cookies, so page scripts cannot read your session.',
      'Changing your password or signing out everywhere revokes other sessions.',
      "Sign-in and registration are rate-limited. A failed sign-in doesn't say whether the email is registered; registration does say when an address is already in use, because without email verification there's no other way to let you know.",
    ],
  },
  {
    icon: Database,
    tone: 'violet',
    title: 'Your data',
    points: [
      'Every request is checked against the signed-in account; you can only read and change your own records.',
      'Resume text, job descriptions, passwords and tokens are kept out of server logs.',
      'Exported files are kept only briefly for download and then deleted.',
      'Share links show only what the page shows, ask search engines not to index them, and stop working the moment you turn them off.',
      'You can export all of your data as JSON, and delete your account and everything in it.',
    ],
  },
  {
    icon: CircleSlash,
    tone: 'pink',
    title: "What we don't do",
    points: [
      "We don't sell or share your data.",
      "We don't send your content to AI services.",
      "We don't run third-party trackers. Fonts are served from our own origin.",
    ],
  },
  {
    icon: LifeBuoy,
    tone: 'amber',
    title: 'Reporting a problem',
    points: [
      'This is a pre-release product. A security contact address will be published here before public launch.',
    ],
  },
];

export function SecurityPage() {
  useDocumentTitle('Security');
  return (
    <>
      <PageHeader
        title="Security and privacy,"
        accent="built in from the start"
        lead="Your resume holds your contact details and work history. Here's how ResumeOS protects them."
      />
      <section
        aria-label="Security practices"
        className="relative isolate px-4 py-14 sm:px-6 lg:py-20"
      >
        <div className="section-glow section-glow-left" aria-hidden="true">
          <span />
        </div>
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          {GROUPS.map(({ icon: Icon, tone, title, points }) => (
            <section key={title} aria-labelledby={`sec-${tone}`} className="feature-card">
              <h2
                id={`sec-${tone}`}
                className="flex items-center gap-3 text-xl font-semibold text-ink"
              >
                <span className={`grad-tile grad-tile-${tone}`}>
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                {title}
              </h2>
              <ul className="mt-4 grid gap-2.5 text-muted">
                {points.map((p) => (
                  <li key={p} className="feature-point">
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </>
  );
}
