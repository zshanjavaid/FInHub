import { useEffect, useMemo, useState } from 'react';
import FormModal from './FormModal';
import { FiUser, FiFileText, FiDollarSign } from 'react-icons/fi';
import { formatMoney } from '../utils/format';
import { HiOutlineCurrencyDollar, HiOutlinePercentBadge } from 'react-icons/hi2';
import { normalizeDateToYYYYMMDD, todayLocalYmd } from '../utils/date';
import { isApproved } from '../constants/app';
import { PAYOUT_OCCURRENCE_LABEL_BY_VALUE } from '../constants/payoutOccurrences';
import { isProjectEligibleForTransactions } from '../utils/transactionsEligibility';
import { countExpectedPayoutsInRange, countExpectedWithCarryover, getPayoutOccurrenceLabel } from '../utils/payoutSchedule';
import { computeProjectBrokerageDollars } from '../utils/project';

const defaultForm = {
  client: '',
  project: '',
  date: '',
  amount: '',
  brokerageType: 'percentage',
  brokerageValue: '',
  brokerageAmount: '',
  additionalCharges: ''
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const computeTotalAmount = ({ amount, brokerageAmount, additionalCharges }) => {
  const a = toNumber(amount);
  const bAmt = toNumber(brokerageAmount);
  const charges = toNumber(additionalCharges);
  return a - bAmt - charges;
};

const TransactionFormModal = ({
  isOpen,
  onClose,
  title,
  initialValues = defaultForm,
  onSubmit,
  isSaving = false,
  projects = [],
  clientOptions = [],
  transactions = [],
  editingTransactionId = null,
  editingTransaction = null
}) => {
  const today = todayLocalYmd();
  const [submitError, setSubmitError] = useState('');
  const normalizedInitialValues = {
    ...defaultForm,
    ...(initialValues || {}),
    date: (initialValues && initialValues.date) ? initialValues.date : today
  };

  const eligibleProjects = useMemo(
    () => (projects || []).filter((p) => isProjectEligibleForTransactions(p, 2)),
    [projects]
  );

  const activeClientOptions = useMemo(
    () => [...new Set(eligibleProjects.map((p) => p.client).filter(Boolean).map((c) => String(c).trim()))].sort(),
    [eligibleProjects]
  );

  const uniqueProjectsForBroker = (broker, currentProjects) => {
    if (!broker) return [];
    const items = currentProjects
      .filter((p) => (p.client || '').trim().toLowerCase() === broker.trim().toLowerCase())
      .map((p) => p.project)
      .filter(Boolean)
      .map((p) => String(p).trim())
      .filter(Boolean);
    return [...new Set(items)].sort();
  };

  const findLatestProjectByBrokerAndProject = (broker, projectName) => {
    if (!broker || !projectName || !eligibleProjects?.length) return null;
    const matches = eligibleProjects
      .filter((p) =>
        (p.client || '').trim().toLowerCase() === broker.trim().toLowerCase() &&
        (p.project || '').trim().toLowerCase() === projectName.trim().toLowerCase()
      )
      .sort((a, b) => {
        const dateA = a.createdAt || a.date || '';
        const dateB = b.createdAt || b.date || '';
        return dateB.localeCompare(dateA);
      });
    return matches[0] || null;
  };

  /**
   * Percentage: amount × rate.
   * Fixed (new entries only): Mon–Fri prorated month fee, minus other approved txs
   * in the same month. Edits keep the stored amount so existing rows are unchanged.
   */
  const computeBrokerageAmount = (form) => {
    const type = String(form.brokerageType || 'percentage').trim().toLowerCase();
    const value = toNumber(form.brokerageValue);

    if (type === 'percentage') {
      return (toNumber(form.amount) * value) / 100;
    }

    // Existing entries: do not re-prorate on edit
    if (editingTransactionId) {
      if (form.brokerageAmount !== '' && form.brokerageAmount != null) {
        return toNumber(form.brokerageAmount);
      }
      return value;
    }

    const dateYmd = normalizeDateToYYYYMMDD(form.date);
    const monthKey = dateYmd ? dateYmd.slice(0, 7) : '';
    const projectRow = findLatestProjectByBrokerAndProject(form.client, form.project);

    if (!monthKey || !projectRow) return value;

    const monthFee = Number(
      computeProjectBrokerageDollars(
        { ...projectRow, brokerageType: 'fixed', brokerageValue: value },
        { monthKey }
      ).toFixed(2)
    );

    const clientKey = String(form.client || '').trim().toLowerCase();
    const projectKey = String(form.project || '').trim().toLowerCase();
    const othersSum = (transactions || [])
      .filter(isApproved)
      .filter((t) => {
        const d = normalizeDateToYYYYMMDD(t.date);
        if (!d || d.slice(0, 7) !== monthKey) return false;
        return (
          String(t.client || '').trim().toLowerCase() === clientKey &&
          String(t.project || '').trim().toLowerCase() === projectKey
        );
      })
      .reduce((s, t) => s + (toNumber(t.brokerageAmount) || 0), 0);

    return Math.max(0, Number((monthFee - othersSum).toFixed(2)));
  };

  const handleFieldChange = (form, fieldName, value) => {
    if (submitError) setSubmitError('');
    if (fieldName === 'client') {
      form.project = '';
    }

    if (fieldName === 'project' && form.client && value) {
      const latest = findLatestProjectByBrokerAndProject(form.client, value);
      if (latest) {
        form.brokerageType = latest.brokerageType || 'percentage';
        form.brokerageValue = latest.brokerageValue || '';
      }
    }

    const type = String(form.brokerageType || 'percentage').trim().toLowerCase();
    const shouldRecalc =
      fieldName === 'amount' ||
      fieldName === 'brokerageType' ||
      fieldName === 'brokerageValue' ||
      fieldName === 'additionalCharges' ||
      fieldName === 'date' ||
      fieldName === 'client' ||
      fieldName === 'project';

    if (!shouldRecalc) return form;

    // Edits: never re-apply working-day proration to existing rows
    if (editingTransactionId && type === 'fixed') {
      if (fieldName === 'brokerageValue' || fieldName === 'brokerageType') {
        const fee = toNumber(form.brokerageValue);
        form.brokerageAmount = fee ? fee.toFixed(2) : '';
      }
      return form;
    }

    const brokerageAmount = computeBrokerageAmount(form);
    form.brokerageAmount = brokerageAmount ? brokerageAmount.toFixed(2) : '';
    return form;
  };

  const fields = useMemo(() => [
    ...(submitError ? [{
      type: 'summary',
      name: 'cadenceError',
      fullWidth: true,
      render: () => (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-card">
          <p className="font-semibold">{submitError}</p>
        </div>
      )
    }] : []),
    {
      type: 'searchable-dropdown',
      name: 'client',
      label: 'Broker',
      options: activeClientOptions,
      placeholder: activeClientOptions.length > 0 ? 'Type or select broker...' : 'Enter broker name...',
      icon: <FiUser className="w-5 h-5 text-gray-400" />
    },
    {
      type: 'searchable-dropdown',
      name: 'project',
      label: 'Project Name',
      options: (form) => uniqueProjectsForBroker(form.client, eligibleProjects),
      placeholder: (form) => form.client ? 'Type or select project...' : 'Select broker first...',
      icon: <FiFileText className="w-5 h-5 text-gray-400" />
    },
    {
      type: 'date',
      name: 'date',
      label: 'Date',
      defaultValue: today
    },
    {
      type: 'number',
      name: 'amount',
      label: 'Amount',
      icon: <FiDollarSign className="w-5 h-5 text-gray-400" />
    },
    {
      type: 'radio-group',
      name: 'brokerageType',
      label: 'Brokerage',
      options: [
        { value: 'percentage', label: 'Percentage' },
        { value: 'fixed', label: 'Fixed Amount' }
      ],
      defaultValue: 'percentage',
      dynamicLabel: (form) => form.brokerageType === 'percentage' ? 'Brokerage (%)' : 'Brokerage ($)',
      inputField: {
        name: 'brokerageValue',
        type: 'number',
        placeholder: (form) => form.brokerageType === 'percentage' ? 'Enter percentage...' : 'Enter amount...',
        icon: (form) => form.brokerageType === 'percentage'
          ? <HiOutlinePercentBadge className="w-5 h-5 text-gray-400" />
          : <HiOutlineCurrencyDollar className="w-5 h-5 text-gray-400" />
      },
      inlineInput: true
    },
    {
      type: 'number',
      name: 'additionalCharges',
      label: 'Additional Charges',
      icon: <FiDollarSign className="w-5 h-5 text-gray-400" />
    },
    {
      type: 'summary',
      name: 'netTotalSummary',
      label: 'Summary',
      fullWidth: true,
      render: (form) => {
        const amount = toNumber(form.amount);
        const brokerageAmount = computeBrokerageAmount(form);
        const additionalCharges = toNumber(form.additionalCharges);
        const netBeforeImpactFund = computeTotalAmount({ ...form, brokerageAmount });
        const impactFund = Number(((netBeforeImpactFund > 0 ? netBeforeImpactFund : 0) * 0.02).toFixed(2));
        const netTotal = Number((netBeforeImpactFund - impactFund).toFixed(2));
        const brokerageValue = toNumber(form.brokerageValue);
        const isFixed = String(form.brokerageType || '').toLowerCase() === 'fixed';
        const brokerageLabel = isFixed
          ? 'Brokerage'
          : `Brokerage (${brokerageValue}%)`;

        return (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Amount</span>
              <span className="text-gray-900 font-semibold">{formatMoney(amount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">(-) {brokerageLabel}</span>
              <span className="text-red-600 font-semibold">{formatMoney(brokerageAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">(-) Additional Charges</span>
              <span className="text-red-600 font-semibold">{formatMoney(additionalCharges)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">(-) Impact Fund (2%)</span>
              <span className="text-red-600 font-semibold">{formatMoney(impactFund)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <span className="text-gray-900 font-semibold">Total Amount (Net)</span>
              <span className="text-primary-700 font-bold text-lg">{formatMoney(netTotal)}</span>
            </div>
          </div>
        );
      }
    }
  ], [activeClientOptions, eligibleProjects, today, submitError, transactions, editingTransactionId]);

  useEffect(() => {
    if (!isOpen) setSubmitError('');
  }, [isOpen]);

  const handleSubmit = async (values) => {
    const latestProject = values.client && values.project
      ? findLatestProjectByBrokerAndProject(values.client, values.project)
      : null;

    const txDate = normalizeDateToYYYYMMDD(values.date);
    if (txDate && latestProject && !editingTransaction?.autoGenerated) {
      const monthKey = txDate.slice(0, 7);
      const monthStart = `${monthKey}-01`;
      const [yy, mm] = monthKey.split('-').map(Number);
      const lastDay = Number.isFinite(yy) && Number.isFinite(mm) ? new Date(yy, mm, 0).getDate() : 31;
      const monthEnd = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
      const ownTx = (transactions || [])
        .filter(isApproved)
        .filter((t) =>
          (t.client || '').trim() === (values.client || '').trim() &&
          (t.project || '').trim() === (values.project || '').trim()
        );
      const carryMeta = countExpectedWithCarryover(latestProject, ownTx, monthStart, monthEnd);
      const allowedThisMonth = countExpectedPayoutsInRange(latestProject, monthStart, monthEnd) + (carryMeta.carryIn || 0);

      const existingCount = (transactions || [])
        .filter(isApproved)
        .filter((t) => {
          if (editingTransactionId && t?.id === editingTransactionId) return false;
          if ((t.client || '').trim() !== (values.client || '').trim()) return false;
          if ((t.project || '').trim() !== (values.project || '').trim()) return false;
          const d = normalizeDateToYYYYMMDD(t.date);
          return d && d.slice(0, 7) === monthKey;
        }).length;

      if (allowedThisMonth > 0 && existingCount >= allowedThisMonth) {
        const payoutLabel = getPayoutOccurrenceLabel(latestProject, PAYOUT_OCCURRENCE_LABEL_BY_VALUE);
        setSubmitError(`This project is ${payoutLabel}. You already have ${existingCount} transaction${existingCount === 1 ? '' : 's'} in ${monthKey}.`);
        return;
      }
    }

    const brokerageAmount = computeBrokerageAmount(values);
    const totalAmount = computeTotalAmount({ ...values, brokerageAmount });
    const transactionData = {
      ...values,
      brokerageAmount: brokerageAmount ? Number(brokerageAmount.toFixed(2)) : 0,
      totalAmount: Number.isFinite(totalAmount) ? Number(totalAmount.toFixed(2)) : 0,
      amount: toNumber(values.amount),
      brokerageValue: toNumber(values.brokerageValue),
      additionalCharges: toNumber(values.additionalCharges)
    };
    await onSubmit?.(transactionData);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      fields={fields}
      initialValues={normalizedInitialValues}
      onSubmit={handleSubmit}
      isSaving={isSaving}
      onFieldChange={handleFieldChange}
    />
  );
};

export default TransactionFormModal;

