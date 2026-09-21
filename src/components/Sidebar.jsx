import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiFileText, FiRepeat, FiTrendingDown, FiDollarSign, FiInbox, FiLayout, FiLogOut, FiPercent } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { isApproved } from '../constants/app';
import {
  sidebarShellClass,
  sidebarSectionBorderClass,
  sidebarNavLinkBase,
  sidebarNavLinkActive,
  sidebarNavLinkInactive,
  sidebarBadgeClass,
  sidebarLogoutClass
} from '../constants/sidebarTheme';

const Sidebar = ({ isOpen = true, isDesktop = true, onClose, motionClass = '' }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const transactions = useSelector((state) => state.transactions.items);
  const expenses = useSelector((state) => state.expenses.items);
  const projects = useSelector((state) => state.projects.items);
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false });

  const pendingCount = useMemo(
    () =>
      [transactions, expenses, projects].reduce(
        (sum, list) => sum + (list || []).filter((item) => !isApproved(item)).length,
        0
      ),
    [transactions, expenses, projects]
  );

  const expenseTypeParam = useMemo(() => {
    if (location.pathname !== '/expenses') return '';
    return new URLSearchParams(location.search).get('type') || '';
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isDesktop) onClose?.();
  }, [location.pathname, location.search, isDesktop, onClose]);

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: FiHome, motion: 'home' },
    { path: '/projects', label: 'Projects', icon: FiFileText, motion: 'projects' },
    { path: '/transactions', label: 'Transactions', icon: FiRepeat, motion: 'transactions' },
    { path: '/expenses', label: 'Expenses', icon: FiTrendingDown, match: 'expenses-all', motion: 'expenses' },
    { path: '/expenses?type=brokerage', label: 'Brokerage', icon: FiPercent, match: 'expenses-brokerage', motion: 'brokerage' },
    { path: '/pending', label: 'Pending', icon: FiInbox, badge: pendingCount, motion: 'pending' },
    { path: '/impact-fund', label: 'Impact Fund', icon: FiDollarSign, motion: 'fund' },
    { path: '/allocation', label: 'Allocation', icon: FiLayout, motion: 'allocation' }
  ];

  const isItemActive = (item) => {
    if (item.match === 'expenses-brokerage') {
      return location.pathname === '/expenses' && expenseTypeParam === 'brokerage';
    }
    if (item.match === 'expenses-all') {
      return location.pathname === '/expenses' && expenseTypeParam !== 'brokerage';
    }
    return location.pathname === item.path;
  };

  const activeKey = useMemo(() => {
    const active = menuItems.find((item) => isItemActive(item));
    return active?.path || location.pathname;
    // menuItems is stable enough for nav; expenseTypeParam drives updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, expenseTypeParam, pendingCount]);

  useLayoutEffect(() => {
    const el = itemRefs.current[activeKey];
    const nav = navRef.current;
    if (!el || !nav) return undefined;

    const update = () => {
      setIndicator({
        top: el.offsetTop,
        height: el.offsetHeight,
        ready: true
      });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [activeKey, pendingCount]);

  const asideClass = `fixed left-0 top-0 z-50 h-full w-64 max-w-[85vw] ${motionClass} ${
    isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
  }`;

  return (
    <aside className={asideClass} aria-hidden={!isOpen}>
      <div className={`${sidebarShellClass} h-full [transform:translateZ(0)]`}>
        <div className={`px-5 pt-5 pb-4 sm:px-5 sm:pt-6 sm:pb-5 border-b ${sidebarSectionBorderClass} shrink-0`}>
          <Link
            to="/"
            className="flex items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40"
            onClick={() => !isDesktop && onClose?.()}
          >
            <Logo variant="light" />
          </Link>
        </div>

        <nav ref={navRef} className="relative flex-1 px-3 py-4 sm:px-3.5 sm:py-5 space-y-1 overflow-y-auto" aria-label="Main">
          <div
            className="finhub-nav-indicator pointer-events-none absolute left-3 right-3 sm:left-3.5 sm:right-3.5 rounded-xl bg-gradient-to-r from-primary-500/30 to-primary-500/10 shadow-[inset_3px_0_0_0_#2dd4bf]"
            style={{
              top: indicator.top,
              height: indicator.height,
              opacity: indicator.ready ? 1 : 0
            }}
            aria-hidden
          />

          {menuItems.map((item) => {
            const isActive = isItemActive(item);
            const count = item.badge ?? 0;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                ref={(node) => {
                  if (node) itemRefs.current[item.path] = node;
                }}
                to={item.path}
                onClick={() => !isDesktop && onClose?.()}
                className={`${sidebarNavLinkBase} ${isActive ? sidebarNavLinkActive : sidebarNavLinkInactive}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 overflow-visible rounded-lg shrink-0 transition-[background-color,color,box-shadow] duration-200 ease-out ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/40'
                      : 'bg-white/5 text-teal-100/55 group-hover:bg-white/10 group-hover:text-teal-50'
                  }`}
                >
                  <Icon className={`fh-icon-live fh-icon-live--${item.motion} w-[1.05rem] h-[1.05rem]`} aria-hidden />
                </span>
                <span className="flex-1 truncate tracking-tight">{item.label}</span>
                {count > 0 && <span className={sidebarBadgeClass}>{count}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`px-3 py-3 sm:px-3.5 sm:py-4 border-t ${sidebarSectionBorderClass} shrink-0`}>
          <button type="button" onClick={logout} aria-label="Sign out" className={sidebarLogoutClass}>
            <span className="flex items-center justify-center w-8 h-8 overflow-visible rounded-lg shrink-0 bg-white/5 text-teal-100/55">
              <FiLogOut className="fh-icon-live fh-icon-live--logout w-[1.05rem] h-[1.05rem]" aria-hidden />
            </span>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default memo(Sidebar);
