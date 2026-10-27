import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { createRouter } from './router.jsx';

export function App() {
  const [router] = useState(createRouter);
  return <RouterProvider router={router} />;
}
