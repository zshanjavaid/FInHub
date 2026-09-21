import { useCallback, useEffect, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { AUTH_FEATURES } from '../../constants/authFeatures';

const SLIDE_MS = 5000;

const variantStyles = {
  dark: {
    card: 'rounded-2xl bg-white/[0.06] border border-white/10 p-5 sm:p-6 shadow-sm backdrop-blur-[2px]',
    badge: 'text-[10px] font-light uppercase tracking-[0.16em] text-primary-200 px-2 py-0.5 rounded-full bg-primary-500/20 border border-primary-400/25',
    iconWrap: 'w-11 h-11 rounded-xl bg-primary-500/25 text-primary-100 ring-1 ring-primary-400/30',
    title: 'text-xl font-extrabold text-white tracking-tight leading-tight',
    description: 'text-sm font-light text-teal-100/80 leading-relaxed',
    track: 'bg-white/10',
    progress: 'bg-primary-300',
    dotActive: 'w-7 bg-primary-300',
    dotIdle: 'w-1.5 bg-white/25 hover:bg-white/40',
    arrow: 'p-2 rounded-xl border border-white/10 bg-white/5 text-teal-100 hover:bg-white/10 hover:text-white transition-colors',
    counter: 'text-xs text-teal-200/70 tabular-nums'
  },
  light: {
    card: 'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card',
    badge: 'text-[10px] font-light uppercase tracking-[0.16em] text-primary-700 px-2 py-0.5 rounded-full bg-primary-50 border border-primary-200',
    iconWrap: 'w-10 h-10 rounded-xl bg-primary-50 text-primary-700 ring-1 ring-primary-100',
    title: 'text-base font-extrabold text-slate-800 tracking-tight',
    description: 'text-xs font-light text-slate-600 leading-relaxed',
    track: 'bg-slate-200',
    progress: 'bg-primary-500',
    dotActive: 'w-6 bg-primary-500',
    dotIdle: 'w-1.5 bg-slate-300 hover:bg-slate-400',
    arrow: 'p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-primary-600 transition-colors',
    counter: 'text-[11px] text-slate-500 tabular-nums'
  }
};

const AuthFeatureSlider = ({ variant = 'dark', showArrows = true, className = '' }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const styles = variantStyles[variant] ?? variantStyles.dark;
  const total = AUTH_FEATURES.length;
  const feature = AUTH_FEATURES[index];
  const Icon = feature.icon;

  const goTo = useCallback((next) => {
    setIndex((next + total) % total);
  }, [total]);

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(goNext, SLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, goNext]);

  return (
    <div
      className={`min-w-0 ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div key={feature.id} className={`${styles.card} auth-slide-in`}>
        <div className="flex items-start gap-3 sm:gap-4">
          <span className={`flex items-center justify-center shrink-0 ${styles.iconWrap}`}>
            <Icon className="w-5 h-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <span className={styles.badge}>{feature.stat}</span>
            <h3 className={`${styles.title} mt-2`}>{feature.title}</h3>
            <p className={`${styles.description} mt-1.5`}>{feature.description}</p>
          </div>
        </div>

        <div className={`mt-4 h-0.5 rounded-full overflow-hidden ${styles.track}`}>
          {!paused ? (
            <div key={`progress-${index}`} className={`h-full ${styles.progress} auth-slide-progress`} />
          ) : (
            <div
              className={`h-full ${styles.progress}`}
              style={{ transform: 'scaleX(1)', transformOrigin: 'left' }}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-4">
        <span className={styles.counter}>
          {index + 1} / {total}
        </span>

        <div className="flex items-center gap-1.5 flex-1 justify-center">
          {AUTH_FEATURES.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? styles.dotActive : styles.dotIdle
              }`}
              aria-label={`Show ${f.title}`}
              aria-current={i === index ? 'true' : undefined}
            />
          ))}
        </div>

        {showArrows ? (
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={goPrev} className={styles.arrow} aria-label="Previous feature">
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={goNext} className={styles.arrow} aria-label="Next feature">
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <span className="w-[4.5rem] shrink-0" aria-hidden />
        )}
      </div>
    </div>
  );
};

export default AuthFeatureSlider;
