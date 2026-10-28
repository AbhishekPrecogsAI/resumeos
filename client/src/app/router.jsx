import { createBrowserRouter, Navigate } from 'react-router';
import { PublicLayout } from '../components/layout/PublicLayout.jsx';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { RequireAuth, RedirectIfSignedIn } from './guards.jsx';
import { RouteError } from './RouteError.jsx';
import { NotFoundPage } from '../features/public/NotFoundPage.jsx';

const page = (loader, name) => async () => ({ Component: (await loader())[name] });

const pub = (file, name) => page(() => import(`../features/public/${file}.jsx`), name);

export const routes = [
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <div className="min-h-dvh" />,
    children: [
      { index: true, lazy: pub('LandingPage', 'LandingPage') },
      { path: 'features', lazy: pub('FeaturesPage', 'FeaturesPage') },
      { path: 'templates', lazy: pub('TemplatesPage', 'TemplatesPage') },
      { path: 'pricing', lazy: pub('PricingPage', 'PricingPage') },
      { path: 'security', lazy: pub('SecurityPage', 'SecurityPage') },
      { path: 'privacy', lazy: pub('LegalPages', 'PrivacyPage') },
      { path: 'terms', lazy: pub('LegalPages', 'TermsPage') },
      {
        element: <RedirectIfSignedIn />,
        children: [
          {
            path: 'login',
            lazy: page(() => import('../features/auth/LoginPage.jsx'), 'LoginPage'),
          },
          {
            path: 'register',
            lazy: page(() => import('../features/auth/RegisterPage.jsx'), 'RegisterPage'),
          },
        ],
      },
      {
        path: 'forgot-password',
        lazy: page(() => import('../features/auth/PasswordResetPages.jsx'), 'ForgotPasswordPage'),
      },
      {
        path: 'reset-password/:token',
        lazy: page(() => import('../features/auth/PasswordResetPages.jsx'), 'ResetPasswordPage'),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: 'app',
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            lazy: page(() => import('../features/dashboard/DashboardPage.jsx'), 'DashboardPage'),
          },
          {
            path: 'profile',
            lazy: page(() => import('../features/profile/ProfilePage.jsx'), 'ProfilePage'),
          },
          {
            path: 'resumes',
            lazy: page(() => import('../features/resumes/ResumesPage.jsx'), 'ResumesPage'),
          },
          {
            path: 'resumes/new',
            lazy: page(() => import('../features/resumes/NewResumePage.jsx'), 'NewResumePage'),
          },
          {
            path: 'resumes/:resumeId/edit',
            lazy: page(
              () => import('../features/resumes/editor/ResumeEditorPage.jsx'),
              'ResumeEditorPage',
            ),
          },
          {
            path: 'resumes/:resumeId/versions',
            lazy: page(
              () => import('../features/resumes/versions/VersionHistoryPage.jsx'),
              'VersionHistoryPage',
            ),
          },
          {
            path: 'resumes/:resumeId/compare/:leftVersionId/:rightVersionId',
            lazy: page(() => import('../features/resumes/versions/ComparePage.jsx'), 'ComparePage'),
          },
          {
            path: 'settings',
            lazy: page(() => import('../features/settings/SettingsLayout.jsx'), 'SettingsLayout'),
            children: [
              { index: true, element: <Navigate to="profile" replace /> },
              {
                path: 'profile',
                lazy: page(
                  () => import('../features/settings/ProfileSettingsPage.jsx'),
                  'ProfileSettingsPage',
                ),
              },
              {
                path: 'security',
                lazy: page(
                  () => import('../features/settings/SecuritySettingsPage.jsx'),
                  'SecuritySettingsPage',
                ),
              },
              {
                path: 'privacy',
                lazy: page(
                  () => import('../features/settings/PrivacySettingsPage.jsx'),
                  'PrivacySettingsPage',
                ),
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
