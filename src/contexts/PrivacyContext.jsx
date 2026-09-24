import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  getPrivacyHidden,
  setPrivacyHidden,
  subscribePrivacy,
  PRIVACY_AUTO_HIDE_MS
} from '../privacy/privacyStore';

const PrivacyContext = createContext(null);

export const usePrivacy = () => {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider');
  return ctx;
};

/** Subscribe any display component so it re-renders when privacy toggles. */
export const usePrivacyHidden = () => {
  const [hidden, setHidden] = useState(getPrivacyHidden);
  useEffect(() => subscribePrivacy(() => setHidden(getPrivacyHidden())), []);
  return hidden;
};

export const PrivacyProvider = ({ children }) => {
  const [isHidden, setIsHidden] = useState(getPrivacyHidden);
  const timerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setPrivacyHidden(true);
    setIsHidden(true);
  }, [clearTimer]);

  const reveal = useCallback(() => {
    clearTimer();
    setPrivacyHidden(false);
    setIsHidden(false);
    timerRef.current = window.setTimeout(() => {
      setPrivacyHidden(true);
      setIsHidden(true);
      timerRef.current = null;
    }, PRIVACY_AUTO_HIDE_MS);
  }, [clearTimer]);

  const toggle = useCallback(() => {
    if (getPrivacyHidden()) reveal();
    else hide();
  }, [hide, reveal]);

  useEffect(() => {
    const unsub = subscribePrivacy(() => setIsHidden(getPrivacyHidden()));
    return () => {
      unsub();
      clearTimer();
      setPrivacyHidden(true);
    };
  }, [clearTimer]);

  const value = useMemo(
    () => ({
      isHidden,
      hide,
      reveal,
      toggle,
      autoHideMs: PRIVACY_AUTO_HIDE_MS
    }),
    [isHidden, hide, reveal, toggle]
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
};
