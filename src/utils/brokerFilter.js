import { normText } from './number';

/** True when no broker filter, or row.client matches selected broker (case-insensitive). */
export const matchesSelectedBroker = (row, selectedBroker, clientKey = 'client') => {
  if (!selectedBroker) return true;
  return normText(row?.[clientKey]) === normText(selectedBroker);
};
