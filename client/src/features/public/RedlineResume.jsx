import { useState } from 'react';
import { Minus, Plus, MoveVertical } from 'lucide-react';
import { cx } from '../../lib/cx.js';

// Static, clearly-labelled sample of a v3 → v4 tailoring diff, drawn as a marked-up page.
const BULLETS = [
  {
    text: 'Led migration of the shipment-tracking API to three Node.js services, cutting p95 latency from 820 ms to 310 ms.',
  },
  {
    text: 'Designed the idempotent webhook pipeline used by 40+ carrier integrations.',
    change: 'added',
    note: 'Pulled from master profile for the platform role',
  },
  {
    text: 'Mentored two interns through their first production deploys.',
    change: 'removed',
    note: 'Hidden in this version, still in profile',
  },
  {
    text: 'Introduced contract tests between services; breaking-change incidents dropped to zero over two quarters.',
  },
];

const SKILLS_BEFORE = 'Node.js, Go, PostgreSQL, MongoDB, Kubernetes, Terraform';
const SKILLS_AFTER = 'Kubernetes, Terraform, Node.js, Go, PostgreSQL, MongoDB';

const MARK = {
  added: {
    icon: Plus,
    label: 'Added',
    text: 'text-added',
    bg: 'bg-added-soft',
    rule: 'border-added',
  },
  removed: {
    icon: Minus,
    label: 'Removed',
    text: 'text-removed',
    bg: 'bg-removed-soft',
    rule: 'border-removed',
  },
  moved: {
    icon: MoveVertical,
    label: 'Reordered',
    text: 'text-accent',
    bg: 'bg-accent-soft',
    rule: 'border-accent',
  },
};

function Annotation({ kind, children }) {
  const m = MARK[kind];
  const Icon = m.icon;
  return (
    <p className={cx('mt-1 flex items-start gap-1.5 font-sans text-[11px] leading-snug', m.text)}>
      <Icon className="mt-px size-3 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-semibold">{m.label}.</span> {children}
      </span>
    </p>
  );
}

export function RedlineResume() {
  const [showChanges, setShowChanges] = useState(true);

  return (
    <figure className="relative">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-medium text-ink">General backend (v3)</span> compared with{' '}
          <span className="font-medium text-ink">Platform engineer (v4)</span>
        </p>
        <button
          type="button"
          aria-pressed={showChanges}
          onClick={() => setShowChanges((v) => !v)}
          className="rounded-md border border-rule-strong bg-surface px-2.5 py-1 text-sm font-medium text-ink hover:bg-sunken"
        >
          {showChanges ? 'Hide changes' : 'Show changes'}
        </button>
      </div>

      <div
        className="theme-light rounded-sm bg-white px-6 py-7 text-[#16181d] shadow-paper sm:px-9 sm:py-9"
        style={{ fontFamily: "'Source Serif 4', Charter, Georgia, serif" }}
      >
        <p className="text-[22px] leading-tight font-semibold tracking-tight">
          Mira Okafor-Lindqvist
        </p>
        <p className="mt-0.5 text-[13px] text-[#2c3038]">Backend &amp; platform engineer</p>
        <p className="mt-1 text-[11.5px] text-[#4b5260]">
          Lisbon, Portugal (remote) | mira@example.com | github.com/example
        </p>

        <p className="mt-5 border-b border-[#9aa1ab] pb-0.5 text-[11.5px] font-bold tracking-[0.06em]">
          EXPERIENCE
        </p>
        <div className="mt-2 flex items-baseline justify-between gap-3 text-[13px]">
          <p>
            <strong>Senior Backend Engineer</strong>, Northwind Freight
          </p>
          <p className="shrink-0 text-[11.5px] text-[#2c3038] tabular-nums">Mar 2022 – Present</p>
        </div>

        <ul className="mt-1.5 grid gap-1.5 text-[12.5px] leading-snug">
          {BULLETS.map((b) => {
            if (!showChanges && b.change === 'removed') return null;
            const m = b.change && showChanges ? MARK[b.change] : null;
            return (
              <li
                key={b.text}
                className={cx(
                  'relative pl-3.5',
                  m && cx('-mx-2 rounded-sm border-l-2 px-2 py-1 pl-5.5', m.bg, m.rule),
                )}
              >
                <span aria-hidden="true" className={cx('absolute', m ? 'left-2.5' : 'left-0')}>
                  •
                </span>
                <span
                  className={cx(
                    m && b.change === 'removed' && 'line-through decoration-[#a8261b]/60',
                  )}
                >
                  {b.text}
                </span>
                {m && <Annotation kind={b.change}>{b.note}</Annotation>}
              </li>
            );
          })}
        </ul>

        <p className="mt-5 border-b border-[#9aa1ab] pb-0.5 text-[11.5px] font-bold tracking-[0.06em]">
          SKILLS
        </p>
        <div
          className={cx(
            'mt-2 text-[12.5px]',
            showChanges && '-mx-2 rounded-sm border-l-2 border-accent bg-accent-soft px-2 py-1',
          )}
        >
          <p>
            <strong>Core</strong> {SKILLS_AFTER}
          </p>
          {showChanges && (
            <Annotation kind="moved">
              Infrastructure skills moved first. Was: {SKILLS_BEFORE}
            </Annotation>
          )}
        </div>
      </div>

      <figcaption className="mt-3 text-xs text-faint">
        Sample data for a fictional person. Comparison shown as the version view displays it.
      </figcaption>
    </figure>
  );
}
