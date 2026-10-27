import { useState } from 'react';
import { TextField } from '../ui/Field.jsx';

/** Comma-separated list edited as text; parsed into an array when the field loses focus. */
export function TagsField({
  label,
  value = [],
  onChange,
  hint = 'Separate items with commas.',
  ...props
}) {
  const [text, setText] = useState(value.join(', '));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value.join(', '));
  }
  const commit = () => {
    const next = text
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (next.join('\u0000') !== value.join('\u0000')) onChange(next);
    setText(next.join(', '));
  };
  return (
    <TextField
      label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      hint={hint}
      {...props}
    />
  );
}
