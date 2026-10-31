import { useEffect, useRef, useState } from 'react';
import { cx } from '../../lib/cx.js';

function skipAnimation() {
  if (typeof window === 'undefined') return true;
  if (typeof IntersectionObserver === 'undefined') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

export function Reveal({ as: Tag = 'div', delay = 0, className, style, children, ...props }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(skipAnimation);

  useEffect(() => {
    if (shown) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <Tag
      ref={ref}
      className={cx('reveal', shown && 'reveal-in', className)}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
}
