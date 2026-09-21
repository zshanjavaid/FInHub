/** Shared chart / insight card chrome — keep in sync across Dashboard & Projects. */

import { surfaceCardClass, surfaceCardAccentClass } from './surfaceStyles';

export const chartCardClass = `w-full min-w-0 ${surfaceCardClass} ${surfaceCardAccentClass} overflow-hidden isolate [contain:paint]`;

export const chartCardHeaderClass =
  'px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-5 bg-gradient-to-b from-slate-50/90 to-white border-b border-slate-100/90';

export const chartCardTitleClass =
  'text-xl sm:text-2xl md:text-[1.65rem] font-extrabold text-slate-900 tracking-tight leading-[1.05]';

export const chartCardSubtitleClass =
  'text-xs sm:text-sm font-light text-slate-500 mt-1.5 max-w-prose leading-relaxed';

export const chartCardIconWrapClass =
  'flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 bg-primary-50 text-primary-700 ring-1 ring-primary-100/80';

export const chartPlotWrapClass =
  'px-3 pt-2 pb-3 sm:px-4 sm:pt-2.5 sm:pb-4 md:px-5 md:pt-3 md:pb-5 min-w-0';

export const chartPlotHeightClass =
  'w-full h-full min-h-[220px] sm:min-h-[280px] md:min-h-[360px]';
