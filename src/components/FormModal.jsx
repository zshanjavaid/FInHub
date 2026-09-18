import { useState, useEffect } from 'react';
import Modal from './Modal';
import SearchableDropdown from './SearchableDropdown';
import InputField from './InputField';
import TextareaField from './TextareaField';
import DropdownField from './DropdownField';
import ModernDatePicker from './ModernDatePicker';
import Button from './Button';

const resolveMaybeFn = (value, form) => (typeof value === 'function' ? value(form) : value);

const FormModal = ({
  isOpen,
  onClose,
  title,
  fields = [],
  initialValues = {},
  onSubmit,
  isSaving = false,
  onFieldChange: customFieldChange = null,
  autoFillLogic = null,
  columnsPerRow = 2,
  panelClassName: panelClassNameOverride = null
}) => {
  const defaultForm = fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue || '';
    return acc;
  }, {});

  const normalizedInitialValues = {
    ...defaultForm,
    ...initialValues
  };

  const [form, setForm] = useState(normalizedInitialValues);

  useEffect(() => {
    if (isOpen) {
      setForm(normalizedInitialValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onFieldChange = (fieldName, value) => {
    setForm((prev) => {
      let updated = { ...prev, [fieldName]: value };

      if (customFieldChange) {
        updated = customFieldChange(updated, fieldName, value) || updated;
      }

      if (autoFillLogic && autoFillLogic.triggerField === fieldName && value) {
        const autoFillData = autoFillLogic.getAutoFillData(value);
        if (autoFillData) {
          autoFillLogic.fieldsToFill.forEach(field => {
            if (autoFillData[field]) {
              updated[field] = autoFillData[field];
            }
          });
        }
      }

      return updated;
    });
  };

  const handleSave = async () => {
    await onSubmit?.(form);
  };

  const renderField = (field) => {
    const resolvedPlaceholder = resolveMaybeFn(field.placeholder, form);
    const resolvedOptions = resolveMaybeFn(field.options, form) || [];

    const commonProps = {
      label: field.label,
      value: form[field.name] || '',
      onChange: (value) => onFieldChange(field.name, typeof value === 'object' && value.target ? value.target.value : value),
      placeholder: resolvedPlaceholder,
      className: field.className
    };

    switch (field.type) {
      case 'summary':
        return (
          <div className={field.className || ''}>
            {field.label && (
              <div className="text-sm font-semibold mb-2.5 text-slate-700 capitalize tracking-wide">
                {field.label}
              </div>
            )}
            {field.render ? field.render(form) : null}
          </div>
        );

      case 'searchable-dropdown':
        return (
          <SearchableDropdown
            {...commonProps}
            options={resolvedOptions}
            leftIcon={field.icon}
          />
        );

      case 'dropdown':
        return (
          <DropdownField
            {...commonProps}
            options={resolvedOptions}
            hidePlaceholder={field.hidePlaceholder}
          />
        );

      case 'date':
        return (
          <ModernDatePicker
            {...commonProps}
            onChange={(val) => onFieldChange(field.name, val)}
          />
        );

      case 'display':
        return (
          <InputField
            {...commonProps}
            type={field.inputType || 'text'}
            icon={field.icon}
            disabled={true}
          />
        );

      case 'number':
        return (
          <InputField
            {...commonProps}
            type="number"
            icon={field.icon}
            disabled={field.disabled}
          />
        );

      case 'textarea':
        return (
          <TextareaField
            {...commonProps}
            icon={field.icon}
            disabled={field.disabled}
            rows={field.rows || 4}
          />
        );

      case 'checkbox':
        return (
          <div className={field.className || ''}>
            <label className="flex items-center gap-2 cursor-pointer mt-5">
              <input
                type="checkbox"
                checked={!!form[field.name]}
                onChange={(e) => onFieldChange(field.name, e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-semibold text-slate-700">{field.label}</span>
            </label>
          </div>
        );

      case 'text':
      default:
        return (
          <InputField
            {...commonProps}
            type={field.inputType || 'text'}
            icon={field.icon}
            disabled={field.disabled}
          />
        );
    }
  };

  const groupFieldsIntoRows = () => {
    const rows = [];
    let currentRow = [];
    const visibleFields = fields.filter(
      (field) => typeof field.showWhen !== 'function' || field.showWhen(form)
    );

    const maxPerRow = columnsPerRow;

    for (let index = 0; index < visibleFields.length; index++) {
      const field = visibleFields[index];
      if (field.type === 'section') {
        if (currentRow.length > 0) {
          rows.push({ type: 'row', fields: currentRow });
          currentRow = [];
        }
        rows.push({ type: 'section', field });
      } else if (field.type === 'radio-group') {
        if (currentRow.length > 0) {
          rows.push({ type: 'row', fields: currentRow });
          currentRow = [];
        }
        const next = visibleFields[index + 1];
        if (field.twinRow && next?.type === 'radio-group') {
          rows.push({ type: 'radio-group-row', fields: [field, next] });
          index += 1;
        } else {
          rows.push({ type: 'radio-group', field });
          if (field.inlineInput && field.inputField) {
            const inputField = {
              type: 'number',
              name: field.inputField.name,
              label: field.dynamicLabel ? field.dynamicLabel(form) : field.label,
              placeholder: field.inputField.placeholder ? field.inputField.placeholder(form) : '',
              icon: field.inputField.icon ? field.inputField.icon(form) : null,
              disabled: field.inputField.disabled
            };
            currentRow.push(inputField);
          }
        }
      } else {
        currentRow.push(field);
        const isFullWidth = typeof field.fullWidth === 'function' ? field.fullWidth(form) : !!field.fullWidth;
        if (currentRow.length === maxPerRow || isFullWidth || index === visibleFields.length - 1) {
          rows.push({ type: 'row', fields: currentRow });
          currentRow = [];
        }
      }
    }

    if (currentRow.length > 0) {
      rows.push({ type: 'row', fields: currentRow });
    }

    return rows;
  };

  const renderRadioGroupInner = (field) => (
    <div className="space-y-4 min-w-0">
      <label className="text-sm font-semibold text-slate-700 capitalize tracking-wide block">
        {field.dynamicLabel ? field.dynamicLabel(form) : field.label}
      </label>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {resolveMaybeFn(field.options, form).map((option) => (
          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={field.name}
              value={option.value}
              checked={form[field.name] === option.value}
              onChange={(e) => onFieldChange(field.name, e.target.value)}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">{option.label}</span>
          </label>
        ))}
      </div>
      {field.inputField && !field.inlineInput && (
        <InputField
          label=""
          type={field.inputField.type || 'number'}
          value={form[field.inputField.name] || ''}
          onChange={(e) => onFieldChange(field.inputField.name, e.target.value)}
          placeholder={field.inputField.placeholder ? field.inputField.placeholder(form) : ''}
          icon={field.inputField.icon ? field.inputField.icon(form) : null}
          disabled={field.inputField.disabled}
        />
      )}
    </div>
  );

  const renderRadioGroup = (field) => (
    <div className="pt-4 border-t border-slate-200">{renderRadioGroupInner(field)}</div>
  );

  const rows = groupFieldsIntoRows();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setForm(normalizedInitialValues);
        onClose();
      }}
      title={title}
      panelClassName={
        panelClassNameOverride || (columnsPerRow >= 3 ? 'max-w-4xl' : 'max-w-2xl')
      }
    >
      <div className="space-y-4 sm:space-y-6 min-w-0">
        {rows.map((row, rowIndex) => {
          if (row.type === 'section') {
            return (
              <div key={`section-${rowIndex}`} className="space-y-4 pt-4 border-t border-slate-200">
                {row.field.title && (
                  <h3 className="text-lg font-semibold text-slate-800">{row.field.title}</h3>
                )}
                {row.field.fields && row.field.fields.map((field, idx) => (
                  <div key={field.name || idx} className={field.fullWidth ? '' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
                    {field.fullWidth ? renderField(field) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[field].map(f => (
                          <div key={f.name} className={f.colSpan === 2 ? 'md:col-span-2' : ''}>
                            {renderField(f)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          }

          if (row.type === 'radio-group-row') {
            return (
              <div key={`radio-row-${rowIndex}`} className="pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                  {row.fields.map((f, i) => (
                    <div
                      key={f.name}
                      className={`min-w-0 ${i > 0 ? 'md:border-l md:border-slate-200 md:pl-6' : ''}`}
                    >
                      {renderRadioGroupInner(f)}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          if (row.type === 'radio-group') {
            return <div key={`radio-${rowIndex}`}>{renderRadioGroup(row.field)}</div>;
          }

          const colSpans = row.fields.map((f) => (typeof f.colSpan === 'function' ? f.colSpan(form) : (f.colSpan ?? 1)));
          const use8020 = columnsPerRow === 2 && row.fields.length === 2 && colSpans[0] === 4 && colSpans[1] === 1;
          const gridClass =
            columnsPerRow >= 3
              ? 'grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-start'
              : use8020
                ? 'grid grid-cols-1 md:grid-cols-[4fr_1fr] gap-6 items-center'
                : 'grid grid-cols-1 md:grid-cols-2 gap-6 items-center';
          return (
            <div key={`row-${rowIndex}`} className={gridClass}>
              {row.fields.map((field) => {
                let spanClass = '';
                if (columnsPerRow >= 3) {
                  const fw = typeof field.fullWidth === 'function' ? field.fullWidth(form) : !!field.fullWidth;
                  if (field.colSpan === 3 || fw) spanClass = 'md:col-span-3';
                  else if (field.colSpan === 2) spanClass = 'md:col-span-2';
                } else {
                  const isFullWidth = field.colSpan === 2 || (typeof field.fullWidth === 'function' ? field.fullWidth(form) : !!field.fullWidth);
                  spanClass = isFullWidth ? 'md:col-span-2' : '';
                }
                return (
                  <div key={field.name} className={spanClass}>
                    {renderField(field)}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200">
          <Button
            variant="secondary"
            onClick={() => {
              setForm(normalizedInitialValues);
              onClose();
            }}
            className="w-full sm:flex-1"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="w-full sm:flex-1" disabled={isSaving} loading={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FormModal;
