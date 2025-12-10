import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/map', label: 'Map' },
    { path: '/compare-volcanoes', label: 'Compare Volcanoes' },
    { path: '/compare-vei', label: 'Compare VEI' },
    { path: '/analyze', label: 'Analyze Volcano' },
    { path: '/timeline', label: 'Timeline' },
    { path: '/about', label: 'About' },
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-volcano-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🌋</span>
              <h1 className="text-2xl font-bold">DashVolcano v3.0</h1>
            </div>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-lg transition-colors duration-200 ${
                    location.pathname === link.path
                      ? 'bg-volcano-800 font-semibold'
                      : 'hover:bg-volcano-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-volcano-600 transition-colors duration-200"
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

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden mt-4 pb-4 border-t border-volcano-600 pt-4">
              <div className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg transition-all duration-200 ${
                      location.pathname === link.path
                        ? 'bg-volcano-800 font-semibold'
                        : 'hover:bg-volcano-600'
                    }`}
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
      <footer className="bg-gray-800 text-white py-3 text-center text-sm">
        <p>
          © 2025 DashVolcano | Data sources: GEOROC, PetDB, GVP | Built with React + Deck.gl
        </p>
      </footer>
    </div>
  );
};

export default Layout;
