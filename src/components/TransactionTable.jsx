import { FiUser, FiFileText } from 'react-icons/fi';
import DataTable from './DataTable';
import { formatMoney } from '../utils/format';
import { compareTransactions } from '../utils/tableSort';

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const computeNetTotal = (t) => {
  const amount = toNumber(t.amount);
  const brokerageAmount = toNumber(t.brokerageAmount);
  const additionalCharges = toNumber(t.additionalCharges);
  return amount - brokerageAmount - additionalCharges;
};

const displayNetTotal = (t) => {
  if (Number.isFinite(Number(t.totalAmount))) return Number(t.totalAmount);
  return computeNetTotal(t);
};

const formatBrokerageRate = (t) => {
  const type = String(t?.brokerageType || 'percentage').toLowerCase();
  const value = toNumber(t?.brokerageValue);
  const amount = toNumber(t?.brokerageAmount);
  if (amount === 0 && value === 0) return '-';
  if (type === 'percentage') {
    if (value === 0) return '-';
    return `${value}%`;
  }
  if (value === 0) return '-';
  return formatMoney(value);
};

const formatMoneyOrDash = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '-';
  return formatMoney(n);
};

const TransactionTable = ({ transactions, onDelete, onEdit, isLoading = false, title = 'Transaction Details', additionalFilters = null, hideFilters = [] }) => {
  const columns = [
    { key: 'client', label: 'Broker' },
    { key: 'project', label: 'Project Name' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount', render: (v) => formatMoney(v) },
    {
      key: 'brokerageDisplay',
      label: 'Brokerage',
      render: (_, t) => formatBrokerageRate(t)
    },
    { key: 'brokerageAmount', label: 'Brokerage Amount', render: (v) => formatMoneyOrDash(v) },
    { key: 'additionalCharges', label: 'Additional Charges', render: (v) => formatMoneyOrDash(v) },
    {
      key: 'totalAmount',
      label: 'Total (Net)',
      render: (_, t) => formatMoney(displayNetTotal(t))
    }
  ];

  const searchConfig = {
    enabled: true,
    placeholder: 'Search by broker, project, date...',
    searchFields: ['client', 'project', 'date']
  };

  const allFilters = [
    {
      key: 'client',
      label: 'Broker',
      type: 'searchable',
      placeholder: 'All Brokers',
      icon: <FiUser className="w-5 h-5 text-gray-400" />
    },
    {
      key: 'project',
      label: 'Project',
      type: 'searchable',
      placeholder: 'All Projects',
      icon: <FiFileText className="w-5 h-5 text-gray-400" />
    }
  ];
  const filters = hideFilters.length ? allFilters.filter((f) => !hideFilters.includes(f.key)) : allFilters;

  return (
    <DataTable
      data={transactions}
      columns={columns}
      title={title}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={onDelete}
      searchConfig={searchConfig}
      filters={filters}
      additionalFilters={additionalFilters}
      headerSummary={{
        columnKey: 'totalAmount',
        label: 'Total (net)',
        aggregate: (rows) => rows.reduce((s, t) => s + displayNetTotal(t), 0),
        format: formatMoney
      }}
      sortCompare={compareTransactions}
    />
  );
};

export default TransactionTable;
