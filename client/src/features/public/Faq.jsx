import { ChevronDown } from 'lucide-react';
import { cx } from '../../lib/cx.js';

export const FAQ_ITEMS = [
  {
    q: 'Will my resume pass an applicant tracking system?',
    a: 'Nobody can promise that; ATS products differ and employers configure them differently. We give you a plain single-column template, real extractable text, and checks that report exactly what they tested.',
  },
  {
    q: 'Does ResumeOS use AI to write my resume?',
    a: 'No. Checks and job matching are deterministic rules you can read about. Nothing in your resume changes unless you change it or approve a specific suggestion.',
  },
  {
    q: 'What happens to my profile if I edit a resume?',
    a: 'Nothing. Each resume version holds its own copy of the content. When your profile changes later, you choose whether to bring that change into each version.',
  },
  {
    q: 'Can I take my data with me?',
    a: 'Yes. You can export everything as JSON at any time, and deleting your account removes your profile, resumes, versions and saved job descriptions.',
  },
];

export function Faq({ className }) {
  return (
    <div className={cx('divide-y divide-rule border-y border-rule', className)}>
      {FAQ_ITEMS.map((item) => (
        <details key={item.q} className="group py-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-3 font-medium text-ink [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown
              className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p className="pb-4 text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
