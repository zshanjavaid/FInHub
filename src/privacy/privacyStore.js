/** Module store so formatters can mask without React, while UI subscribes for re-renders. */

export const PRIVACY_MASK = '••••';
export const PRIVACY_AUTO_HIDE_MS = 5 * 60 * 1000;

let hidden = true;
const listeners = new Set();

const syncDomPrivacyClass = (value) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('fh-privacy', value);
};

export const getPrivacyHidden = () => hidden;

/** Keep string length (digits → •) so layout / tabular figures don’t jump. */
export const maskSensitiveText = (text) => String(text ?? '').replace(/\d/g, '•');

export const setPrivacyHidden = (next) => {
  const value = Boolean(next);
  if (value === hidden) return;
  hidden = value;
  syncDomPrivacyClass(value);
  listeners.forEach((listener) => listener());
};

export const subscribePrivacy = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Match initial default (hidden) on first paint when running in the browser.
syncDomPrivacyClass(hidden);
