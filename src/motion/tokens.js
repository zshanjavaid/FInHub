export const fhEase = [0.22, 1, 0.36, 1];

export const fhDuration = {
  tap: 0.12,
  fast: 0.16,
  overlay: 0.2,
  enter: 0.26
};

export const overlayTransition = { duration: fhDuration.overlay, ease: 'linear' };
export const enterTransition = { duration: fhDuration.enter, ease: fhEase };
export const tapTransition = { duration: fhDuration.tap, ease: fhEase };
