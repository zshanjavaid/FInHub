import { useEffect, useRef, useState } from 'react';

/**
 * Becomes true once the element enters the viewport (then stays true).
 * Used to defer heavy chart mounts until they are near visible.
 */
export const useInViewOnce = (rootMargin = '280px 0px') => {
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
      { root: null, rootMargin, threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
};
