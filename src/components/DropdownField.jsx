import { FiChevronDown } from 'react-icons/fi';

const DropdownField = ({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select...",
  className = "",
  hideLabel = false,
  hidePlaceholder = false,
  disabled = false,
  required = false,
  error = false,
  errorMessage = ''
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && !hideLabel && (
        <label className="text-sm font-light mb-2.5 text-gray-700 capitalize tracking-[0.12em]">
          {label}
          {required ? <span className="text-red-500 font-bold ml-0.5">*</span> : null}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-required={required || undefined}
          className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none appearance-none bg-white pr-10 cursor-pointer text-slate-700 ${
            disabled ? "bg-gray-50 cursor-not-allowed opacity-60" : ""
          } ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
          }`}
        >
          {!hidePlaceholder && <option value="" className="text-gray-400">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <FiChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>
      {errorMessage ? (
        <p className="mt-1.5 text-xs text-red-600 font-medium">{errorMessage}</p>
      ) : null}
    </div>
  );
};

export default DropdownField;
