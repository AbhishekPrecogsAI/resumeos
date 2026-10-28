import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Briefcase, FileText, LayoutDashboard, Menu, Settings, UserRound, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useTheme } from '../../hooks/useTheme.jsx';
import { Logo } from './Logo.jsx';
import { SkipLink } from './SkipLink.jsx';
import { UserMenu } from './UserMenu.jsx';
import { cx } from '../../lib/cx.js';

// Navigation grows as each product area ships.
export const APP_NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/profile', label: 'Master profile', icon: UserRound },
  { to: '/app/resumes', label: 'Resumes', icon: FileText },
  { to: '/app/jobs', label: 'Job descriptions', icon: Briefcase },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function SideNav({ onNavigate }) {
  return (
    <nav aria-label="App" className="grid gap-0.5">
      {APP_NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
              isActive
                ? 'bg-sunken font-medium text-ink'
                : 'text-muted hover:bg-sunken hover:text-ink',
            )
          }
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Apply the account's saved theme once per signed-in user. */
function useAccountTheme(user) {
  const { setPreference } = useTheme();
  const applied = useRef(null);
  useEffect(() => {
    if (user && applied.current !== user.id) {
      applied.current = user.id;
      setPreference(user.preferences.theme);
    }
  }, [user, setPreference]);
}

export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [drawerPath, setDrawerPath] = useState(null);
  const drawerOpen = drawerPath === location.pathname;
  useAccountTheme(user);

  return (
    <div className="flex min-h-dvh">
      <SkipLink />
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-rule bg-surface px-3 py-4 lg:flex">
        <div className="px-2.5 pb-6">
          <Logo to="/app" />
        </div>
        <SideNav />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/30"
            onClick={() => setDrawerPath(null)}
          />
          <div
            id="app-drawer"
            className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface px-3 py-4 shadow-paper"
          >
            <div className="flex items-center justify-between px-2.5 pb-6">
              <Logo to="/app" />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setDrawerPath(null)}
                className="grid size-8 place-items-center rounded-md hover:bg-sunken"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <SideNav onNavigate={() => setDrawerPath(null)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-rule bg-canvas/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-md hover:bg-sunken lg:hidden"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="app-drawer"
            onClick={() => setDrawerPath(location.pathname)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="lg:hidden">
            <Logo to="/app" />
          </div>
          <div className="ml-auto">{user && <UserMenu user={user} />}</div>
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
