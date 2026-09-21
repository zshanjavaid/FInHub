import { FiMessageSquare } from 'react-icons/fi';

const TextareaField = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "", 
  icon = null,
  className = "",
  disabled = false,
  rows = 4
}) => {
  const iconElement = icon || <FiMessageSquare className="w-5 h-5 text-gray-400" />;
  const hasLeftContent = iconElement;

  return (
    <div className={`flex flex-col ${className}`}>
      <label className="text-sm font-light mb-2.5 text-gray-700 capitalize tracking-[0.12em]">
        {label}
      </label>
      <div className="relative">
        {hasLeftContent && (
          <div className="absolute left-3 top-4 flex items-start">
            <span className="flex items-center">{iconElement}</span>
          </div>
        )}
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 bg-white resize-y ${
            hasLeftContent ? "pl-10" : ""
          } ${disabled ? "bg-gray-50 cursor-not-allowed opacity-60" : ""}`}
        />
      </div>
    </div>
  );
};

export default TextareaField;
