import { FiEye, FiEyeOff } from 'react-icons/fi';
import { usePrivacy } from '../contexts/PrivacyContext';
import { Press } from '../motion';

const PrivacyToggleButton = ({ className = '' }) => {
  const { isHidden, toggle } = usePrivacy();

  return (
    <Press
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 px-2.5 py-2 rounded-xl text-[13px] font-light tracking-tight transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${
        isHidden
          ? 'text-slate-500 hover:bg-slate-100/90 hover:text-primary-700'
          : 'bg-primary-50 text-primary-700 hover:bg-primary-100/80'
      } ${className}`}
      aria-pressed={!isHidden}
      aria-label={isHidden ? 'Show balances' : 'Hide balances'}
      title={isHidden ? 'Show balances (auto-hides in 5 min)' : 'Hide balances'}
    >
      {isHidden ? (
        <FiEyeOff className="w-5 h-5 shrink-0" aria-hidden />
      ) : (
        <FiEye className="w-5 h-5 shrink-0" aria-hidden />
      )}
      <span className="hidden sm:inline">{isHidden ? 'Show' : 'Hide'}</span>
    </Press>
  );
};

export default PrivacyToggleButton;
