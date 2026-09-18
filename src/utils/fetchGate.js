/** Skip redundant list fetches for a short window after a successful load. */
export const DATA_STALE_MS = 45_000;

export const shouldSkipListFetch = (state, { force = false } = {}) => {
  if (force) return false;
  if (state?.isLoading) return true;
  if (state?.lastFetchedAt && Date.now() - state.lastFetchedAt < DATA_STALE_MS) return true;
  return false;
};
