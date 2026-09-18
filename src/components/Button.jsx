const Button = ({
  children,
  onClick,
  size = 'md',
  type = 'button',
  disabled = false,
  className = '',
  fullWidth = false,
  variant = 'primary',
  loading = false
}) => {
  const baseStyles =
    'finhub-btn relative overflow-hidden font-semibold rounded-lg outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ring-0 shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none inline-flex items-center justify-center gap-2';

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const busy = disabled || loading;

  const variantStyles =
    variant === 'danger'
      ? 'finhub-btn-danger'
      : variant === 'secondary'
        ? 'finhub-btn-secondary'
        : 'finhub-btn-primary';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy}
      aria-busy={loading || undefined}
      className={`${baseStyles} ${sizes[size]} ${widthClass} ${variantStyles} ${className}`}
    >
      <span className="finhub-btn-fill" aria-hidden />
      <span className="finhub-btn-label relative z-10 inline-flex items-center justify-center gap-2">
        {loading ? (
          <>
            <span className="finhub-btn-spinner" aria-hidden />
            <span>{typeof children === 'string' ? children : 'Working…'}</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
};

export default Button;
