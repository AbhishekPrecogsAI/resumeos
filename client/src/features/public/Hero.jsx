import { ArrowRight, Check, CircleCheck, Palette, Share2 } from 'lucide-react';
import { getTemplate, TEMPLATES } from '@resumeos/shared/templates/index.js';
import { ACCENT_SWATCHES } from '@resumeos/shared/templates/color.js';
import { sampleResume, SAMPLE_LABEL } from '@resumeos/shared/sample/sampleResume.js';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { TemplatePreview } from '../../components/preview/TemplatePreview.jsx';
import { samplePhotoFor } from '../../components/templates/TemplateGrid.jsx';

const ASSURANCES = [
  'Free, no card required',
  'Downloads never paywalled',
  'Export your data any time',
];

// Back left, back right, front. Real renders of real templates, not pictures of them.
const STACK = [
  { id: 'vertex', position: 'left' },
  { id: 'keystone', position: 'right' },
  { id: 'orbit', position: 'front' },
];

function StackCard({ id, position }) {
  const t = getTemplate(id);
  return (
    <div className={`stack-card stack-card-${position}`} aria-hidden={position !== 'front'}>
      <div className="theme-light overflow-hidden rounded-[6px] bg-white">
        <TemplatePreview
          content={sampleResume}
          templateId={t.id}
          firstPageOnly
          photo={samplePhotoFor(t)}
          title={`${t.name} template with sample data`}
        />
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="hero2 relative isolate overflow-hidden"
      data-pointer
    >
      <div className="hero2-mesh" aria-hidden="true">
        <span className="glow glow-indigo" data-parallax="0.18" />
        <span className="glow glow-pink" data-parallax="0.32" />
        <span className="glow glow-amber" data-parallax="0.12" />
      </div>
      <div className="hero2-dots" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-8 lg:pt-20 lg:pb-24">
        <div>
          <p className="hero2-pill">
            <span className="hero2-pill-new">New</span>
            Edit right on the page, in any of {TEMPLATES.length} templates
          </p>

          <h1
            id="hero-heading"
            className="mt-6 text-[2.6rem] leading-[1.04] font-semibold tracking-[-0.03em] text-balance text-ink sm:text-5xl lg:text-[3.6rem]"
          >
            Make a resume <span className="grad-text">you're proud to send</span>
          </h1>

          <p className="mt-6 max-w-[33rem] text-lg leading-relaxed text-muted">
            Pick a template, write on the page itself, and tailor a version for every application
            from one career record. Every PDF is checked, so its text reads in the right order.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/register" size="lg" className="group grad-button">
              Create my resume
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </ButtonLink>
            <ButtonLink to="/templates" size="lg" variant="secondary" className="glass-button">
              Browse templates
            </ButtonLink>
          </div>

          <ul
            aria-label="What is included"
            className="mt-7 grid gap-2 text-sm text-muted sm:flex sm:flex-wrap sm:gap-x-5"
          >
            {ASSURANCES.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <figure className="hero2-stage">
          <div data-parallax="-0.08">
            <div className="stack">
              {STACK.map((card) => (
                <StackCard key={card.id} {...card} />
              ))}

              <div className="stack-chip stack-chip-accent" aria-hidden="true">
                <Palette className="size-4 text-muted" />
                <span className="flex gap-1">
                  {ACCENT_SWATCHES.slice(1, 7).map((s) => (
                    <span
                      key={s.hex}
                      className="size-3.5 rounded-full"
                      style={{ background: s.hex }}
                    />
                  ))}
                </span>
              </div>
              <div className="stack-chip stack-chip-share" aria-hidden="true">
                <Share2 className="size-4 text-accent" />
                <span className="text-[13px] font-semibold text-ink">Share link ready</span>
              </div>
              <div className="stack-chip stack-chip-check" aria-hidden="true">
                <CircleCheck className="size-5 text-added" />
                <span>
                  <span className="block text-[13px] font-semibold text-ink">
                    Export check passed
                  </span>
                  <span className="block text-xs text-muted">Text reads in order</span>
                </span>
              </div>
            </div>
          </div>
          <figcaption className="mt-4 text-center text-xs text-faint lg:mt-6">
            Orbit, Vertex and Keystone, rendered live. {SAMPLE_LABEL}.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
