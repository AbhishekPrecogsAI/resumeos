import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useLogout } from '../../hooks/useAuth.jsx';
import { useToast } from '../ui/Toast.jsx';

export function UserMenu({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const menuId = useId();
  const navigate = useNavigate();
  const toast = useToast();
  const logout = useLogout();

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const signOut = () =>
    logout.mutate(undefined, {
      onSuccess: () => toast.success('Signed out'),
      onError: () =>
        toast.info(
          'Signed out on this device',
          "The server couldn't be reached; your session will expire on its own.",
        ),
      onSettled: () => navigate('/login', { replace: true }),
    });

  const initial = (user.displayName || user.email).trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md py-1 pr-1.5 pl-1 text-sm hover:bg-sunken"
      >
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
        >
          {initial}
        </span>
        <span className="hidden max-w-40 truncate font-medium text-ink sm:block">
          {user.displayName}
        </span>
        <span className="sr-only">Account menu for {user.displayName}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 z-30 mt-1.5 w-60 rounded-lg border border-rule bg-surface p-1.5 shadow-paper"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.displayName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 border-t border-rule" />
          <Link
            to="/app/settings/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-ink hover:bg-sunken"
          >
            <Settings className="size-4 text-muted" aria-hidden="true" /> Settings
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={logout.isPending}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-ink hover:bg-sunken"
          >
            <LogOut className="size-4 text-muted" aria-hidden="true" />{' '}
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
