import { useMemo } from 'react';
import FormModal from './FormModal';
import { FiUser, FiCalendar, FiDollarSign, FiPercent } from 'react-icons/fi';
import { getTaxFormDefaultsFromProject } from '../utils/project';
import { PAYOUT_OCCURRENCE_OPTIONS, PAYOUT_OCCURRENCE_LABEL_BY_VALUE } from '../constants/payoutOccurrences';
import { LEAD_OPTIONS, PROJECT_MANAGER_OPTIONS } from '../constants/projectAssignments';
import { PROJECT_INACTIVE_REASON_OPTIONS } from '../constants/projectInactiveReasons';
import { EMPTY_PROJECT_FORM } from '../utils/formValues';
import { addMonthsLocalYmd, normalizeDateToYYYYMMDD, todayLocalYmd } from '../utils/date';

const ProjectFormModal = ({
  isOpen,
  onClose,
  title,
  clientOptions = [],
  projectTypeOptions = [],
  initialValues = EMPTY_PROJECT_FORM,
  onSubmit,
  isSaving = false,
  projects = [],
  isEditing = false
}) => {
  const today = todayLocalYmd();
  const contractEndingDefault = addMonthsLocalYmd(6);
  const taxFromInitial = getTaxFormDefaultsFromProject(initialValues);
  const previousContractEnding = normalizeDateToYYYYMMDD(initialValues?.contractEnding);
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
    taxValue: taxFromInitial.taxValue,
    endDateChangeMode: 'extension',
    inactiveReason: initialValues?.inactiveReason || '',
    inactiveReasonOther: initialValues?.inactiveReasonOther || ''
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
    if (fieldName === 'contractEnding' && isEditing && previousContractEnding) {
      const next = normalizeDateToYYYYMMDD(value);
      if (next && next !== previousContractEnding) {
        form.endDateChangeMode = form.endDateChangeMode || 'extension';
      } else {
        form.endDateChangeMode = 'extension';
      }
    }
    if (fieldName === 'projectStatus') {
      if (String(value || '').trim().toLowerCase() !== 'inactive') {
        form.inactiveReason = '';
        form.inactiveReasonOther = '';
      }
    }
    if (fieldName === 'inactiveReason' && String(value || '').trim() !== 'Other') {
      form.inactiveReasonOther = '';
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
          { value: 'inactive', label: 'Completed' }
        ],
        hidePlaceholder: true
      },
      {
        type: 'dropdown',
        name: 'inactiveReason',
        label: 'Reason for completed',
        required: true,
        options: PROJECT_INACTIVE_REASON_OPTIONS,
        hidePlaceholder: false,
        placeholder: 'Select reason...',
        showWhen: (form) => String(form?.projectStatus || '').trim().toLowerCase() === 'inactive'
      },
      {
        type: 'text',
        name: 'inactiveReasonOther',
        label: 'Other reason',
        required: true,
        placeholder: 'Enter reason...',
        showWhen: (form) =>
          String(form?.projectStatus || '').trim().toLowerCase() === 'inactive' &&
          String(form?.inactiveReason || '').trim() === 'Other'
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
        icon: <FiCalendar className="w-5 h-5 text-gray-400" />,
        footer: (form, onChange) => {
          if (!isEditing || !previousContractEnding) return null;
          if (normalizeDateToYYYYMMDD(form?.contractEnding) === previousContractEnding) return null;
          const mode = form.endDateChangeMode === 'update' ? 'update' : 'extension';
          return (
            <div className="absolute left-0 top-full z-10 mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-0.5">
              {[
                { value: 'extension', label: 'Extension' },
                { value: 'update', label: 'Update only' }
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <input
                    type="radio"
                    name="endDateChangeMode"
                    value={opt.value}
                    checked={mode === opt.value}
                    onChange={() => onChange('endDateChangeMode', opt.value)}
                    className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-primary-600 text-primary-600 border-primary-300 focus:ring-primary-500 focus:ring-offset-0"
                  />
                  <span
                    className={`text-[10px] font-semibold leading-none ${
                      mode === opt.value ? 'text-primary-700' : 'text-slate-500'
                    }`}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          );
        }
      },
      {
        type: 'number',
        name: 'totalMonthlyHours',
        label: 'Total Monthly Hours',
        required: (form) => String(form?.projectType || '').trim() !== 'Freelance',
        min: 0.01
      },
      {
        type: 'number',
        name: 'hourlyRate',
        label: 'Hourly Rate',
        required: (form) => String(form?.projectType || '').trim() !== 'Freelance',
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
    [clientOptions, projectTypeOptions, today, contractEndingDefault, isEditing, previousContractEnding]
  );

  const handleSubmit = async (values) => {
    const client = String(values.client || '').trim();
    const project = String(values.project || '').trim();
    const date = String(values.date || '').trim();
    const isFreelance = String(values.projectType || '').trim() === 'Freelance';
    const hours = Number(values.totalMonthlyHours);
    const rate = Number(values.hourlyRate);
    if (!client || !project || !date) return;
    if (!isFreelance) {
      if (
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
