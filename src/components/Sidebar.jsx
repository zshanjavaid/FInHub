import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiFileText,
  FiRepeat,
  FiTrendingDown,
  FiDollarSign,
  FiInbox,
  FiLayout,
  FiLogOut,
  FiPercent,
  FiChevronDown
} from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { selectPendingCount } from '../store/selectors';
import {
  sidebarShellClass,
  sidebarSectionBorderClass,
  sidebarNavLinkBase,
  sidebarNavLinkActive,
  sidebarNavLinkInactive,
  sidebarBadgeClass,
  sidebarLogoutClass,
  sidebarSubmenuCollapseClass,
  sidebarSubmenuCollapseOpenClass,
  sidebarSubmenuCollapseClosedClass,
  sidebarSubmenuListClass,
  sidebarSubmenuLinkBase,
  sidebarSubmenuLinkActive,
  sidebarSubmenuLinkInactive
} from '../constants/sidebarTheme';

const DASHBOARD_CHILD_PATHS = ['/', '/evaluation', '/insights'];
const DASHBOARD_KEY = '__dashboard__';
const SUBMENU_ANIM_MS = 320;

const Sidebar = ({ isOpen = true, isDesktop = true, onClose, motionClass = '' }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const pendingCount = useSelector(selectPendingCount);
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false, snap: true });
  const dashboardActive = DASHBOARD_CHILD_PATHS.includes(location.pathname);
  const [dashboardOpen, setDashboardOpen] = useState(dashboardActive);
  const [submenuMotion, setSubmenuMotion] = useState(true);
  const wasDashboardActive = useRef(dashboardActive);
  const prevActiveKey = useRef('');

  const expenseTypeParam = useMemo(() => {
    if (location.pathname !== '/expenses') return '';
    return new URLSearchParams(location.search).get('type') || '';
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isDesktop) onClose?.();
  }, [location.pathname, location.search, isDesktop, onClose]);

  useEffect(() => {
    const leavingDashboard = wasDashboardActive.current && !dashboardActive;
    const enteringDashboard = !wasDashboardActive.current && dashboardActive;
    wasDashboardActive.current = dashboardActive;

    if (leavingDashboard || enteringDashboard) {
      // Snap open/close on route change so main nav doesn't jump mid-animation.
      setSubmenuMotion(false);
      setDashboardOpen(dashboardActive);
      const id = window.setTimeout(() => setSubmenuMotion(true), 40);
      return () => window.clearTimeout(id);
    }

    if (dashboardActive) setDashboardOpen(true);
    return undefined;
  }, [dashboardActive]);

  const dashboardChildren = [
    { path: '/', label: 'Overview' },
    { path: '/insights', label: 'Insights' },
    { path: '/evaluation', label: 'Evaluation' }
  ];

  const menuItems = [
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
    if (dashboardActive) return DASHBOARD_KEY;
    const active = menuItems.find((item) => isItemActive(item));
    return active?.path || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, expenseTypeParam, pendingCount, dashboardActive]);

  useEffect(() => {
    if (!activeKey) {
      setIndicator((prev) => ({ ...prev, ready: false }));
      prevActiveKey.current = '';
      return undefined;
    }

    const keyChanged = prevActiveKey.current !== activeKey;
    prevActiveKey.current = activeKey;

    let raf = 0;
    let timeoutId = 0;
    const followMs = submenuMotion ? SUBMENU_ANIM_MS : 0;
    // Snap on route change or when submenu jumps; track live while it animates.
    const shouldSnap = keyChanged || !submenuMotion;

    const measure = (snap = false) => {
      const el = itemRefs.current[activeKey];
      const nav = navRef.current;
      if (!el || !nav) {
        setIndicator((prev) => ({ ...prev, ready: false }));
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicator({
        top: elRect.top - navRect.top + nav.scrollTop,
        height: elRect.height,
        ready: true,
        snap
      });
    };

    measure(shouldSnap);

    if (followMs > 0) {
      const endAt = performance.now() + followMs;
      const tick = (now) => {
        measure(true); // follow layout without CSS tween fighting the grid animation
        if (now < endAt) {
          raf = requestAnimationFrame(tick);
        } else {
          measure(false);
        }
      };
      raf = requestAnimationFrame(tick);
    } else {
      // Layout may still settle after a snap close/open.
      timeoutId = window.setTimeout(() => measure(false), 0);
    }

    const onResizeOrScroll = () => measure(true);
    window.addEventListener('resize', onResizeOrScroll);
    const nav = navRef.current;
    nav?.addEventListener('scroll', onResizeOrScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', onResizeOrScroll);
      nav?.removeEventListener('scroll', onResizeOrScroll);
    };
  }, [activeKey, pendingCount, dashboardOpen, submenuMotion]);

  const asideClass = `fixed left-0 top-0 z-50 h-full w-64 max-w-[85vw] ${motionClass} ${
    isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
  }`;

  const renderTopLink = (item) => {
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
  };

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
          {indicator.ready ? (
            <div
              className={`finhub-nav-indicator pointer-events-none absolute left-3 right-3 sm:left-3.5 sm:right-3.5 rounded-xl bg-gradient-to-r from-primary-500/30 to-primary-500/10 shadow-[inset_3px_0_0_0_#2dd4bf]${
                indicator.snap ? ' finhub-nav-indicator--snap' : ''
              }`}
              style={{
                transform: `translate3d(0, ${indicator.top}px, 0)`,
                height: indicator.height
              }}
              aria-hidden
            />
          ) : null}

          <div className="mb-1">
            <button
              type="button"
              ref={(node) => {
                if (node) itemRefs.current[DASHBOARD_KEY] = node;
              }}
              onClick={() => setDashboardOpen((open) => !open)}
              className={`${sidebarNavLinkBase} w-full ${
                dashboardActive ? sidebarNavLinkActive : sidebarNavLinkInactive
              }`}
              aria-expanded={dashboardOpen}
            >
              <span
                className={`flex items-center justify-center w-8 h-8 overflow-visible rounded-lg shrink-0 transition-[background-color,color,box-shadow] duration-200 ease-out ${
                  dashboardActive
                    ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/40'
                    : 'bg-white/5 text-teal-100/55 group-hover:bg-white/10 group-hover:text-teal-50'
                }`}
              >
                <FiHome className="fh-icon-live fh-icon-live--home w-[1.05rem] h-[1.05rem]" aria-hidden />
              </span>
              <span className="flex-1 truncate tracking-tight text-left">Dashboard</span>
              <FiChevronDown
                className={`w-4 h-4 shrink-0 opacity-70 transition-transform ${
                  submenuMotion ? 'duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]' : 'duration-0'
                } ${dashboardOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>

            <div
              className={`${sidebarSubmenuCollapseClass} ${
                submenuMotion ? '' : 'duration-0'
              } ${dashboardOpen ? sidebarSubmenuCollapseOpenClass : sidebarSubmenuCollapseClosedClass}`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className={sidebarSubmenuListClass}>
                  {dashboardChildren.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => !isDesktop && onClose?.()}
                        className={`${sidebarSubmenuLinkBase} ${
                          isActive ? sidebarSubmenuLinkActive : sidebarSubmenuLinkInactive
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                        tabIndex={dashboardOpen ? undefined : -1}
                      >
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {menuItems.map((item) => renderTopLink(item))}
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
