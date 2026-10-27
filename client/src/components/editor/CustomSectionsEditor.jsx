import { TextField } from '../ui/Field.jsx';
import { EntryListEditor } from './EntryListEditor.jsx';
import {
  CUSTOM_ITEM_FIELDS,
  newCustomItem,
  newCustomSection,
} from '../../features/profile/sectionConfig.js';
import { LIMITS } from '@resumeos/shared/limits.js';
import { replaceAt } from '../../lib/array.js';

/** Custom sections (Publications, Awards, Volunteering…): each has a title and its own entries. */
export function CustomSectionsEditor({
  sections = [],
  onChange,
  deleteMessage,
  renderHeaderExtra,
  isMuted,
}) {
  return (
    <EntryListEditor
      items={sections}
      onChange={onChange}
      noun="section"
      addLabel="Add custom section"
      emptyText="Add sections like Publications, Awards, Talks or Volunteering."
      deleteMessage={deleteMessage}
      maxItems={LIMITS.customSections}
      describe={(s) => s.title}
      newItem={newCustomSection}
      fields={[]}
      renderHeaderExtra={renderHeaderExtra}
      isMuted={isMuted}
      renderBodyExtra={(section) => {
        const index = sections.findIndex((s) => s.id === section.id);
        return (
          <div className="mb-5 grid gap-5">
            <TextField
              label="Section title"
              value={section.title}
              onChange={(e) =>
                onChange(replaceAt(sections, index, { ...section, title: e.target.value }), {
                  coalesceKey: `sec:${section.id}:title`,
                })
              }
              hint="Shown as the heading on your resume."
            />
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Entries</p>
              <EntryListEditor
                items={section.items}
                onChange={(items, opts) =>
                  onChange(replaceAt(sections, index, { ...section, items }), opts)
                }
                noun="entry"
                emptyText="No entries in this section yet."
                deleteMessage="This removes the entry from this section."
                describe={(i) => i.title}
                newItem={newCustomItem}
                fields={CUSTOM_ITEM_FIELDS}
              />
            </div>
          </div>
        );
      }}
    />
  );
}
