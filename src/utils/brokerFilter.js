import { normText } from './number';

/** True when no broker filter, or row.client matches selected broker (case-insensitive). */
export const matchesSelectedBroker = (row, selectedBroker, clientKey = 'client') => {
  if (!selectedBroker) return true;
  return normText(row?.[clientKey]) === normText(selectedBroker);
};

/** True when no brokers selected, or row.client matches any selected broker. */
export const matchesAnyBroker = (row, selectedBrokers = [], clientKey = 'client') => {
  const list = (selectedBrokers || []).map((b) => String(b || '').trim()).filter(Boolean);
  if (!list.length) return true;
  const key = normText(row?.[clientKey]);
  return list.some((b) => normText(b) === key);
};
