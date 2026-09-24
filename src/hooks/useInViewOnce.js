import { useEffect, useRef, useState } from 'react';
import { useScrollRoot } from '../contexts/ScrollRootContext';

/**
 * Becomes true once the element enters the scrollport (then stays true).
 * Uses the app `<main>` scroll root when available so nested overflow is correct.
 */
export const useInViewOnce = (rootMargin = '280px 0px') => {
  const scrollRoot = useScrollRoot();
  const ref = useRef(null);
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === 'undefined'
  );

  useEffect(() => {
    if (inView) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      {
        root: scrollRoot instanceof Element ? scrollRoot : null,
        rootMargin,
        threshold: 0.01
      }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin, scrollRoot]);

  return [ref, inView];
};
