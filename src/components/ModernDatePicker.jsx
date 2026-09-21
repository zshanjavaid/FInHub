import { forwardRef, useId, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { format, isValid, parseISO } from 'date-fns';

const PickerInput = forwardRef(function PickerInput(
  { value, onClick, onChange, placeholder, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      type="text"
      readOnly
      value={value || ''}
      onClick={onClick}
      onChange={onChange}
      placeholder={placeholder}
      className={`finhub-datepicker-input ${className || ''}`.trim()}
      {...rest}
    />
  );
});

const parseDayValue = (value) => {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = parseISO(v.slice(0, 10));
    return isValid(d) ? d : null;
  }
  return null;
};

const parseMonthValue = (value) => {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return null;
  const ym = /^\d{4}-\d{2}$/.test(v) ? v : /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 7) : '';
  if (!ym) return null;
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return null;
  const d = new Date(y, m - 1, 1);
  return isValid(d) ? d : null;
};

/**
 * WageWise-style react-datepicker, FinHub theme + existing API
 * (label, value YYYY-MM-DD | YYYY-MM, onChange string, granularity day|month).
 */
const ModernDatePicker = ({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  className = '',
  granularity = 'day',
  minDate,
  maxDate,
  popperPlacement = 'bottom-start',
  popperClassName
}) => {
  const inputId = useId();
  const isMonth = granularity === 'month';

  const selected = useMemo(
    () => (isMonth ? parseMonthValue(value) : parseDayValue(value)),
    [value, isMonth]
  );

  const resolvedPlaceholder =
    isMonth && placeholder === 'YYYY-MM-DD' ? 'Select month' : placeholder === 'YYYY-MM-DD' ? 'Select date' : placeholder;

  const handleChange = (date) => {
    if (!date) {
      onChange?.('');
      return;
    }
    onChange?.(isMonth ? format(date, 'yyyy-MM') : format(date, 'yyyy-MM-dd'));
  };

  return (
    <div className={`flex flex-col min-w-0 ${className}`}>
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-light mb-2.5 text-slate-700 capitalize tracking-[0.12em]"
        >
          {label}
        </label>
      ) : null}
      <DatePicker
        id={inputId}
        selected={selected}
        onChange={handleChange}
        dateFormat={isMonth ? 'MMMM yyyy' : 'MMM d, yyyy'}
        showMonthYearPicker={isMonth}
        showMonthDropdown={!isMonth}
        showYearDropdown={!isMonth}
        dropdownMode="select"
        yearDropdownItemNumber={80}
        scrollableYearDropdown={!isMonth}
        minDate={minDate}
        maxDate={maxDate}
        placeholderText={resolvedPlaceholder}
        popperPlacement={popperPlacement}
        popperClassName={popperClassName || 'react-datepicker-popper-elevated'}
        popperProps={{ strategy: 'fixed' }}
        customInput={<PickerInput />}
      />
    </div>
  );
};

export default ModernDatePicker;
