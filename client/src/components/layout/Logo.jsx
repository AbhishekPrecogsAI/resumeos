import { useId } from 'react';
import { Link } from 'react-router';

/**
 * The ResumeOS mark: a page with a folded corner on a gradient tile. The same drawing is the
 * favicon (client/public/favicon.svg), so keep the two in step.
 */
export function LogoMark({ className = 'size-7' }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient
          id={`${id}-tile`}
          x1="2"
          y1="2"
          x2="30"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${id}-tile)`} />
      <path
        d="M10.5 7h7.8L23.5 12.2V23.5A1.5 1.5 0 0 1 22 25H10.5A1.5 1.5 0 0 1 9 23.5v-15A1.5 1.5 0 0 1 10.5 7Z"
        fill="#fff"
      />
      <path d="M18.3 7v4a1.2 1.2 0 0 0 1.2 1.2h4Z" fill="#c4b5fd" />
      <rect x="11.8" y="15.2" width="8.6" height="1.9" rx="0.95" fill="#7c3aed" />
      <rect x="11.8" y="19.2" width="5.6" height="1.9" rx="0.95" fill="#db2777" />
    </svg>
  );
}

export function Logo({ to = '/' }) {
  return (
    <Link
      to={to}
      aria-label="ResumeOS home"
      className="inline-flex items-center gap-2 rounded-md text-[1.0625rem] font-semibold tracking-tight text-ink"
    >
      <LogoMark />
      <span aria-hidden="true">
        Resume<span className="grad-text">OS</span>
      </span>
    </Link>
  );
}
