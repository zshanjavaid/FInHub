export const themePrimary = '#0d9488';
export const themeText = '#1e293b';
export const themeMuted = '#64748b';
export const themeGrid = 'rgba(15, 23, 42, 0.06)';

export const buildAxisTickFont = (compact) => ({ size: compact ? 9 : 11 });
export const buildLegendFont = (compact) => ({
  family: 'inherit',
  size: compact ? 10 : 12,
  weight: '600'
});

export const buildLegendPadding = (compact) => (compact ? 4 : 6);
