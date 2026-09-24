import { createContext, useContext } from 'react';

/** Scroll container for the authenticated app shell (`<main>` in MainLayout). */
const ScrollRootContext = createContext(null);

export const ScrollRootProvider = ScrollRootContext.Provider;

export const useScrollRoot = () => useContext(ScrollRootContext);
