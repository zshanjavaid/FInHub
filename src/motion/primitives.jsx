/**
 * CSS-backed motion primitives (same API as before, no Motion.js).
 * Hover/tap/enter animations live in index.css (.fh-lift, .fh-press, …).
 */

export const Overlay = ({ className = '', children, onClick, style, ...rest }) => (
  <div className={`fh-overlay ${className}`.trim()} style={style} onClick={onClick} {...rest}>
    {children}
  </div>
);

export const OverlayButton = ({ className = '', children, ...rest }) => (
  <button type="button" className={`fh-overlay fh-overlay-btn ${className}`.trim()} {...rest}>
    {children}
  </button>
);

export const PopIn = ({ className = '', children, onClick, ...rest }) => (
  <div className={`fh-pop-in ${className}`.trim()} onClick={onClick} {...rest}>
    {children}
  </div>
);

export const Rise = ({ className = '', children, delay = 0, style, ...rest }) => (
  <div
    className={`fh-rise ${className}`.trim()}
    style={delay ? { ...style, animationDelay: `${delay}s` } : style}
    {...rest}
  >
    {children}
  </div>
);

export const Press = ({ className = '', children, disabled, hoverLift = false, ...rest }) => (
  <button
    type="button"
    disabled={disabled}
    className={`fh-press ${hoverLift ? 'fh-press-lift' : ''} ${className}`.trim()}
    {...rest}
  >
    {children}
  </button>
);

export const Lift = ({ className = '', children, ...rest }) => (
  <div className={`fh-lift ${className}`.trim()} {...rest}>
    {children}
  </div>
);
