import { NavLink, Outlet } from 'react-router';
import { AppPage } from '../../components/layout/AppPage.jsx';
import { cx } from '../../lib/cx.js';

const TABS = [
  { to: 'profile', label: 'Profile' },
  { to: 'security', label: 'Security' },
  { to: 'privacy', label: 'Privacy and data' },
];

export function SettingsLayout() {
  return (
    <AppPage title="Settings" width="narrow">
      <nav
        aria-label="Settings"
        className="-mt-2 mb-8 flex gap-1 overflow-x-auto border-b border-rule"
      >
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cx(
                '-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap',
                isActive
                  ? 'border-accent font-medium text-ink'
                  : 'border-transparent text-muted hover:text-ink',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="grid gap-6">
        <Outlet />
      </div>
    </AppPage>
  );
}
