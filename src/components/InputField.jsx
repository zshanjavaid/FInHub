import { FiUser, FiDollarSign, FiFileText, FiClock } from 'react-icons/fi';

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
  error = false
}) => {
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
        <label className="text-sm font-light mb-2.5 text-gray-700 capitalize tracking-[0.12em]">
          {label}
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
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none bg-white ${
            error ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" : "border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          } ${hasLeftContent ? "pl-10" : ""} ${disabled ? "bg-gray-50 cursor-not-allowed opacity-60" : ""}`}
        />
      </div>
    </div>
  );
};

export default InputField;
