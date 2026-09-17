const SHORT_LABEL_MAX = 14;

/** Prefer project name after " – " / " - "; truncate for chart axis. */
export const shortenChartAxisLabel = (full, maxLen = SHORT_LABEL_MAX) => {
  const text = String(full || '').trim();
  if (!text) return '';
  const parts = text.split(/\s+[–-]\s+/);
  const preferred = parts.length > 1 ? parts[parts.length - 1].trim() : text;
  if (preferred.length <= maxLen) return preferred;
  return `${preferred.slice(0, maxLen - 1)}…`;
};
