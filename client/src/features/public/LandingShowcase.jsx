import { Columns2, Image, Languages, Palette, Type } from 'lucide-react';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { TemplatePreview } from '../../components/preview/TemplatePreview.jsx';
import { samplePhotoFor } from '../../components/templates/TemplateGrid.jsx';

const CONTROLS = [
  {
    icon: Palette,
    tone: 'indigo',
    title: 'Colours and backgrounds',
    body: 'Eight readable accent colours or your own, plus subtle page patterns.',
  },
  {
    icon: Type,
    tone: 'violet',
    title: 'Fonts, size and spacing',
    body: 'Five tested fonts, text from 80% to 120%, and Fit to one page measured on the real PDF.',
  },
  {
    icon: Columns2,
    tone: 'pink',
    title: 'Your choice of column',
    body: 'Move any section between the main column and the sidebar.',
  },
  {
    icon: Image,
    tone: 'amber',
    title: 'Photo and icons',
    body: 'An optional photo, contact icons and heading icons on modern templates.',
  },
  {
    icon: Languages,
    tone: 'teal',
    title: 'Languages and skill levels',
    body: 'Shown as dots or bars, with the level always printed as text.',
  },
];

// One template, three looks. Each card scrolls at its own speed.
const LOOKS = [
  { accent: '#1f4fb4', pattern: 'none', label: 'Cobalt', speed: '0.05' },
  { accent: '#5b2a6e', pattern: 'dots', label: 'Plum, dots', speed: '-0.07' },
  { accent: '#245b34', pattern: 'network', label: 'Forest, network', speed: '0.11' },
];

export function MakeItYours() {
  return (
    <section aria-labelledby="yours-heading" className="l-section relative isolate overflow-hidden">
      <div className="section-glow section-glow-right" aria-hidden="true">
        <span data-parallax="0.15" />
      </div>
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center">
        <div>
          <h2
            id="yours-heading"
            className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
          >
            Make it yours <span className="grad-text">without breaking it</span>
          </h2>
          <p className="mt-4 text-lg text-muted">
            Every design control keeps the text readable: colours are contrast-checked and
            decoration never changes the order a parser reads.
          </p>
          <ul className="mt-8 grid gap-5">
            {CONTROLS.map(({ icon: Icon, tone, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className={`grad-tile grad-tile-${tone}`}>
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

        <ul className="looks" aria-label="Tide template in three looks (sample data)">
          {LOOKS.map((look) => (
            <li key={look.label} className="looks-card">
              <div data-parallax={look.speed}>
                <div className="looks-paper theme-light">
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
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
