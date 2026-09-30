import { useId } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { Overlay, PopIn } from '../motion';

export const modalActionsClass =
  'flex flex-col-reverse sm:flex-row gap-3 w-full';

export const modalScrollTableWrapClass =
  'bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-panel overflow-hidden -mx-1 sm:mx-0';

export const modalScrollTableInnerClass =
  'max-h-[min(50vh,22rem)] sm:max-h-[55vh] overflow-auto overscroll-x-contain';

const Modal = ({ isOpen, onClose, title, children, footer = null, panelClassName = 'max-w-2xl' }) => {
  const titleId = useId();
  if (!isOpen) return null;

  return createPortal(
    <Overlay
      className="fh-modal-overlay fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 !m-0"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.48)' }}
      onClick={onClose}
      role="presentation"
    >
      <PopIn
        className={`fh-modal-panel bg-white w-full min-w-0 ${panelClassName} max-h-[92dvh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-modal border border-slate-200/80`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 sm:py-4 shrink-0 bg-primary-800 border-b border-primary-900/20">
          <h2 id={titleId} className="text-lg sm:text-xl font-semibold text-white tracking-tight flex-1 min-w-0 break-words">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!onClose}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-100 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0 bg-white">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </PopIn>
    </Overlay>,
    document.body
  );
};

export default Modal;
