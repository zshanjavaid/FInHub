import { useMemo } from 'react';
import FormModal from './FormModal';
import { FiUser, FiCalendar, FiDollarSign, FiPercent, FiRefreshCw, FiEdit3, FiRotateCcw } from 'react-icons/fi';
import { getTaxFormDefaultsFromProject } from '../utils/project';
import { PAYOUT_OCCURRENCE_OPTIONS, PAYOUT_OCCURRENCE_LABEL_BY_VALUE } from '../constants/payoutOccurrences';
import { LEAD_OPTIONS, PROJECT_MANAGER_OPTIONS, mergeAssignmentNames } from '../constants/projectAssignments';
import { PROJECT_INACTIVE_REASON_OPTIONS } from '../constants/projectInactiveReasons';
import { EMPTY_PROJECT_FORM } from '../utils/formValues';
import { addMonthsLocalYmd, normalizeDateToYYYYMMDD, todayLocalYmd } from '../utils/date';
import { getContractExtensions } from '../utils/projectContractExtensions';

const END_DATE_CHANGE_OPTIONS = [
  {
    value: 'extension',
    label: 'Extension',
    hint: 'Record old → new end date in history',
    icon: FiRefreshCw
  },
  {
    value: 'update',
    label: 'Update only',
    hint: 'Change the date; keep existing history',
    icon: FiEdit3
  },
  {
    value: 'reset',
    label: 'Clear history',
    hint: 'Wipe extensions and set this as the new end date',
    icon: FiRotateCcw,
    needsHistory: true
  }
];

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
  const existingExtensionCount = getContractExtensions(initialValues).length;
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
        const mode = form.endDateChangeMode || 'extension';
        // Clear history option only applies when there is history to clear.
        form.endDateChangeMode =
          mode === 'reset' && existingExtensionCount === 0 ? 'extension' : mode;
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

  const leadOptions = useMemo(
    () => mergeAssignmentNames(LEAD_OPTIONS, projects, 'lead'),
    [projects]
  );
  const projectManagerOptions = useMemo(
    () => mergeAssignmentNames(PROJECT_MANAGER_OPTIONS, projects, 'projectManager'),
    [projects]
  );

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
        type: 'searchable-dropdown',
        name: 'lead',
        label: 'Lead',
        options: leadOptions,
        placeholder: 'Type or select Lead...'
      },
      {
        type: 'searchable-dropdown',
        name: 'projectManager',
        label: 'Project Manager',
        options: projectManagerOptions,
        placeholder: 'Type or select Project Manager...'
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
        required: (form) => String(form?.projectType || '').trim() !== 'Freelance',
        min: 0.01
      },
      {
        type: 'summary',
        name: 'endDateChangeMode',
        fullWidth: true,
        showWhen: (form) =>
          isEditing &&
          Boolean(previousContractEnding) &&
          normalizeDateToYYYYMMDD(form?.contractEnding) !== previousContractEnding,
        render: (form, onChange) => {
          const mode =
            form.endDateChangeMode === 'update' || form.endDateChangeMode === 'reset'
              ? form.endDateChangeMode
              : 'extension';
          const nextEnd = normalizeDateToYYYYMMDD(form?.contractEnding) || '—';
          const options = END_DATE_CHANGE_OPTIONS.filter(
            (opt) => !opt.needsHistory || existingExtensionCount > 0
          );
          const selected = options.some((o) => o.value === mode) ? mode : 'extension';

          return (
            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 sm:p-4 space-y-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">End date changed</p>
                <p className="text-xs font-light text-slate-500 mt-1 leading-relaxed">
                  Was <span className="font-mono tabular-nums text-slate-700">{previousContractEnding}</span>
                  {' → '}
                  <span className="font-mono tabular-nums text-slate-700">{nextEnd}</span>
                  {existingExtensionCount > 0
                    ? ` · ${existingExtensionCount} extension${existingExtensionCount === 1 ? '' : 's'} on file`
                    : ''}
                </p>
              </div>
              <div
                className={`grid grid-cols-1 gap-2 ${
                  options.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
                }`}
                role="radiogroup"
                aria-label="How to apply the new end date"
              >
                {options.map((opt) => {
                  const Icon = opt.icon;
                  const active = selected === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onChange('endDateChangeMode', opt.value)}
                      className={`text-left rounded-xl border px-3 py-2.5 sm:px-3.5 sm:py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${
                        active
                          ? 'bg-white border-primary-300 ring-1 ring-primary-200 shadow-sm'
                          : 'bg-white/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            active
                              ? 'bg-primary-50 text-primary-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block text-sm font-semibold leading-tight ${
                              active ? 'text-primary-800' : 'text-slate-800'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] font-light text-slate-500 leading-snug">
                            {opt.hint}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
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
    [
      clientOptions,
      projectTypeOptions,
      today,
      contractEndingDefault,
      isEditing,
      previousContractEnding,
      existingExtensionCount,
      leadOptions,
      projectManagerOptions
    ]
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
