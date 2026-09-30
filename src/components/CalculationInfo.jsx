import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiInfo } from 'react-icons/fi';

const CalculationInfo = ({ label, children }) => {
  const tooltipId = useId();
  const [position, setPosition] = useState(null);

  const show = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(296, window.innerWidth - 32);
    setPosition({
      width,
      left: Math.max(16, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 16)),
      ...(window.innerHeight - rect.bottom < 100
        ? { bottom: window.innerHeight - rect.top + 8 }
        : { top: rect.bottom + 8 })
    });
  };

  useEffect(() => {
    if (!position) return undefined;
    const hide = () => setPosition(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [position]);

  return (
    <>
      <button
        type="button"
        aria-label={`How ${label} is calculated`}
        aria-describedby={position ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={() => setPosition(null)}
        onFocus={show}
        onBlur={() => setPosition(null)}
        onClick={show}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setPosition(null);
        }}
        className="inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-full text-slate-400 hover:text-primary-600 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
      >
        <FiInfo className="w-4 h-4" aria-hidden />
      </button>
      {position && createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          style={position}
          className="pointer-events-none fixed z-[130] rounded-xl border border-slate-200/90 bg-white p-3 text-left text-xs leading-relaxed text-slate-600 shadow-elevated"
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
};

export default CalculationInfo;
