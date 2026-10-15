import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown } from 'react-icons/fi';
import Checkbox from './Checkbox';
import { normText } from '../utils/number';
import { toggleSelectedValue } from '../utils/multiSelectFilter';

const MENU_Z = 10050;

const normalizeOptions = (options = []) =>
  (options || []).map((opt) => {
    if (opt && typeof opt === 'object') {
      const value = String(opt.value ?? '').trim();
      const label = String(opt.label ?? opt.value ?? '').trim();
      return { value, label };
    }
    const s = String(opt ?? '').trim();
    return { value: s, label: s };
  }).filter((o) => o.value);

/**
 * Searchable multi-select for FilterBar.
 * `value` is string[] of selected option values.
 * `options` may be string[] or { value, label }[].
 */
const MultiSelectFilter = ({
  label = '',
  value = [],
  onChange,
  options = [],
  placeholder = 'Select…',
  className = '',
  normalize = normText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);

  const selectedSet = useMemo(
    () => new Set(selected.map((v) => normalize(v)).filter(Boolean)),
    [selected, normalize]
  );

  const filteredOptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return normalizedOptions;
    return normalizedOptions.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchTerm]);

  const summary = useMemo(() => {
    if (!selected.length) return '';
    if (selected.length === 1) {
      const hit = normalizedOptions.find((o) => normalize(o.value) === normalize(selected[0]));
      return hit?.label || selected[0];
    }
    return `${selected.length} selected`;
  }, [selected, normalizedOptions, normalize]);

  const setOpen = (open) => {
    setIsOpen(open);
    if (!open) {
      setMenuStyle(null);
      setSearchTerm('');
    }
  };

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 6;
      const maxH = 260;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      if (openUp) {
        setMenuStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + gap,
          left: rect.left,
          width: Math.max(rect.width, 200),
          maxHeight: Math.min(maxH, Math.max(120, spaceAbove - 8)),
          zIndex: MENU_Z
        });
      } else {
        setMenuStyle({
          position: 'fixed',
          top: rect.bottom + gap,
          left: rect.left,
          width: Math.max(rect.width, 200),
          maxHeight: Math.min(maxH, Math.max(120, spaceBelow - 8)),
          zIndex: MENU_Z
        });
      }
    };
    place();
    let raf = 0;
    const onScrollOrResize = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        place();
      });
    };
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [isOpen, filteredOptions.length]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (event) => {
      const t = event.target;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggle = (optionValue) => {
    onChange?.(toggleSelectedValue(selected, optionValue, { normalize }));
  };

  const showMenu = isOpen && menuStyle;

  return (
    <div className={`flex flex-col relative w-full min-w-0 ${className}`} ref={rootRef}>
      {label ? (
        <label className="text-[11px] font-light mb-1.5 text-slate-500 uppercase tracking-[0.16em]">
          {label}
        </label>
      ) : null}
      <div className="relative" ref={triggerRef}>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : summary}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearchTerm('');
          }}
          placeholder={placeholder}
          className="w-full h-10 min-w-0 px-3 py-2 pr-10 text-sm text-slate-800 border border-slate-200/90 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-0 bg-white shadow-[inset_0_1px_0_rgb(255_255_255/0.8)]"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <FiChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {showMenu
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className="overflow-auto rounded-xl border border-slate-200/90 bg-white py-1 shadow-elevated ring-1 ring-black/5"
              role="listbox"
              aria-multiselectable="true"
            >
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-slate-500">No matches</p>
              ) : (
                filteredOptions.map((opt) => {
                  const checked = selectedSet.has(normalize(opt.value));
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => toggle(opt.value)}
                      className="w-full flex items-center gap-2.5 text-left px-3 py-2 hover:bg-primary-50 focus:outline-none focus-visible:bg-primary-50 transition-colors text-sm text-slate-700 border-b border-slate-50 last:border-b-0"
                    >
                      <span className="pointer-events-none">
                        <Checkbox
                          size="sm"
                          checked={checked}
                          onChange={() => {}}
                          aria-label={opt.label}
                        />
                      </span>
                      <span className="min-w-0 truncate font-medium">{opt.label}</span>
                    </button>
                  );
                })
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default MultiSelectFilter;
