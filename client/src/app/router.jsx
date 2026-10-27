import { createBrowserRouter } from 'react-router';
import { PublicLayout } from '../components/layout/PublicLayout.jsx';
import { RouteError } from './RouteError.jsx';

const page = (loader, name) => async () => ({ Component: (await loader())[name] });

export const routes = [
  {
    element: <PublicLayout />,
    hydrateFallbackElement: <div className="min-h-dvh" />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: page(() => import('../features/public/LandingPage.jsx'), 'LandingPage'),
      },
      {
        path: 'features',
        lazy: page(() => import('../features/public/FeaturesPage.jsx'), 'FeaturesPage'),
      },
      {
        path: 'templates',
        lazy: page(() => import('../features/public/TemplatesPage.jsx'), 'TemplatesPage'),
      },
      {
        path: 'pricing',
        lazy: page(() => import('../features/public/PricingPage.jsx'), 'PricingPage'),
      },
      {
        path: 'security',
        lazy: page(() => import('../features/public/SecurityPage.jsx'), 'SecurityPage'),
      },
      {
        path: 'privacy',
        lazy: page(() => import('../features/public/LegalPages.jsx'), 'PrivacyPage'),
      },
      { path: 'terms', lazy: page(() => import('../features/public/LegalPages.jsx'), 'TermsPage') },
      {
        path: '*',
        lazy: page(() => import('../features/public/NotFoundPage.jsx'), 'NotFoundPage'),
      },
    ],
  },
];

export function createRouter() {
  return createBrowserRouter(routes);
}
