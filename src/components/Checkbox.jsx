import { useId } from 'react';

/**
 * Theme checkbox — solid primary teal, short check animation.
 * onChange receives a native change event (e.target.checked).
 */
const Checkbox = ({
  checked = false,
  onChange,
  disabled = false,
  label = null,
  id,
  name,
  className = '',
  boxClassName = '',
  size = 'md',
  'aria-label': ariaLabel
}) => {
  const autoId = useId();
  const inputId = id || autoId;
  const sizes = {
    sm: { box: 'w-4 h-4', gap: 'gap-1.5', text: 'text-xs' },
    md: { box: 'w-[1.125rem] h-[1.125rem]', gap: 'gap-2', text: 'text-sm' }
  };
  const s = sizes[size] || sizes.md;

  const control = (
    <span className={`finhub-checkbox ${s.box} ${boxClassName}`.trim()}>
      <input
        id={inputId}
        name={name}
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
        className="finhub-checkbox-input"
      />
      <span className="finhub-checkbox-face" aria-hidden>
        <svg className="finhub-checkbox-tick" viewBox="0 0 16 16" fill="none">
          <path
            d="M3.5 8.25L6.75 11.25L12.5 4.75"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );

  if (label == null || label === false) {
    return <span className={`inline-flex items-center ${className}`.trim()}>{control}</span>;
  }

  return (
    <label
      htmlFor={inputId}
      className={`inline-flex items-center ${s.gap} cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`.trim()}
    >
      {control}
      {typeof label === 'string' || typeof label === 'number' ? (
        <span className={`${s.text} font-medium text-slate-700`}>{label}</span>
      ) : (
        label
      )}
    </label>
  );
};

export default Checkbox;
