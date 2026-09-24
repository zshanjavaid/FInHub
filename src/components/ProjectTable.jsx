import DataTable from './DataTable';
import { FiUser } from 'react-icons/fi';
import { PROJECT_TYPE_COLORS } from '../constants/projectTypes';
import { isProjectContractEndingAlert } from '../utils/date';
import { formatMoney } from '../utils/format';
import { getPrivacyHidden, PRIVACY_MASK } from '../privacy/privacyStore';
import { PAYOUT_OCCURRENCE_LABEL_BY_VALUE } from '../constants/payoutOccurrences';
import PersonBadge from './PersonBadge';
import ProjectTypeCountBar from './ProjectTypeCountBar';
import { getEffectiveProjectStatus } from '../utils/transactionsEligibility';

const maskStat = (value) => {
  if (getPrivacyHidden()) return PRIVACY_MASK;
  if (value === '' || value == null) return '-';
  return value;
};

const formatBrokerage = (project) => {
  if (!project.brokerageValue && project.brokerageValue !== 0) return '-';
  if (getPrivacyHidden()) return PRIVACY_MASK;
  return project.brokerageType === 'percentage'
    ? `${project.brokerageValue}%`
    : formatMoney(project.brokerageValue);
};

const formatTax = (project) => {
  if (getPrivacyHidden()) {
    const hasTax =
      (project.taxValue !== '' && project.taxValue != null) ||
      (project.taxAmount !== '' && project.taxAmount != null && Number(project.taxAmount) !== 0);
    return hasTax ? PRIVACY_MASK : '-';
  }
  if (project.taxType === 'percentage' && project.taxValue !== '' && project.taxValue != null) {
    return `${project.taxValue}%`;
  }
  if (project.taxType === 'fixed' && project.taxValue !== '' && project.taxValue != null) {
    return formatMoney(project.taxValue);
  }
  const n = Number(project.taxAmount);
  if (project.taxAmount === '' || project.taxAmount == null || !Number.isFinite(n) || n === 0) return '-';
  return formatMoney(n);
};

const ProjectTable = ({
  projects,
  onDelete,
  onEdit,
  isLoading = false,
  title = 'Saved Projects',
  additionalFilters = null,
  hideFilters = [],
  titleActions = null,
  ...rest
}) => {
  const columns = [
    { key: 'client', label: 'Broker' },
    { key: 'project', label: 'Project Name' },
    { key: 'lead', label: 'Lead', render: (value) => <PersonBadge name={value} /> },
    { key: 'projectManager', label: 'Project Manager', render: (value) => <PersonBadge name={value} /> },
    { key: 'date', label: 'Date' },
    {
      key: 'projectType',
      label: 'Project Type',
      render: (value) => {
        if (!value) return '-';
        const colorClass = PROJECT_TYPE_COLORS[value] || 'bg-gray-100 text-gray-800';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'payoutOccurrence',
      label: 'Payout',
      render: (value) => {
        const key = String(value || 'biweekly').trim().toLowerCase();
        const label = PAYOUT_OCCURRENCE_LABEL_BY_VALUE[key] || 'Biweekly';
        const colorClass =
          key === 'weekly'
            ? 'bg-indigo-100 text-indigo-800'
            : key === 'biweekly'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-200 text-slate-700';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'projectStatus',
      label: 'Status',
      render: (_, project) => {
        const isActive = getEffectiveProjectStatus(project) === 'active';
        const colorClass = isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      }
    },
    {
      key: 'totalMonthlyHours',
      label: 'Monthly Hours',
      render: (v) => maskStat(v)
    },
    {
      key: 'hourlyRate',
      label: 'Hourly Rate',
      render: (v) => {
        if (v === '' || v == null) return '-';
        return formatMoney(v);
      }
    },
    {
      key: 'projectCost',
      label: 'Project Cost',
      render: (v) => formatMoney(v)
    },
    { key: 'recruiterName', label: 'Recruiter Name' },
    { key: 'contractEnding', label: 'End Date' },
    {
      key: 'brokerage',
      label: 'Brokerage',
      render: (_, project) => formatBrokerage(project)
    },
    {
      key: 'taxDisplay',
      label: 'Tax',
      render: (_, project) => formatTax(project)
    }
  ];

  const searchConfig = {
    enabled: true,
    placeholder: 'Search by broker, project, lead, manager, type, or recruiter...',
    searchFields: [
      'client',
      'project',
      'projectType',
      'recruiterName',
      'lead',
      'projectManager',
      'date',
      'contractEnding',
      'payoutOccurrence',
      'projectCost'
    ]
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
      key: 'projectType',
      label: 'Project Type',
      type: 'dropdown'
    }
  ];
  const filters = hideFilters.length ? allFilters.filter((f) => !hideFilters.includes(f.key)) : allFilters;

  const getRowClassName = (project) =>
    isProjectContractEndingAlert(project, 2)
      ? 'bg-rose-50/90 hover:bg-rose-100/80 border-l-[3px] border-l-rose-400/90'
      : '';

  return (
    <DataTable
      data={projects}
      columns={columns}
      title={title}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={onDelete}
      searchConfig={searchConfig}
      filters={filters}
      additionalFilters={additionalFilters}
      getRowClassName={getRowClassName}
      titleActions={
        titleActions ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <ProjectTypeCountBar projects={projects} />
            {titleActions}
          </div>
        ) : (
          <ProjectTypeCountBar projects={projects} />
        )
      }
      {...rest}
    />
  );
};

export default ProjectTable;
