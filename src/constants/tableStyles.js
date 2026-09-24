export const tableElementClass = 'w-full min-w-max text-xs sm:text-sm';

export const tableHeadCellClass = (align = 'text-center', extra = '') =>
  `py-2 px-2 sm:py-3 sm:px-4 text-[10px] sm:text-xs font-light text-slate-500 uppercase tracking-[0.14em] whitespace-nowrap ${align} ${extra}`.trim();

export const tableBodyCellClass = (align = 'text-center', extra = '') =>
  `py-2 px-2 sm:py-3 sm:px-4 text-xs sm:text-sm text-slate-700 whitespace-nowrap ${align} ${extra}`.trim();

export const tableScrollWrapClass =
  'min-w-0 overflow-x-auto overflow-y-visible overscroll-x-contain px-2 py-1 sm:px-4 sm:py-2';
