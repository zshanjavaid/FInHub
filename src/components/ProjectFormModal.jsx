import { useMemo } from 'react';
import FormModal from './FormModal';
import { FiUser, FiCalendar, FiDollarSign, FiPercent } from 'react-icons/fi';
import { getTaxFormDefaultsFromProject } from '../utils/project';
import { PAYOUT_OCCURRENCE_OPTIONS, PAYOUT_OCCURRENCE_LABEL_BY_VALUE } from '../constants/payoutOccurrences';
import { LEAD_OPTIONS, PROJECT_MANAGER_OPTIONS } from '../constants/projectAssignments';
import { EMPTY_PROJECT_FORM } from '../utils/formValues';
import { addMonthsLocalYmd, todayLocalYmd } from '../utils/date';

const ProjectFormModal = ({
  isOpen,
  onClose,
  title,
  clientOptions = [],
  projectTypeOptions = [],
  initialValues = EMPTY_PROJECT_FORM,
  onSubmit,
  isSaving = false,
  projects = []
}) => {
  const today = todayLocalYmd();
  const contractEndingDefault = addMonthsLocalYmd(6);
  const taxFromInitial = getTaxFormDefaultsFromProject(initialValues);
  const normalizedInitialValues = {
    ...EMPTY_PROJECT_FORM,
    ...(initialValues || {}),
    date: initialValues && initialValues.date ? initialValues.date : today,
    projectType:
      initialValues && initialValues.projectType !== undefined && initialValues.projectType !== ''
        ? initialValues.projectType
        : EMPTY_PROJECT_FORM.projectType,
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
        required: true,
        options: clientOptions,
        placeholder: clientOptions.length > 0 ? 'Type or select broker...' : 'Enter broker name...',
        icon: <FiUser className="w-5 h-5 text-gray-400" />
      },
      {
        type: 'text',
        name: 'project',
        label: 'Project Name',
        required: true
      },
      {
        type: 'date',
        name: 'date',
        label: 'Date',
        required: true,
        defaultValue: today,
        icon: <FiCalendar className="w-5 h-5 text-gray-400" />
      },
      {
        type: 'dropdown',
        name: 'projectType',
        label: 'Project Type',
        required: true,
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
        required: true,
        defaultValue: contractEndingDefault,
        icon: <FiCalendar className="w-5 h-5 text-gray-400" />
      },
      {
        type: 'number',
        name: 'totalMonthlyHours',
        label: 'Total Monthly Hours',
        required: true,
        min: 0.01
      },
      {
        type: 'number',
        name: 'hourlyRate',
        label: 'Hourly Rate',
        required: true,
        min: 0.01,
        icon: <FiDollarSign className="w-5 h-5 text-gray-400" />
      },
      {
        type: 'number',
        name: 'projectCost',
        label: 'Project Cost',
        icon: <FiDollarSign className="w-5 h-5 text-gray-400" />
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
              <FiPercent className="w-5 h-5 text-gray-400" />
            ) : (
              <FiDollarSign className="w-5 h-5 text-gray-400" />
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
              <FiPercent className="w-5 h-5 text-gray-400" />
            ) : (
              <FiDollarSign className="w-5 h-5 text-gray-400" />
            )
        }
      }
    ],
    [clientOptions, projectTypeOptions, today, contractEndingDefault]
  );

  const handleSubmit = async (values) => {
    const client = String(values.client || '').trim();
    const project = String(values.project || '').trim();
    const date = String(values.date || '').trim();
    const hours = Number(values.totalMonthlyHours);
    const rate = Number(values.hourlyRate);
    if (
      !client ||
      !project ||
      !date ||
      values.totalMonthlyHours === '' ||
      values.totalMonthlyHours == null ||
      !Number.isFinite(hours) ||
      hours <= 0 ||
      values.hourlyRate === '' ||
      values.hourlyRate == null ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      return;
    }
    await onSubmit?.(values);
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
      panelClassName="max-w-3xl"
    />
  );
};

export default ProjectFormModal;
