export const tableElementClass = 'w-full min-w-max text-xs sm:text-sm';

export const tableHeadCellClass = (align = 'text-center', extra = '') =>
  `py-2 px-2 sm:py-3 sm:px-4 text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wide whitespace-nowrap ${align} ${extra}`.trim();

export const tableBodyCellClass = (align = 'text-center', extra = '') =>
  `py-2 px-2 sm:py-3 sm:px-4 text-xs sm:text-sm text-slate-700 whitespace-nowrap ${align} ${extra}`.trim();

export const tableScrollWrapClass =
  'min-w-0 overflow-auto overscroll-x-contain px-2 py-1 sm:px-4 sm:py-2 [@media(max-height:760px)]:max-h-[calc(100dvh-12rem)]';
