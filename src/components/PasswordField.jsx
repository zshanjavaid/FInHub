import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const PasswordField = ({
  label,
  value,
  onChange,
  placeholder = 'Enter password',
  leftIcon = null,
  className = ''
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`flex flex-col ${className}`}>
      <label className="text-sm font-light mb-2.5 text-gray-700 capitalize tracking-[0.12em]">
        {label}
      </label>
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 bg-white pr-12 ${leftIcon ? 'pl-10' : 'pl-4'}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <FiEyeOff className="w-5 h-5" />
          ) : (
            <FiEye className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default PasswordField;
