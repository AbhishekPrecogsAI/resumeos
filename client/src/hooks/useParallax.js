import { useEffect, useRef } from 'react';

const prefersReducedMotion = () =>
  typeof window === 'undefined' ||
  (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const MAX_SHIFT = 80;

/**
 * Parallax for the landing page, on the element the returned ref is attached to.
 *   Scroll: each [data-parallax="speed"] inside shifts vertically by its parent's distance from
 *   the viewport centre × speed. The parent is measured, not the element, so moving it never
 *   feeds back into the measurement.
 *   Pointer: each [data-pointer] gets --px and --py (−1 … 1) for CSS to move layers by.
 * Does nothing when the user prefers reduced motion; pointer effects only for fine pointers.
 */
export function useParallax() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return undefined;

    const layers = [...root.querySelectorAll('[data-parallax]')];
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of layers) {
        const box = el.parentElement.getBoundingClientRect();
        if (box.bottom < -300 || box.top > vh + 300) continue;
        // Capped, so a layer far from the centre never drifts out of its place.
        const offset = clamp(
          (box.top + box.height / 2 - vh / 2) * Number(el.dataset.parallax),
          -MAX_SHIFT,
          MAX_SHIFT,
        );
        el.style.translate = `0 ${offset.toFixed(1)}px`;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    const targets = [...root.querySelectorAll('[data-pointer]')];
    const finePointer = window.matchMedia?.('(pointer: fine)')?.matches ?? false;
    const onPointer = (e) => {
      for (const t of targets) {
        const box = t.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) continue;
        t.style.setProperty(
          '--px',
          clamp(((e.clientX - box.left) / box.width) * 2 - 1, -1, 1).toFixed(3),
        );
        t.style.setProperty(
          '--py',
          clamp(((e.clientY - box.top) / box.height) * 2 - 1, -1, 1).toFixed(3),
        );
      }
    };
    if (finePointer && targets.length)
      window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return ref;
}
