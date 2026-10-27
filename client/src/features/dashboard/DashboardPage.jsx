import { useAuth } from '../../hooks/useAuth.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { AppPage, Panel } from '../../components/layout/AppPage.jsx';

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const firstName = user.displayName.split(/\s+/)[0];
  return (
    <AppPage
      title={`Welcome, ${firstName}`}
      description="This is your workspace. Your profile and resumes will appear here."
    >
      <Panel
        title="Your account is ready"
        description="Profile and resume editing are the next areas to arrive in this workspace."
      >
        <p className="text-muted">
          In the meantime you can review your account details, change your password, see where
          you're signed in, or export and delete your data from Settings.
        </p>
      </Panel>
    </AppPage>
  );
}
