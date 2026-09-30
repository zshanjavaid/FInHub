import Modal, { modalActionsClass } from './Modal';
import { FiCheckCircle } from 'react-icons/fi';

const ApproveAllConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  count = 0,
  entityLabel = 'items',
  isApproving = false
}) => {
  const handleConfirm = async () => {
    await onConfirm?.();
    onClose();
  };

  const noun = count === 1 ? entityLabel.replace(/s$/, '') : entityLabel;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isApproving ? undefined : onClose}
      title="Approve all pending"
      panelClassName="max-w-lg"
      footer={
        <div className={modalActionsClass}>
          <button
            type="button"
            onClick={onClose}
            disabled={isApproving}
            className="w-full sm:flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-200 text-slate-700 text-sm sm:text-base font-semibold rounded-xl hover:bg-slate-300 transition-colors border-2 border-slate-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isApproving || count <= 0}
            className="w-full sm:flex-1 px-4 py-2.5 sm:px-6 sm:py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm sm:text-base font-semibold rounded-xl border-2 border-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproving ? 'Approving…' : `Approve all (${count})`}
          </button>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-6 min-w-0">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
          </div>
          <p className="text-sm sm:text-base text-slate-700 mb-0 min-w-0">
            Approve all <span className="font-semibold text-slate-900">{count}</span> pending{' '}
            {noun}? They will move out of this list and appear in the main app.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ApproveAllConfirmModal;
