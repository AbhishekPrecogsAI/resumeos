import { Link } from 'react-router';

export function LogoMark({ className = 'size-6' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect
        x="4"
        y="2.5"
        width="13"
        height="17"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7.5 7h6M7.5 10h6M7.5 13h3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="18" cy="18" r="3.2" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ to = '/' }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-md font-semibold tracking-tight text-ink"
    >
      <LogoMark />
      <span>ResumeOS</span>
    </Link>
  );
}
