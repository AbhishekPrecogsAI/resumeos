import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { useParallax } from '../../hooks/useParallax.js';

/** The closing call to action shared by public pages: an animated gradient band. */
export function CtaBand({
  title = 'Your next resume, ready to send',
  lead = 'Pick a template, fill it from your profile, and keep the exact version you sent.',
}) {
  const ref = useParallax();
  return (
    <section className="l-section">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div ref={ref} className="l-cta relative isolate overflow-hidden">
          <div className="l-cta-glows" aria-hidden="true">
            <span className="glow glow-white-a" data-parallax="0.12" />
            <span className="glow glow-white-b" data-parallax="-0.1" />
          </div>
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">{lead}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/register" size="lg" className="l-cta-primary group">
              Create my resume
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </ButtonLink>
            <ButtonLink to="/templates" size="lg" className="l-cta-secondary">
              Browse templates
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
