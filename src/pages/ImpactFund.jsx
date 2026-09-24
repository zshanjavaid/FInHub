import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { formatMoney, signedMoneyClass } from '../utils/format';
import { usePrivacyHidden } from '../contexts/PrivacyContext';
import { fetchTransactions } from '../store/transactions/transactionsSlice';
import { fetchWithdrawals, createWithdrawal, updateWithdrawal, removeWithdrawal } from '../store/impactFund/impactFundSlice';
import { FiTrendingDown, FiDollarSign, FiCreditCard } from 'react-icons/fi';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import Tabs from '../components/Tabs';
import DataTable from '../components/DataTable';
import Modal, { modalActionsClass } from '../components/Modal';
import InputField from '../components/InputField';
import TextareaField from '../components/TextareaField';
import FilterBar from '../components/FilterBar';
import BrokerProjectFilters from '../components/BrokerProjectFilters';
import { filterByDateRange } from '../utils/date';
import { useDateFilter } from '../hooks/useDateFilter';
import ErrorAlert from '../components/ErrorAlert';
import PageContainer from '../components/PageContainer';
import { compareTransactions, compareWithdrawals } from '../utils/tableSort';
import { toNumber } from '../utils/number';
import { matchesSelectedBroker } from '../utils/brokerFilter';
import { isApproved } from '../constants/app';
import {
  IMPACT_FUND_PERCENT_LABEL,
  transactionImpactFundAmount
} from '../utils/transactionNet';

const ImpactFund = () => {
  const hidden = usePrivacyHidden();
  const dispatch = useDispatch();
  const transactions = useSelector((state) => state.transactions.items);
  const withdrawals = useSelector((state) => state.impactFund.withdrawals);
  const isLoading = useSelector((state) => state.impactFund.isLoading);
  const error = useSelector((state) => state.impactFund.error);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [editingWithdrawalId, setEditingWithdrawalId] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const dateFilter = useDateFilter({ defaultToCurrentMonth: true });
  const { effectiveDateFrom: dateFrom, effectiveDateTo: dateTo } = dateFilter;
  const [activeTab, setActiveTab] = useState('contrib');
  const [selectedBroker, setSelectedBroker] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const safeWithdrawError =
    hidden && withdrawError
      ? 'Amount cannot exceed available balance.'
      : withdrawError;

  useEffect(() => {
    document.title = 'Impact Fund | FinHub';
  }, []);

  useEffect(() => {
    dispatch(fetchTransactions());
    dispatch(fetchWithdrawals());
  }, [dispatch]);

  const contributionHistory = useMemo(() => {
    return (transactions || [])
      .filter(isApproved)
      .map((t) => {
        const amount = transactionImpactFundAmount(t);
        return {
          id: t.id,
          client: t.client || '',
          project: t.project || '',
          date: t.date || '',
          amount
        };
      })
      .filter((c) => c.amount > 0);
  }, [transactions]);

  const withdrawalRows = useMemo(() => {
    return (withdrawals || []).map((w) => ({
      ...w,
      dateDisplay: w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '-'
    }));
  }, [withdrawals]);

  const brokerNames = useMemo(() =>
    [...new Set((contributionHistory || []).map((c) => c.client).filter(Boolean))].sort(),
  [contributionHistory]);

  const filteredContributionHistory = useMemo(() => {
    let list = filterByDateRange(contributionHistory, dateFrom, dateTo, (item) => item.date);
    if (selectedBroker) {
      list = list.filter((item) => matchesSelectedBroker(item, selectedBroker));
    }
    return list;
  }, [contributionHistory, selectedBroker, dateFrom, dateTo]);

  const totalFromSelectedBroker = useMemo(() => {
    if (!selectedBroker) return null;
    return filteredContributionHistory.reduce((sum, c) => sum + c.amount, 0);
  }, [selectedBroker, filteredContributionHistory]);

  const filteredWithdrawalRows = useMemo(
    () => filterByDateRange(withdrawalRows, dateFrom, dateTo, (item) => item.createdAt),
    [withdrawalRows, dateFrom, dateTo]
  );

  const totalContributions = useMemo(
    () => filteredContributionHistory.reduce((sum, c) => sum + c.amount, 0),
    [filteredContributionHistory]
  );

  const totalWithdrawn = useMemo(
    () => filteredWithdrawalRows.reduce((sum, w) => sum + toNumber(w.amount), 0),
    [filteredWithdrawalRows]
  );

  const allTimeRemaining = useMemo(() => {
    const contrib = contributionHistory.reduce((sum, c) => sum + c.amount, 0);
    const withdrawn = (withdrawals || []).reduce((sum, w) => sum + toNumber(w.amount), 0);
    return contrib - withdrawn;
  }, [contributionHistory, withdrawals]);

  const maxWithdrawable = useMemo(() => {
    if (editingWithdrawalId) {
      const current = withdrawals?.find((w) => w.id === editingWithdrawalId);
      return allTimeRemaining + (current ? toNumber(current.amount) : 0);
    }
    return allTimeRemaining;
  }, [allTimeRemaining, editingWithdrawalId, withdrawals]);

  const statCards = [
    {
      label: 'Total Amount',
      value: formatMoney(totalContributions),
      Icon: FiDollarSign,
      valueClassName: 'text-primary-600',
      iconClassName: 'text-primary-500',
      borderClassName: 'border-t-primary-600'
    },
    {
      label: 'Withdrawn',
      value: formatMoney(totalWithdrawn),
      Icon: FiTrendingDown,
      valueClassName: 'text-red-600',
      iconClassName: 'text-red-500',
      borderClassName: 'border-t-red-500'
    },
    {
      label: 'Remaining',
      value: formatMoney(allTimeRemaining),
      Icon: FiCreditCard,
      valueClassName: signedMoneyClass(allTimeRemaining, 'text-emerald-600'),
      iconClassName: allTimeRemaining < 0 ? 'text-red-500' : 'text-emerald-500',
      borderClassName: allTimeRemaining < 0 ? 'border-t-red-500' : 'border-t-emerald-500',
      hint: <span className="text-sm text-slate-500">All time</span>
    }
  ];

  const contributionColumns = [
    { key: 'client', label: 'Broker', align: 'text-left' },
    { key: 'project', label: 'Project Name', align: 'text-left' },
    { key: 'date', label: 'Date', align: 'text-left' },
    {
      key: 'amount',
      label: `Amount (${IMPACT_FUND_PERCENT_LABEL})`,
      align: 'text-right',
      render: (v) => formatMoney(v)
    }
  ];

  const withdrawalColumns = [
    { key: 'dateDisplay', label: 'Date', align: 'text-left' },
    {
      key: 'amount',
      label: 'Amount',
      align: 'text-right',
      render: (v) => formatMoney(v)
    },
    { key: 'description', label: 'Description / Note', align: 'text-left', className: 'min-w-[280px] max-w-md' }
  ];

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setWithdrawError('');
    const amount = toNumber(withdrawAmount);
    if (amount <= 0) {
      setWithdrawError('Amount must be greater than 0.');
      return;
    }
    if (amount > maxWithdrawable) {
      setWithdrawError(`Amount cannot exceed available balance (${formatMoney(maxWithdrawable)}).`);
      return;
    }
    if (editingWithdrawalId) {
      await dispatch(updateWithdrawal({
        id: editingWithdrawalId,
        amount,
        description: withdrawNote.trim() || undefined
      })).unwrap();
    } else {
      await dispatch(createWithdrawal({ amount, description: withdrawNote.trim() || undefined })).unwrap();
    }
    setWithdrawAmount('');
    setWithdrawNote('');
    setWithdrawError('');
    setEditingWithdrawalId(null);
    setIsWithdrawModalOpen(false);
  };

  const openWithdrawModal = () => {
    setEditingWithdrawalId(null);
    setWithdrawAmount('');
    setWithdrawNote('');
    setWithdrawError('');
    setIsWithdrawModalOpen(true);
  };

  const openEditWithdrawal = (withdrawal) => {
    setEditingWithdrawalId(withdrawal.id);
    setWithdrawAmount(withdrawal.amount != null ? String(withdrawal.amount) : '');
    setWithdrawNote(withdrawal.description || '');
    setWithdrawError('');
    setIsWithdrawModalOpen(true);
  };

  const handleDeleteWithdrawal = async (id) => {
    await dispatch(removeWithdrawal(id)).unwrap();
  };

  return (
    <PageContainer>
      <PageHeader title="Impact Fund" actions={<Button variant="danger" onClick={openWithdrawModal} disabled={allTimeRemaining <= 0}><FiTrendingDown className="w-4 h-4" /> Withdraw</Button>} />

        <FilterBar
          dateFilter={dateFilter}
          stats={
            selectedBroker && totalFromSelectedBroker !== null ? (
              <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-primary-50 border border-primary-200/80 px-4 py-3">
                <span className="text-sm text-slate-600">Total from</span>
                <span className="text-sm font-semibold text-primary-700">{selectedBroker}</span>
                <span className="text-primary-500">·</span>
                <span className="text-base font-bold text-primary-600">{formatMoney(totalFromSelectedBroker)}</span>
              </div>
            ) : null
          }
        >
          <BrokerProjectFilters
            brokerOptions={brokerNames}
            selectedBroker={selectedBroker}
            onBrokerChange={setSelectedBroker}
          />
        </FilterBar>

        <ErrorAlert message={error} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              valueClassName={card.valueClassName}
              icon={<card.Icon className="w-5 h-5" />}
              iconClassName={card.iconClassName}
              borderClassName={card.borderClassName}
              hint={card.hint}
            />
          ))}
        </div>

        <Tabs
          tabs={[
            { id: 'contrib', label: 'Contribution history', shortLabel: 'Contributions' },
            { id: 'withdraw', label: 'Withdrawal history', shortLabel: 'Withdrawals' }
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        >
          {activeTab === 'contrib' && (
            <DataTable
              data={filteredContributionHistory}
              columns={contributionColumns}
              title="Contribution history"
              isLoading={false}
              searchConfig={{
                enabled: true,
                placeholder: 'Search by broker, project, date...',
                searchFields: ['client', 'project', 'date']
              }}
              filters={[]}
              emptyTitle="No contributions yet"
              emptyDescription="Add transactions to see 2% Impact Fund contributions here."
              sortCompare={compareTransactions}
            />
          )}
          {activeTab === 'withdraw' && (
            <DataTable
              data={filteredWithdrawalRows}
              columns={withdrawalColumns}
              title="Withdrawal history"
              isLoading={isLoading}
              onEdit={openEditWithdrawal}
              onDelete={handleDeleteWithdrawal}
              searchConfig={{
                enabled: true,
                placeholder: 'Search by description...',
                searchFields: ['description']
              }}
              filters={[]}
              emptyTitle="No withdrawals yet"
              emptyDescription="Use Withdraw to record a withdrawal from the Impact Fund."
              sortCompare={compareWithdrawals}
            />
            )}
          </Tabs>

      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => { setIsWithdrawModalOpen(false); setEditingWithdrawalId(null); setWithdrawError(''); }}
        title={editingWithdrawalId ? 'Edit Withdrawal' : 'Withdraw from Impact Fund'}
      >
        <form onSubmit={handleWithdrawSubmit} className="space-y-4 min-w-0">
          <div>
            <InputField
              label="Amount"
              type="number"
              value={withdrawAmount}
              onChange={(e) => {
                const val = e.target.value;
                setWithdrawAmount(val);
                const num = toNumber(val);
                if (num > maxWithdrawable) {
                  setWithdrawError(`Amount cannot exceed available balance (${formatMoney(maxWithdrawable)}).`);
                } else {
                  setWithdrawError('');
                }
              }}
              placeholder="0.00"
              required
              error={!!withdrawError}
            />
            {safeWithdrawError && (
              <p className="text-sm text-red-600 mt-1" role="alert">{safeWithdrawError}</p>
            )}
          </div>
          <TextareaField
            label="Description / Note"
            value={withdrawNote}
            onChange={(e) => setWithdrawNote(e.target.value)}
            placeholder="Optional note for this withdrawal..."
            rows={4}
          />
          <div className={modalActionsClass}>
            <button
              type="button"
              onClick={() => { setIsWithdrawModalOpen(false); setEditingWithdrawalId(null); setWithdrawError(''); }}
              className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button
              type="submit"
              className="w-full sm:flex-1"
              disabled={isLoading || toNumber(withdrawAmount) <= 0 || toNumber(withdrawAmount) > maxWithdrawable}
            >
              {isLoading ? 'Saving...' : editingWithdrawalId ? 'Update' : 'Withdraw'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};

export default ImpactFund;
