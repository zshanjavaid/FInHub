import { useEffect, useRef } from 'react';
import { FiUser, FiDollarSign, FiFileText, FiClock } from 'react-icons/fi';

const scrollNearestOverflow = (el, deltaY) => {
  let node = el.parentElement;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
      node.scrollTop += deltaY;
      return;
    }
    node = node.parentElement;
  }
};

const InputField = ({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  placeholder = "", 
  prefix = "",
  icon = null,
  className = "",
  disabled = false,
  error = false,
  errorMessage = '',
  required = false,
  name,
  autoComplete,
  id
}) => {
  const inputRef = useRef(null);
  const inputId = id || (name ? `field-${name}` : undefined);

  useEffect(() => {
    if (type !== 'number') return undefined;
    const el = inputRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      scrollNearestOverflow(el, e.deltaY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [type]);
  const getIcon = () => {
    if (icon) return icon;
    
    const labelLower = label?.toLowerCase() || '';
    
    if (labelLower.includes('budget') || labelLower.includes('tax') || labelLower.includes('amount') || labelLower.includes('hourly rate') || labelLower.includes('rate')) {
      return <FiDollarSign className="w-5 h-5 text-gray-400" />;
    }
    
    if (labelLower.includes('project')) {
      return <FiFileText className="w-5 h-5 text-gray-400" />;
    }

    if (labelLower.includes('recruit')) {
      return <FiUser className="w-5 h-5 text-gray-400" />;
    }
    
    if (labelLower.includes('hour')) {
      return <FiClock className="w-5 h-5 text-gray-400" />;
    }
    
    return null;
  };

  const iconElement = getIcon();
  const hasLeftContent = prefix || iconElement;

  return (
    <div className={`flex flex-col ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="text-sm font-light mb-2.5 text-gray-700 capitalize tracking-[0.12em]">
          {label}
          {required ? <span className="text-red-500 font-bold ml-0.5">*</span> : null}
        </label>
      ) : null}
      <div className="relative">
        {hasLeftContent && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {iconElement && <span className="flex items-center">{iconElement}</span>}
            {prefix && (
              <span className="text-gray-500 font-medium">
                {prefix}
              </span>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required || undefined}
          autoComplete={autoComplete}
          aria-invalid={error || undefined}
          aria-required={required || undefined}
          className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            error ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          } ${hasLeftContent ? "pl-10" : ""} ${disabled ? "bg-gray-50 cursor-not-allowed opacity-60" : ""}`}
        />
      </div>
      {errorMessage ? (
        <p className="mt-1.5 text-xs text-red-600 font-medium">{errorMessage}</p>
      ) : null}
    </div>
  );
};

export default InputField;
