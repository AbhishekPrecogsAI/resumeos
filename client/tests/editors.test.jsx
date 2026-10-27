import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from './render.jsx';
import { BulletsEditor } from '../src/components/editor/BulletsEditor.jsx';
import { MonthField } from '../src/components/editor/MonthField.jsx';
import { EntryListEditor } from '../src/components/editor/EntryListEditor.jsx';
import { SkillsEditor } from '../src/components/editor/SkillsEditor.jsx';
import { TagsField } from '../src/components/editor/TagsField.jsx';
import { SECTIONS } from '../src/features/profile/sectionConfig.js';
import { moveItem } from '../src/lib/array.js';

function Controlled({ Component, initial, prop, ...rest }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <Component {...{ [prop]: value }} onChange={(v) => setValue(v)} {...rest} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}
const current = () => JSON.parse(screen.getByTestId('value').textContent);

describe('moveItem', () => {
  it('moves within bounds and ignores out-of-range moves', () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    const list = [1, 2];
    expect(moveItem(list, 0, -1)).toBe(list);
  });
});

describe('BulletsEditor', () => {
  it('adds a bullet on Enter and removes an empty one on Backspace', () => {
    renderWithProviders(
      <Controlled
        Component={BulletsEditor}
        prop="bullets"
        initial={[{ id: 'b_1', text: 'First', evidenceIds: [] }]}
      />,
    );
    fireEvent.keyDown(screen.getByLabelText('Bullets 1'), { key: 'Enter' });
    expect(current()).toHaveLength(2);
    expect(current()[1].text).toBe('');
    fireEvent.keyDown(screen.getByLabelText('Bullets 2'), { key: 'Backspace' });
    expect(current()).toHaveLength(1);
  });

  it('reorders with accessible move buttons', () => {
    renderWithProviders(
      <Controlled
        Component={BulletsEditor}
        prop="bullets"
        initial={[
          { id: 'b_1', text: 'A', evidenceIds: [] },
          { id: 'b_2', text: 'B', evidenceIds: [] },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move bullet 2 up' }));
    expect(current().map((b) => b.text)).toEqual(['B', 'A']);
    expect(screen.getByRole('button', { name: 'Move bullet 1 up' })).toBeDisabled();
  });

  it('never trims what the user typed', () => {
    renderWithProviders(
      <Controlled
        Component={BulletsEditor}
        prop="bullets"
        initial={[{ id: 'b_1', text: '', evidenceIds: [] }]}
      />,
    );
    fireEvent.change(screen.getByLabelText('Bullets 1'), {
      target: { value: '  Cut p95 latency — 820 → 310 ms  ' },
    });
    expect(current()[0].text).toBe('  Cut p95 latency — 820 → 310 ms  ');
  });

  it('links evidence and shows the status in words', () => {
    renderWithProviders(
      <Controlled
        Component={BulletsEditor}
        prop="bullets"
        initial={[{ id: 'b_1', text: 'Claim', evidenceIds: [] }]}
        evidenceItems={[{ id: 'ev_1', title: 'Benchmark' }]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'No evidence attached' }));
    fireEvent.click(screen.getByLabelText('Benchmark'));
    expect(current()[0].evidenceIds).toEqual(['ev_1']);
    expect(screen.getByRole('button', { name: 'Evidence attached (1)' })).toBeInTheDocument();
  });
});

describe('MonthField', () => {
  it('stores YYYY-MM, year-only, or empty', () => {
    const onChange = vi.fn();
    renderWithProviders(<MonthField label="Start date" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Start date year'), { target: { value: '20' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a four-digit year.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Start date year'), { target: { value: '2021' } });
    expect(onChange).toHaveBeenLastCalledWith('2021');
  });

  it('combines month and year', () => {
    renderWithProviders(
      <Controlled Component={MonthField} prop="value" initial="2021" label="Start date" />,
    );
    fireEvent.change(screen.getByLabelText('Start date month'), { target: { value: '03' } });
    expect(current()).toBe('2021-03');
  });
});

describe('TagsField', () => {
  it('parses comma-separated input on blur', () => {
    renderWithProviders(
      <Controlled Component={TagsField} prop="value" initial={[]} label="Technologies" />,
    );
    const input = screen.getByLabelText(/Technologies/);
    fireEvent.change(input, { target: { value: 'Go, , RabbitMQ ,AWS SQS' } });
    fireEvent.blur(input);
    expect(current()).toEqual(['Go', 'RabbitMQ', 'AWS SQS']);
  });
});

describe('EntryListEditor', () => {
  const config = SECTIONS.experience;
  const items = [
    { ...config.newItem(), id: 'exp_1', title: 'Engineer', company: 'Northwind' },
    { ...config.newItem(), id: 'exp_2', title: 'Developer', company: 'Tallyhouse' },
  ];

  it('asks before deleting and deletes on confirm', () => {
    renderWithProviders(
      <Controlled
        Component={EntryListEditor}
        prop="items"
        initial={items}
        {...config}
        deleteMessage="Gone from profile."
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete Engineer, Northwind' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete "Engineer, Northwind"?' });
    expect(current()).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete role' }));
    expect(current().map((e) => e.id)).toEqual(['exp_2']);
  });

  it('adds an expanded entry and edits its fields', () => {
    renderWithProviders(
      <Controlled Component={EntryListEditor} prop="items" initial={[]} {...config} />,
    );
    expect(screen.getByText(/No roles yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
    fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'SRE' } });
    expect(current()[0]).toMatchObject({ title: 'SRE', bullets: [] });
    expect(current()[0].id).toMatch(/^exp_/);
  });

  it('disables the end date while the role is current', () => {
    renderWithProviders(
      <Controlled
        Component={EntryListEditor}
        prop="items"
        initial={[{ ...items[0], current: true }]}
        {...config}
      />,
    );
    expect(screen.getByLabelText('End date year')).toBeDisabled();
  });
});

describe('SkillsEditor', () => {
  it('quick-adds several skills, skipping duplicates case-insensitively', () => {
    renderWithProviders(
      <Controlled
        Component={SkillsEditor}
        prop="skills"
        initial={[{ id: 'sk_1', name: 'Go', category: '', context: '', evidenceIds: [] }]}
      />,
    );
    const input = screen.getByLabelText('Add skills');
    fireEvent.change(input, { target: { value: 'go, PostgreSQL, Node.js' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(current().map((s) => s.name)).toEqual(['Go', 'PostgreSQL', 'Node.js']);
  });
});
