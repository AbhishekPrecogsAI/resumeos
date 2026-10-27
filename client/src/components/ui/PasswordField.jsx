import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TextField } from './Field.jsx';

export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <TextField {...props} type={visible ? 'text' : 'password'} inputClassName="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute top-[1.85rem] right-1 grid size-8 place-items-center rounded text-muted hover:text-ink"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
