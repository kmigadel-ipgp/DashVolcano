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
import { useEffect, useRef, useState } from 'react';
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
  // Collapsed by default on tablets to leave room for the map
  const [collapsed, setCollapsed] = useState(() => !window.matchMedia('(min-width: 1024px)').matches);
  const { theme, toggleTheme } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Mobile drawer: Escape closes it, Tab stays inside it, and focus returns
  // to the menu button when it closes
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const menuButton = menuButtonRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      menuButton?.focus();
    };
  }, [mobileMenuOpen]);

  // Escape hides chart hover labels (WCAG 1.4.13); Plotly redraws them on the next pointer move
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.js-plotly-plot .hoverlayer').forEach((layer) => layer.replaceChildren());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Each page has its own browser-tab title (WCAG 2.4.2)
  useEffect(() => {
    const page = navLinks.find(({ path }) => path === location.pathname);
    document.title = page ? `${page.label} · DashVolcano` : 'DashVolcano - Interactive Volcano Database';
  }, [location.pathname]);

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
      {/* Brand only: each page provides its own h1 */}
      <p className={`text-lg font-bold tracking-tight text-ink ${compact ? 'sr-only' : ''}`}>
        Dash<span className="text-accent-ink">Volcano</span>
      </p>
    </div>
  );

  const iconButtonClass =
    'p-2 rounded-md text-ink-muted hover:text-ink hover:bg-gray-100 transition-colors duration-200';

  return (
    <div className="flex h-screen bg-canvas">
      <a
        href="#main-content"
        onClick={(event) => {
          // Move focus without changing the URL (keeps router state untouched)
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-surface focus:text-ink focus:shadow-lg"
      >
        Skip to content
      </a>
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
              ref={menuButtonRef}
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
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto focus:outline-none">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Main menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
          <div ref={drawerRef} className="relative flex flex-col w-72 max-w-[85vw] h-full bg-surface shadow-2xl">
            <div className="flex items-center justify-between h-14 px-4 border-b border-line">
              {renderBrand(false)}
              <button type="button" onClick={() => setMobileMenuOpen(false)} className={iconButtonClass} aria-label="Close menu" autoFocus>
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
