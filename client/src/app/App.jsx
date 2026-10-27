import { SystemStatus } from './SystemStatus.jsx';

// Phase 0 placeholder shell. Routing and the design system arrive in Phase 1.
export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">ResumeOS</h1>
        <p className="mt-2 text-gray-700">
          Development foundation. This page only verifies client–server connectivity.
        </p>
      </div>
      <SystemStatus />
    </main>
  );
}
