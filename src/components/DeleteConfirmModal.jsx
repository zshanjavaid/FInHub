import Modal, { modalActionsClass } from './Modal';
import { FiAlertTriangle } from 'react-icons/fi';

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  isDeleting = false
}) => {
  const handleConfirm = async () => {
    await onConfirm?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={isDeleting ? undefined : onClose} title={title} panelClassName="max-w-lg"
      footer={
        <div className={modalActionsClass}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-200 text-slate-700 text-sm sm:text-base font-semibold rounded-xl hover:bg-slate-300 transition-colors border-2 border-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full sm:flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base font-semibold rounded-xl border-2 border-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center">
            <FiAlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
          </div>
          <p className="text-sm sm:text-base text-slate-700 mb-0 min-w-0">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;
