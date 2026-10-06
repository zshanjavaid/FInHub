const SHORT_LABEL_MAX = 14;

/** Prefer project name after " – " / " - "; truncate for chart axis. */
export const shortenChartAxisLabel = (full, maxLen = SHORT_LABEL_MAX) => {
  const text = String(full || '').trim();
  if (!text) return '';
  const parts = text.split(/\s+[–-]\s+/);
  const preferred = parts.length > 1 ? parts[parts.length - 1].trim() : text;
  if (preferred.length <= maxLen) return preferred;
  return `${preferred.slice(0, Math.max(1, maxLen - 1))}…`;
};

/** Tighter caps when the chart is narrow or crowded. */
export const chartAxisLabelMaxLen = (compact = false, labelCount = 0) => {
  const n = Number(labelCount) || 0;
  if (compact) {
    if (n >= 6) return 7;
    if (n >= 4) return 9;
    return 11;
  }
  if (n >= 10) return 10;
  if (n >= 7) return 12;
  return SHORT_LABEL_MAX;
};
