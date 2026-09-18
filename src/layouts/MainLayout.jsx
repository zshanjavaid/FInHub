import { useState, useEffect, useCallback } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { LuPanelLeft, LuPanelLeftClose } from 'react-icons/lu';
import Sidebar from '../components/Sidebar';
import Logo from '../components/Logo';

const DESKTOP_MEDIA = '(min-width: 1024px)';
const SIDEBAR_MOTION = 'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none';

const MainLayout = () => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MEDIA).matches
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MEDIA).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MEDIA);
    const sync = (matches) => {
      setIsDesktop(matches);
      setIsSidebarOpen(matches);
    };
    sync(mq.matches);
    const onChange = (e) => sync(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (isDesktop || !isSidebarOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isDesktop, isSidebarOpen]);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = () => setIsSidebarOpen((open) => !open);

  return (
    <div className="relative flex h-screen overflow-hidden bg-transparent">
      {!isDesktop && (
        <button
          type="button"
          className={`fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-[2px] lg:hidden transition-opacity duration-300 ease-out motion-reduce:transition-none ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Close menu"
          aria-hidden={!isSidebarOpen}
          tabIndex={isSidebarOpen ? 0 : -1}
          onClick={closeSidebar}
        />
      )}
      <Sidebar
        isOpen={isSidebarOpen}
        isDesktop={isDesktop}
        onClose={closeSidebar}
        motionClass={SIDEBAR_MOTION}
      />
      <div
        className={`relative z-10 flex flex-col flex-1 min-w-0 w-full h-full min-h-0 ${
          isDesktop && isSidebarOpen ? 'lg:ml-64' : ''
        }`}
      >
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
          <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-3">
            <Link
              to="/"
              className="lg:hidden min-w-0 shrink"
              onClick={() => !isDesktop && isSidebarOpen && closeSidebar()}
            >
              <Logo compact />
            </Link>

            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 rounded-xl hover:bg-slate-100/90 transition-colors duration-150 text-slate-500 hover:text-primary-700 shrink-0 ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? (
                <LuPanelLeftClose className="w-6 h-6" aria-hidden />
              ) : (
                <LuPanelLeft className="w-6 h-6" aria-hidden />
              )}
            </button>
          </div>
        </header>
        <main className="overflow-auto h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)] w-full min-h-0 min-w-0">
          <div className="w-full min-w-0 max-w-[1800px] mx-auto relative">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
