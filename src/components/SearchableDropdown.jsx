import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown } from 'react-icons/fi';

const LAYOUT_WIDTH = {
  full: 'w-full min-w-0',
  filter: 'w-full min-w-0',
  sm: 'w-full min-w-0 xl:w-[7.5rem] xl:shrink-0',
  md: 'w-full min-w-0 xl:w-32 xl:shrink-0',
  lg: 'w-full min-w-0 xl:w-40 xl:shrink-0'
};

const MENU_Z = 10050;

const SearchableDropdown = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Type or select...',
  leftIcon = null,
  className = '',
  layout = 'full',
  onOpenChange = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  const setOpen = (open) => {
    setIsOpen(open);
    if (!open) setMenuStyle(null);
    onOpenChange?.(open);
  };

  const closeMenu = () => {
    setIsOpen(false);
    setSearchTerm('');
    setMenuStyle(null);
    onOpenChange?.(false);
  };

  const filteredOptions = useMemo(() => {
    if (searchTerm === '') return options;
    return options.filter((option) => option.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, options]);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 6;
      const maxH = 240;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;

      if (openUp) {
        setMenuStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + gap,
          left: rect.left,
          width: Math.max(rect.width, 160),
          maxHeight: Math.min(maxH, Math.max(120, spaceAbove - 8)),
          zIndex: MENU_Z
        });
      } else {
        setMenuStyle({
          position: 'fixed',
          top: rect.bottom + gap,
          left: rect.left,
          width: Math.max(rect.width, 160),
          maxHeight: Math.min(maxH, Math.max(120, spaceBelow - 8)),
          zIndex: MENU_Z
        });
      }
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [isOpen, filteredOptions.length]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      const t = event.target;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setIsOpen(false);
      setSearchTerm('');
      setMenuStyle(null);
      onOpenChange?.(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onOpenChange]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setOpen(true);
  };

  const handleInputFocus = () => {
    setOpen(true);
    setSearchTerm('');
  };

  const handleSelectOption = (option) => {
    onChange(option);
    closeMenu();
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange('');
    closeMenu();
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (
        !rootRef.current?.contains(document.activeElement) &&
        !menuRef.current?.contains(document.activeElement)
      ) {
        closeMenu();
      }
    }, 200);
  };

  const layoutClass = LAYOUT_WIDTH[layout] || LAYOUT_WIDTH.full;
  const isFilter = layout === 'filter';
  const showMenu = isOpen && filteredOptions.length > 0 && menuStyle;

  return (
    <div className={`flex flex-col relative ${layoutClass} ${className}`} ref={rootRef}>
      <label
        className={
          isFilter
            ? 'text-[11px] font-semibold mb-1.5 text-slate-500 uppercase tracking-[0.08em]'
            : 'text-sm font-semibold mb-2.5 text-slate-700 capitalize tracking-wide'
        }
      >
        {label}
      </label>
      <div className="relative" ref={triggerRef}>
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{leftIcon}</div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : value || ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className={`w-full border border-slate-200/90 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus-visible:ring-2 focus-visible:ring-primary-500/25 bg-white pr-10 shadow-[inset_0_1px_0_rgb(255_255_255/0.8)] ${
            isFilter ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'
          } ${leftIcon ? 'pl-10' : ''}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <FiChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {showMenu &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="overflow-auto rounded-xl border border-slate-200/90 bg-white py-1 shadow-elevated ring-1 ring-black/5"
            role="listbox"
          >
            {placeholder.includes('All') && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full text-left px-4 py-2.5 hover:bg-primary-50 hover:text-primary-800 focus:outline-none focus-visible:bg-primary-50 transition-colors border-b border-slate-100 font-semibold text-sm"
              >
                All
              </button>
            )}
            {filteredOptions.map((option, index) => (
              <button
                key={`${option}-${index}`}
                type="button"
                role="option"
                onClick={() => handleSelectOption(option)}
                className="w-full text-left px-4 py-2.5 hover:bg-primary-50 hover:text-primary-800 focus:outline-none focus-visible:bg-primary-50 transition-colors text-sm text-slate-700 border-b border-slate-50 last:border-b-0"
              >
                {option}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default SearchableDropdown;
