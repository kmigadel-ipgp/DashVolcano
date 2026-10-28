import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  FlaskConical,
  GitCompare,
  Info,
  Map as MapIcon,
  Menu,
  Moon,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface NavLink {
  path: string;
  label: string;
  icon: LucideIcon;
}

const navLinks: NavLink[] = [
  { path: '/map', label: 'Map', icon: MapIcon },
  { path: '/compare-volcanoes', label: 'Compare Volcanoes', icon: GitCompare },
  { path: '/compare-vei', label: 'Compare VEI', icon: BarChart3 },
  { path: '/analyze', label: 'Analyze Volcano', icon: FlaskConical },
  { path: '/timeline', label: 'Timeline', icon: Clock },
  { path: '/about', label: 'About', icon: Info },
];

const FOOTER_TEXT = '© 2025 DashVolcano | Data sources: GEOROC, PetDB, GVP | Built with React + Deck.gl';

const Layout = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Close the mobile drawer with Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const themeLabel = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';
  const ThemeIcon = theme === 'light' ? Moon : Sun;

  const renderNav = (compact: boolean) => (
    <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto" aria-label="Main">
      {navLinks.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            onClick={() => setMobileMenuOpen(false)}
            title={compact ? label : undefined}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-200 ${
              compact ? 'justify-center' : ''
            } ${
              active
                ? 'bg-accent-soft text-accent-ink font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-gray-100'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const renderBrand = (compact: boolean) => (
    <div className={`flex items-center gap-2.5 ${compact ? 'justify-center' : ''}`}>
      <span className="text-2xl leading-none" aria-hidden="true">🌋</span>
      <h1 className={`text-lg font-bold tracking-tight text-ink ${compact ? 'sr-only' : ''}`}>
        Dash<span className="text-accent-ink">Volcano</span>
      </h1>
    </div>
  );

  const iconButtonClass =
    'p-2 rounded-md text-ink-muted hover:text-ink hover:bg-gray-100 transition-colors duration-200';

  return (
    <div className="flex h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 bg-surface border-r border-line transition-[width] duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
        // Pages measure their container on window resize (e.g. the map selection
        // overlay), so announce the new content width once the sidebar has moved.
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget) window.dispatchEvent(new Event('resize'));
        }}
      >
        <div className={`flex items-center h-14 border-b border-line ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
          {renderBrand(collapsed)}
        </div>

        {renderNav(collapsed)}

        <div className={`border-t border-line p-2 flex gap-1 ${collapsed ? 'flex-col items-center' : 'items-center'}`}>
          <button type="button" onClick={toggleTheme} className={iconButtonClass} aria-label={themeLabel} title={themeLabel}>
            <ThemeIcon className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={`${iconButtonClass} ${collapsed ? '' : 'ml-auto'}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronsRight className="w-5 h-5" aria-hidden="true" />
            ) : (
              <ChevronsLeft className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {!collapsed && (
          <footer className="px-4 pb-3 text-[11px] leading-relaxed text-ink-muted">
            <p>{FOOTER_TEXT}</p>
          </footer>
        )}
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between h-14 px-3 bg-surface border-b border-line shrink-0">
          {renderBrand(false)}
          <div className="flex items-center gap-1">
            <button type="button" onClick={toggleTheme} className={iconButtonClass} aria-label={themeLabel} title={themeLabel}>
              <ThemeIcon className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={iconButtonClass}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Main menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
          <div className="relative flex flex-col w-72 max-w-[85vw] h-full bg-surface shadow-2xl">
            <div className="flex items-center justify-between h-14 px-4 border-b border-line">
              {renderBrand(false)}
              <button type="button" onClick={() => setMobileMenuOpen(false)} className={iconButtonClass} aria-label="Close menu">
                <X className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>
            {renderNav(false)}
            <footer className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-ink-muted">
              <p>{FOOTER_TEXT}</p>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
