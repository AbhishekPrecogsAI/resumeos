import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { SkipLink } from './SkipLink.jsx';
import { ButtonLink } from '../ui/Button.jsx';
import { cx } from '../../lib/cx.js';
import { useAuth } from '../../hooks/useAuth.jsx';

const NAV = [
  { to: '/features', label: 'Features' },
  { to: '/templates', label: 'Templates' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/security', label: 'Security' },
];

function navClass({ isActive }) {
  return cx(
    'rounded-md px-2.5 py-1.5 text-sm transition-colors',
    isActive ? 'text-ink font-medium' : 'text-muted hover:text-ink',
  );
}

export function PublicLayout() {
  const location = useLocation();
  const { user } = useAuth();
  // The menu is open only for the path it was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState(null);
  const menuOpen = menuPath === location.pathname;

  useEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-rule bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
        <div className="mx-auto flex h-15 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <ThemeToggle />
            {user ? (
              <ButtonLink to="/app" size="sm">
                Open workspace
              </ButtonLink>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-2 py-1.5 text-sm text-muted hover:text-ink"
                >
                  Sign in
                </Link>
                <ButtonLink to="/register" size="sm">
                  Build your resume
                </ButtonLink>
              </>
            )}
          </div>
          <button
            type="button"
            className="ml-auto grid size-9 place-items-center rounded-md text-ink hover:bg-sunken lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuPath(menuOpen ? null : location.pathname)}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
        {menuOpen && (
          <div id="mobile-nav" className="border-t border-rule px-4 pt-3 pb-5 lg:hidden">
            <nav aria-label="Main" className="grid gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cx(navClass({ isActive }), 'py-2 text-base')}
                >
                  {item.label}
                </NavLink>
              ))}
              {!user && (
                <NavLink
                  to="/login"
                  className={({ isActive }) => cx(navClass({ isActive }), 'py-2 text-base')}
                >
                  Sign in
                </NavLink>
              )}
            </nav>
            <div className="mt-4 flex items-center justify-between gap-3">
              {user ? (
                <ButtonLink to="/app">Open workspace</ButtonLink>
              ) : (
                <ButtonLink to="/register">Build your resume</ButtonLink>
              )}
              <ThemeToggle />
            </div>
          </div>
        )}
      </header>

      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm text-muted">
              ResumeOS is in active development. Pages describe the product as designed; features
              ship phase by phase.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3"
          >
            {[...NAV, { to: '/privacy', label: 'Privacy' }, { to: '/terms', label: 'Terms' }].map(
              (item) => (
                <Link key={item.to} to={item.to} className="text-muted hover:text-ink">
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}
