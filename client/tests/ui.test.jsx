import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './render.jsx';
import { TextField } from '../src/components/ui/Field.jsx';
import { Dialog } from '../src/components/ui/Dialog.jsx';
import { Button } from '../src/components/ui/Button.jsx';
import { ThemeToggle } from '../src/components/layout/ThemeToggle.jsx';
import { useToast } from '../src/components/ui/Toast.jsx';

describe('TextField', () => {
  it('links label, hint and error to the input', () => {
    renderWithProviders(
      <TextField label="Email" hint="Work or personal" error="Enter a valid email" />,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email');
  });

  it('shows the hint when there is no error', () => {
    renderWithProviders(<TextField label="Name" hint="As on your resume" />);
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('As on your resume');
  });
});

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    renderWithProviders(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Dialog', () => {
  function Harness({ onClose }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        <Dialog
          open={open}
          onClose={() => {
            setOpen(false);
            onClose();
          }}
          title="Delete resume"
          description="This cannot be undone."
        >
          <p>Body</p>
        </Dialog>
      </>
    );
  }

  it('opens with an accessible name and closes from the close button', () => {
    const onClose = vi.fn();
    renderWithProviders(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByText('Open'));
    const dialog = screen.getByRole('dialog', { name: 'Delete resume' });
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ThemeToggle', () => {
  it('applies and persists the chosen theme', () => {
    renderWithProviders(<ThemeToggle />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dark theme' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('resumeos:theme')).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Dark theme' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Light theme' }));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

describe('Toast', () => {
  function Trigger() {
    const toast = useToast();
    return (
      <>
        <button onClick={() => toast.success('Saved')}>ok</button>
        <button onClick={() => toast.error("Couldn't save", 'Retry in a moment.')}>fail</button>
      </>
    );
  }

  it('announces success politely and errors assertively', () => {
    renderWithProviders(<Trigger />);
    fireEvent.click(screen.getByText('ok'));
    fireEvent.click(screen.getByText('fail'));
    expect(screen.getByText('Saved').closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText("Couldn't save").closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'assertive',
    );
  });
});
