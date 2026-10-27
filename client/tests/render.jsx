import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Providers } from '../src/app/providers.jsx';
import { routes } from '../src/app/router.jsx';

export function renderRoute(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    router,
    ...render(
      <Providers>
        <RouterProvider router={router} />
      </Providers>,
    ),
  };
}

export function renderWithProviders(ui) {
  return render(<Providers>{ui}</Providers>);
}
