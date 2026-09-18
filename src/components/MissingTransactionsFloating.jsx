import { useMemo } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import Modal, { modalScrollTableWrapClass, modalScrollTableInnerClass } from './Modal';
import { tableElementClass, tableHeadCellClass, tableBodyCellClass } from '../constants/tableStyles';

const MissingTransactionsFloating = ({
  isOpen,
  onOpen,
  onClose,
  title = 'Missing transactions',
  summary = '',
  rangeLabel = '',
  items = [],
  emptyText = 'No missing transactions in this range.'
}) => {
  const badgeCount = items.reduce((s, it) => s + (Number(it.missing) || 0), 0);

  const headerText = useMemo(() => {
    if (summary) return summary;
    if (!items.length) return emptyText;
    return `${items.length} project${items.length === 1 ? '' : 's'} with missing transactions`;
  }, [summary, items, emptyText]);

  if (!summary && items.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes fhFloatIn {
          0% { transform: translateY(10px) scale(0.98); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes fhPulseRing {
          0% { transform: scale(0.92); opacity: 0.55; }
          70% { transform: scale(1.08); opacity: 0; }
          100% { transform: scale(1.08); opacity: 0; }
        }
        @keyframes fhWiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
          75% { transform: rotate(-4deg); }
        }
      `}</style>
      <button
        type="button"
        onClick={onOpen}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-xl sm:rounded-2xl border border-rose-200/80 bg-white px-4 py-3 shadow-card hover:bg-slate-50 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
        aria-label="Show missing transactions"
        title="Show missing transactions"
        style={{
          animation: 'fhFloatIn 220ms ease-out both',
          transformOrigin: 'bottom right'
        }}
      >
        <span className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-rose-100 text-rose-700">
          {badgeCount > 0 ? (
            <span
              className="absolute inset-0 rounded-xl border border-rose-300/60"
              style={{ animation: 'fhPulseRing 1.3s ease-out infinite' }}
              aria-hidden
            />
          ) : null}
          <span
            className="relative"
            style={{ animation: badgeCount > 0 ? 'fhWiggle 1.6s ease-in-out infinite' : undefined }}
            aria-hidden
          >
            <FiAlertTriangle className="w-5 h-5" />
          </span>
        </span>
        <div className="text-left min-w-0">
          <p className="text-sm font-bold text-slate-800 leading-none">Missing</p>
          <p className="text-xs text-slate-600 mt-1 leading-none">
            View details
          </p>
        </div>
        {badgeCount > 0 ? (
          <span className="ml-1 inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-rose-500/15 text-rose-800 border border-rose-400/30 text-xs font-extrabold tabular-nums">
            {badgeCount}
          </span>
        ) : null}
      </button>

      <Modal isOpen={isOpen} onClose={onClose} title={title} panelClassName="max-w-3xl">
        <div className="space-y-4 min-w-0">
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 shadow-card">
            <p className="font-semibold">{headerText}</p>
            {rangeLabel ? (
              <p className="text-xs text-rose-900/70 mt-1">{rangeLabel}</p>
            ) : null}
          </div>

          {items.length > 0 ? (
            <div className={modalScrollTableWrapClass}>
              <div className={`${modalScrollTableInnerClass} overflow-x-auto`}>
                <table className={`${tableElementClass} min-w-[22rem]`}>
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className={tableHeadCellClass('text-left')}>Broker</th>
                      <th className={tableHeadCellClass('text-left')}>Project</th>
                      <th className={tableHeadCellClass('text-center')}>Payout</th>
                      <th className={tableHeadCellClass('text-center')}>Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m, idx) => (
                      <tr
                        key={m.key || `${m.client}-${m.project}-${idx}`}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                      >
                        <td className={`${tableBodyCellClass('text-left')} font-semibold text-slate-800`}>{m.client}</td>
                        <td className={tableBodyCellClass('text-left')}>{m.project}</td>
                        <td className={tableBodyCellClass('text-center')}>{m.cadenceLabel}</td>
                        <td className={tableBodyCellClass('text-center')}>
                          <span className="inline-flex items-center justify-center min-w-7 sm:min-w-8 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-rose-100 text-rose-900 text-[10px] sm:text-xs font-extrabold tabular-nums">
                            {m.missing}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-600 py-10">{emptyText}</div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default MissingTransactionsFloating;

