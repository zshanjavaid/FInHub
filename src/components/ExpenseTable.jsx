import { FiFileText } from 'react-icons/fi';
import DataTable from './DataTable';
import { formatMoney } from '../utils/format';
import { EXPENSE_TYPE_LABELS, EXPENSE_TYPE_COLORS, RECURRING_MONTHS_LABELS } from '../constants/expenseTypes';
import { compareExpenses } from '../utils/tableSort';

/** Strip legacy "Brokerage – " prefix from monthly brokerage expense names. */
const displayExpenseName = (name) => {
  const raw = String(name || '').trim();
  return raw.replace(/^Brokerage\s*[–-]\s*/i, '') || raw || '-';
};

const projectKey = (client, project) =>
  `${String(client || '').trim().toLowerCase()}|${String(project || '').trim().toLowerCase()}`;

const resolveBrokerageMeta = (row, projectByKey) => {
  const storedType = String(row?.brokerageType || '').trim().toLowerCase();
  if (storedType === 'fixed' || storedType === 'percentage') {
    return {
      type: storedType,
      value: row?.brokerageValue
    };
  }
  const key = projectKey(row?.client, row?.project);
  const p = key !== '|' ? projectByKey.get(key) : null;
  if (!p) return null;
  return {
    type: String(p.brokerageType || 'percentage').trim().toLowerCase() === 'fixed' ? 'fixed' : 'percentage',
    value: p.brokerageValue
  };
};

const formatBrokerageTypeLabel = (meta) => {
  if (!meta) return 'Brokerage';
  const kind = meta.type === 'fixed' ? 'Fixed' : 'Percentage';
  const n = Number(meta.value);
  if (!Number.isFinite(n) || n === 0) return `Brokerage · ${kind}`;
  if (meta.type === 'fixed') return `Brokerage · Fixed ${formatMoney(n)}`;
  return `Brokerage · ${n}%`;
};

const sumExpenseAmounts = (rows) =>
  rows.reduce((s, e) => {
    const n = Number(e.amount);
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

const ExpenseTable = ({
  expenses,
  onDelete,
  onEdit,
  isLoading = false,
  title = 'Expense Details',
  additionalFilters = null,
  hideFilters = [],
  projects = []
}) => {
  const projectByKey = (() => {
    const map = new Map();
    (projects || []).forEach((p) => {
      const key = projectKey(p?.client, p?.project);
      if (key === '|') return;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, p);
        return;
      }
      const prevAt = String(prev.updatedAt || prev.createdAt || prev.date || '');
      const nextAt = String(p.updatedAt || p.createdAt || p.date || '');
      if (nextAt.localeCompare(prevAt) >= 0) map.set(key, p);
    });
    return map;
  })();

  const columns = [
    { key: 'expenseName', label: 'Expense Name', render: (v) => displayExpenseName(v) },
    { key: 'date', label: 'Date' },
    {
      key: 'expenseType',
      label: 'Type',
      render: (value, row) => {
        if (!value) return '-';
        const key = value?.toLowerCase();
        let label = EXPENSE_TYPE_LABELS[key] || value;
        if (key === 'software_tool' && row.recurring && row.recurringMonths) {
          const period = RECURRING_MONTHS_LABELS[row.recurringMonths] ?? `${row.recurringMonths} months`;
          label = `Software Tool (${period})`;
        }
        if (key === 'brokerage') {
          label = formatBrokerageTypeLabel(resolveBrokerageMeta(row, projectByKey));
        }
        const colorClass = EXPENSE_TYPE_COLORS[key] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${colorClass}`}>
            {label}
          </span>
        );
      }
    },
    { key: 'amount', label: 'Amount', render: (v) => formatMoney(v) },
    { key: 'comment', label: 'Comment/Remark' }
  ];

  const searchConfig = {
    enabled: true,
    placeholder: 'Search by expense name, type, comment...',
    searchFields: ['expenseName', 'expenseType', 'comment', 'date']
  };

  const allFilters = [
    {
      key: 'expenseType',
      label: 'Type',
      type: 'searchable',
      placeholder: 'All Types',
      icon: <FiFileText className="w-5 h-5 text-gray-400" />
    }
  ];
  const filters = hideFilters.length ? allFilters.filter((f) => !hideFilters.includes(f.key)) : allFilters;

  return (
    <DataTable
      data={expenses}
      columns={columns}
      title={title}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={onDelete}
      searchConfig={searchConfig}
      filters={filters}
      additionalFilters={additionalFilters}
      headerSummary={{
        columnKey: 'amount',
        label: 'Total',
        aggregate: sumExpenseAmounts,
        format: formatMoney
      }}
      sortCompare={compareExpenses}
    />
  );
};

export default ExpenseTable;
