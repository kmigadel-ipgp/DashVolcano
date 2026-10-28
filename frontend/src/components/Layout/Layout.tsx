import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';

const Layout = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const navLinks = [
    { path: '/map', label: 'Map' },
    { path: '/compare-volcanoes', label: 'Compare Volcanoes' },
    { path: '/compare-vei', label: 'Compare VEI' },
    { path: '/analyze', label: 'Analyze Volcano' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/about', label: 'About' },
  ];

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
      location.pathname === path
        ? 'bg-accent-soft text-accent-ink font-semibold'
        : 'text-ink-muted hover:text-ink hover:bg-gray-100'
    }`;

  const themeLabel = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-surface border-b border-line">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <span className="text-2xl" aria-hidden="true">🌋</span>
              <h1 className="text-xl font-bold tracking-tight text-ink">
                Dash<span className="text-accent-ink">Volcano</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1" aria-label="Main">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={linkClass(link.path)}
                    aria-current={location.pathname === link.path ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-md text-ink-muted hover:text-ink hover:bg-gray-100 transition-colors duration-200"
                aria-label={themeLabel}
                title={themeLabel}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Sun className="w-5 h-5" aria-hidden="true" />
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-ink-muted hover:text-ink hover:bg-gray-100 transition-colors duration-200"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" aria-hidden="true" />
                ) : (
                  <Menu className="w-6 h-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-3 pt-3 pb-2 border-t border-line" aria-label="Main">
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${linkClass(link.path)} py-3`}
                    aria-current={location.pathname === link.path ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-line text-ink-muted py-2.5 text-center text-xs">
        <p>
          © 2025 DashVolcano | Data sources: GEOROC, PetDB, GVP | Built with React + Deck.gl
        </p>
      </footer>
    </div>
  );
};

export default Layout;
