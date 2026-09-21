import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { Overlay, PopIn } from '../motion';

export const modalActionsClass =
  'flex flex-col-reverse sm:flex-row gap-3 pt-2 sm:pt-4 w-full';

export const modalScrollTableWrapClass =
  'bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-panel overflow-hidden -mx-1 sm:mx-0';

export const modalScrollTableInnerClass =
  'max-h-[min(50vh,22rem)] sm:max-h-[55vh] overflow-auto overscroll-x-contain';

const Modal = ({ isOpen, onClose, title, children, panelClassName = 'max-w-2xl' }) => {
  if (!isOpen) return null;

  return createPortal(
    <Overlay
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 !m-0"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}
      onClick={onClose}
      role="presentation"
    >
      <PopIn
        className={`bg-white w-full min-w-0 ${panelClassName} max-h-[92dvh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-modal border border-slate-200/50`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center gap-2 px-4 py-3.5 sm:px-6 sm:py-4 shrink-0 bg-gradient-to-r from-primary-800 to-primary-600 rounded-t-2xl sm:rounded-t-2xl">
          <h2 id="modal-title" className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate flex-1 min-w-0">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/20 transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 min-h-0 bg-slate-50">
          {children}
        </div>
      </PopIn>
    </Overlay>,
    document.body
  );
};

export default Modal;
