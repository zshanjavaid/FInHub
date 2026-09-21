export const themePrimary = '#0d9488';
export const themeText = '#1e293b';
export const themeMuted = '#64748b';
export const themeGrid = 'rgba(15, 23, 42, 0.06)';

export const chartFontFamily = '"Bricolage Grotesque", system-ui, sans-serif';
export const chartMonoFamily = '"IBM Plex Mono", ui-monospace, monospace';

export const buildAxisTickFont = (compact) => ({
  family: chartMonoFamily,
  size: compact ? 9 : 11,
  weight: '400'
});
export const buildLegendFont = (compact) => ({
  family: chartFontFamily,
  size: compact ? 10 : 12,
  weight: '700'
});

export const buildAxisTitleFont = () => ({
  family: chartFontFamily,
  size: 11,
  weight: '200'
});

export const buildLegendPadding = (compact) => (compact ? 4 : 6);
