import { useMemo } from 'react';
import FormModal from './FormModal';
import { FiUser } from 'react-icons/fi';
import { HiOutlineCurrencyDollar, HiOutlinePercentBadge } from 'react-icons/hi2';
import { getTaxFormDefaultsFromProject } from '../utils/project';
import { PAYOUT_OCCURRENCE_OPTIONS, PAYOUT_OCCURRENCE_LABEL_BY_VALUE } from '../constants/payoutOccurrences';
import { LEAD_OPTIONS, PROJECT_MANAGER_OPTIONS } from '../constants/projectAssignments';
import { addMonthsLocalYmd, todayLocalYmd } from '../utils/date';

const defaultForm = {
  client: '',
  date: '',
  project: '',
  projectType: 'Full time',
  projectStatus: 'active',
  payoutOccurrence: 'biweekly',
  totalMonthlyHours: '',
  hourlyRate: '',
  projectCost: '',
  recruiterName: '',
  lead: '',
  projectManager: '',
  contractEnding: '',
  brokerageType: 'percentage',
  brokerageValue: '',
  taxType: 'percentage',
  taxValue: ''
};

const ProjectFormModal = ({
  isOpen,
  onClose,
  title,
  clientOptions = [],
  projectTypeOptions = [],
  initialValues = defaultForm,
  onSubmit,
  isSaving = false,
  projects = []
}) => {
  const today = todayLocalYmd();
  const contractEndingDefault = addMonthsLocalYmd(6);
  const taxFromInitial = getTaxFormDefaultsFromProject(initialValues);
  const normalizedInitialValues = {
    ...defaultForm,
    ...(initialValues || {}),
    date: initialValues && initialValues.date ? initialValues.date : today,
    projectType:
      initialValues && initialValues.projectType !== undefined && initialValues.projectType !== ''
        ? initialValues.projectType
        : 'Full time',
    projectStatus: initialValues && initialValues.projectStatus ? initialValues.projectStatus : 'active',
    contractEnding: initialValues && initialValues.contractEnding ? initialValues.contractEnding : contractEndingDefault,
    payoutOccurrence:
      initialValues && initialValues.payoutOccurrence
        ? (PAYOUT_OCCURRENCE_LABEL_BY_VALUE[initialValues.payoutOccurrence] ? initialValues.payoutOccurrence : 'biweekly')
        : 'biweekly',
    taxType: taxFromInitial.taxType,
    taxValue: taxFromInitial.taxValue
  };

  const findLatestProjectByBroker = (brokerName) => {
    if (!brokerName || !projects || projects.length === 0) return null;

    const brokerProjects = projects
      .filter((p) => p.client && p.client.trim().toLowerCase() === brokerName.trim().toLowerCase())
      .sort((a, b) => {
        const dateA = a.createdAt || a.date || '';
        const dateB = b.createdAt || b.date || '';
        return dateB.localeCompare(dateA);
      });

    return brokerProjects.length > 0 ? brokerProjects[0] : null;
  };

  const handleFieldChange = (form, fieldName, value) => {
    if (fieldName === 'client' && value) {
      const latestProject = findLatestProjectByBroker(value);
      if (latestProject) {
        form.brokerageValue = latestProject.brokerageValue || '';
        form.brokerageType = latestProject.brokerageType || 'percentage';
        form.projectCost =
          latestProject.projectCost != null && latestProject.projectCost !== ''
            ? String(latestProject.projectCost)
            : '';
        const taxDefaults = getTaxFormDefaultsFromProject(latestProject);
        form.taxType = taxDefaults.taxType;
        form.taxValue = taxDefaults.taxValue;
      }
    }
    return form;
  };

  const fields = useMemo(
    () => [
      {
        type: 'searchable-dropdown',
        name: 'client',
        label: 'Broker',
        options: clientOptions,
        placeholder: clientOptions.length > 0 ? 'Type or select broker...' : 'Enter broker name...',
        icon: <FiUser className="w-5 h-5 text-gray-400" />
      },
      {
        type: 'text',
        name: 'project',
        label: 'Project Name'
      },
      {
        type: 'date',
        name: 'date',
        label: 'Date',
        defaultValue: today
      },
      {
        type: 'dropdown',
        name: 'projectType',
        label: 'Project Type',
        options: projectTypeOptions,
        hidePlaceholder: true
      },
      {
        type: 'dropdown',
        name: 'projectStatus',
        label: 'Status',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ],
        hidePlaceholder: true
      },
      {
        type: 'dropdown',
        name: 'lead',
        label: 'Lead',
        options: LEAD_OPTIONS,
        hidePlaceholder: false
      },
      {
        type: 'dropdown',
        name: 'projectManager',
        label: 'Project Manager',
        options: PROJECT_MANAGER_OPTIONS,
        hidePlaceholder: false
      },
      {
        type: 'dropdown',
        name: 'payoutOccurrence',
        label: 'Payout Occurrence',
        options: PAYOUT_OCCURRENCE_OPTIONS,
        hidePlaceholder: true,
        showWhen: (form) => String(form?.projectType || '').trim() !== 'Freelance'
      },
      {
        type: 'date',
        name: 'contractEnding',
        label: 'End Date',
        defaultValue: contractEndingDefault
      },
      {
        type: 'number',
        name: 'totalMonthlyHours',
        label: 'Total Monthly Hours'
      },
      {
        type: 'number',
        name: 'hourlyRate',
        label: 'Hourly Rate',
        icon: <HiOutlineCurrencyDollar className="w-5 h-5 text-gray-400" />
      },
      {
        type: 'number',
        name: 'projectCost',
        label: 'Project Cost',
        icon: <HiOutlineCurrencyDollar className="w-5 h-5 text-gray-400" />
      },
      {
        type: 'text',
        name: 'recruiterName',
        label: 'Recruiter Name'
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
        dynamicLabel: (form) => (form.brokerageType === 'percentage' ? 'Brokerage (%)' : 'Brokerage ($)'),
        inputField: {
          name: 'brokerageValue',
          type: 'number',
          placeholder: (form) =>
            form.brokerageType === 'percentage' ? 'Enter percentage...' : 'Enter amount...',
          icon: (form) =>
            form.brokerageType === 'percentage' ? (
              <HiOutlinePercentBadge className="w-5 h-5 text-gray-400" />
            ) : (
              <HiOutlineCurrencyDollar className="w-5 h-5 text-gray-400" />
            )
        },
        twinRow: true
      },
      {
        type: 'radio-group',
        name: 'taxType',
        label: 'Tax amount',
        options: [
          { value: 'percentage', label: 'Percentage' },
          { value: 'fixed', label: 'Fixed Amount' }
        ],
        defaultValue: 'percentage',
        dynamicLabel: (form) =>
          form.taxType === 'percentage' ? 'Tax amount (%)' : 'Tax amount ($)',
        inputField: {
          name: 'taxValue',
          type: 'number',
          placeholder: (form) => (form.taxType === 'percentage' ? 'Enter percentage...' : 'Enter amount...'),
          icon: (form) =>
            form.taxType === 'percentage' ? (
              <HiOutlinePercentBadge className="w-5 h-5 text-gray-400" />
            ) : (
              <HiOutlineCurrencyDollar className="w-5 h-5 text-gray-400" />
            )
        }
      }
    ],
    [clientOptions, projectTypeOptions, today, contractEndingDefault]
  );

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      fields={fields}
      initialValues={normalizedInitialValues}
      onSubmit={onSubmit}
      isSaving={isSaving}
      onFieldChange={handleFieldChange}
      panelClassName="max-w-3xl"
    />
  );
};

export default ProjectFormModal;
