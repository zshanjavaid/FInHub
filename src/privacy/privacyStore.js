/** Module store so formatters can mask without React, while UI subscribes for re-renders. */

export const PRIVACY_MASK = '••••';
export const PRIVACY_AUTO_HIDE_MS = 5 * 60 * 1000;

let hidden = true;
const listeners = new Set();

export const getPrivacyHidden = () => hidden;

export const setPrivacyHidden = (next) => {
  const value = Boolean(next);
  if (value === hidden) return;
  hidden = value;
  listeners.forEach((listener) => listener());
};

export const subscribePrivacy = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
