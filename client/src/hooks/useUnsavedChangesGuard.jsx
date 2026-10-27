import { useEffect } from 'react';
import { useBlocker } from 'react-router';
import { Dialog } from '../components/ui/Dialog.jsx';
import { Button } from '../components/ui/Button.jsx';

/**
 * Warn before leaving only when edits haven't reached the server. If a save is merely pending,
 * flush it and continue; only failed or conflicting saves ask the user.
 */
export function useUnsavedChangesGuard({ dirty, status, flush }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (status === 'pending' || status === 'saving') {
      // On failure the status becomes 'error' and the dialog below asks the user.
      Promise.resolve(flush()).then((ok) => ok && blocker.proceed());
    }
  }, [blocker, status, flush]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const askUser = blocker.state === 'blocked' && (status === 'error' || status === 'conflict');

  return (
    <Dialog
      open={askUser}
      onClose={() => blocker.reset?.()}
      size="sm"
      title="Leave without saving?"
      description="Your latest changes haven't been saved. If you leave now, they'll be lost."
      footer={
        <>
          <Button variant="secondary" onClick={() => blocker.reset?.()}>
            Stay on this page
          </Button>
          <Button variant="danger" onClick={() => blocker.proceed?.()}>
            Leave and discard
          </Button>
        </>
      }
    />
  );
}
