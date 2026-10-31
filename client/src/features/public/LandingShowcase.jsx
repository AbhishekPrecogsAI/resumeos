import { useRef } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Image,
  Languages,
  Palette,
  Type,
} from 'lucide-react';
import { getTemplate, TEMPLATES } from '@resumeos/shared/templates/index.js';
import { sampleResume, SAMPLE_LABEL } from '@resumeos/shared/sample/sampleResume.js';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { TemplatePreview } from '../../components/preview/TemplatePreview.jsx';
import { samplePhotoFor } from '../../components/templates/TemplateGrid.jsx';

const FEATURED = ['atlas', 'harbor', 'tide', 'pulse', 'summit', 'lumen', 'meridian', 'clarity'];

/** A scrollable row of live template previews, each one click from starting a resume. */
export function TemplateShowcase() {
  const rowRef = useRef(null);
  const scroll = (dir) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="showcase-heading" className="l-section">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2
              id="showcase-heading"
              className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
            >
              {TEMPLATES.length} templates, from classic to bold
            </h2>
            <p className="mt-4 text-lg text-muted">
              Sidebars, header bands, photos and icons, or a plain single column for strict
              applicant tracking systems. Switch at any time; your content stays put.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Scroll templates left"
              className="showcase-nav"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Scroll templates right"
              className="showcase-nav"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <ul ref={rowRef} className="showcase-row" aria-label="Featured templates">
        {FEATURED.map((id) => {
          const t = getTemplate(id);
          return (
            <li key={id} className="showcase-card group">
              <Link to={`/app/resumes/new?template=${t.id}`} className="block">
                <div className="showcase-paper theme-light">
                  <TemplatePreview
                    content={sampleResume}
                    templateId={t.id}
                    firstPageOnly
                    lazy
                    photo={samplePhotoFor(t)}
                    title={`${t.name} template with sample data`}
                  />
                  <span className="showcase-use" aria-hidden="true">
                    Use this template
                  </span>
                </div>
                <span className="mt-3 block font-semibold text-ink">{t.name}</span>
                <span className="block text-sm text-muted">{t.style}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <p className="text-xs text-faint">
          {SAMPLE_LABEL}. Every template passes our PDF export checks.
        </p>
        <ButtonLink to="/templates" variant="secondary" className="group">
          See all {TEMPLATES.length} templates
          <ArrowRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </ButtonLink>
      </div>
    </section>
  );
}

const CONTROLS = [
  {
    icon: Palette,
    title: 'Colours and backgrounds',
    body: 'Eight readable accent colours or your own, plus subtle page patterns.',
  },
  {
    icon: Type,
    title: 'Fonts, size and spacing',
    body: 'Five tested fonts, text from 80% to 120%, and Fit to one page measured on the real PDF.',
  },
  {
    icon: Columns2,
    title: 'Your choice of column',
    body: 'Move any section between the main column and the sidebar.',
  },
  {
    icon: Image,
    title: 'Photo and icons',
    body: 'An optional photo, contact icons and heading icons on modern templates.',
  },
  {
    icon: Languages,
    title: 'Languages and skill levels',
    body: 'Shown as dots or bars, with the level always printed as text.',
  },
];

// One template, three looks: the same resume with a different accent and background.
const LOOKS = [
  { accent: '#1f4fb4', pattern: 'none', label: 'Cobalt' },
  { accent: '#5b2a6e', pattern: 'dots', label: 'Plum, dots' },
  { accent: '#245b34', pattern: 'network', label: 'Forest, network' },
];

export function MakeItYours() {
  return (
    <section aria-labelledby="yours-heading" className="l-section overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center">
        <div>
          <h2
            id="yours-heading"
            className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
          >
            Make it yours without breaking it
          </h2>
          <p className="mt-4 text-lg text-muted">
            Every design control keeps the text readable: colours are contrast-checked and
            decoration never changes the order a parser reads.
          </p>
          <ul className="mt-8 grid gap-5">
            {CONTROLS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="l-icon">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-medium text-ink">{title}</span>
                  <span className="block text-sm text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <ul className="looks" aria-label="Tide template in three looks (sample data)">
            {LOOKS.map((look, i) => (
              <li key={look.label} className={`looks-card looks-card-${i}`}>
                <div className="theme-light overflow-hidden rounded-[5px] bg-white">
                  <TemplatePreview
                    content={sampleResume}
                    templateId="tide"
                    firstPageOnly
                    lazy
                    accentColor={look.accent}
                    pattern={look.pattern}
                    photo={samplePhotoFor(getTemplate('tide'))}
                    title={`Tide template, ${look.label}, sample data`}
                  />
                </div>
                <span className="looks-label">
                  <span className="size-2.5 rounded-full" style={{ background: look.accent }} />
                  {look.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
