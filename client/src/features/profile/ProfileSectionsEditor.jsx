import { EntryFields } from '../../components/editor/EntryFields.jsx';
import { EntryListEditor } from '../../components/editor/EntryListEditor.jsx';
import { SkillsEditor } from '../../components/editor/SkillsEditor.jsx';
import { SummaryFields } from '../../components/editor/SummaryFields.jsx';
import { CustomSectionsEditor } from '../../components/editor/CustomSectionsEditor.jsx';
import { CONTACT_FIELDS, SECTIONS } from './sectionConfig.js';
import { PhotoUploader } from '../../components/editor/PhotoUploader.jsx';

export const PROFILE_DELETE_MESSAGE =
  'This removes it from your master profile. Resumes that already include it keep their own copy.';

/** Section order and anchors for the profile page navigator. */
export const PROFILE_NAV = [
  { id: 'contact', title: 'Contact' },
  { id: 'summary', title: 'Headline and summary' },
  { id: 'experience', title: 'Experience' },
  { id: 'projects', title: 'Projects' },
  { id: 'skills', title: 'Skills' },
  { id: 'education', title: 'Education' },
  { id: 'certifications', title: 'Certifications' },
  { id: 'languages', title: 'Languages' },
  { id: 'interests', title: 'Interests' },
  { id: 'custom', title: 'Custom sections' },
  { id: 'evidence', title: 'Evidence' },
];

/**
 * Renders one section's editor for profile or resume content. `onChange` receives a partial
 * content patch plus autosave options. Resume editing passes per-entry extras (visibility,
 * sync badges) and its own delete wording.
 */
export function ProfileSection({
  id,
  content,
  onChange,
  evidenceItems,
  deleteMessage = PROFILE_DELETE_MESSAGE,
  renderHeaderExtra,
  isMuted,
}) {
  const listProps = (key) => ({
    ...SECTIONS[key],
    items: content[key] ?? [],
    onChange: (items, opts) => onChange({ [key]: items }, opts),
    deleteMessage,
    context: { evidenceItems },
    renderHeaderExtra,
    isMuted,
  });

  switch (id) {
    case 'contact':
      return (
        <>
          <PhotoUploader />
          <EntryFields
            fields={CONTACT_FIELDS}
            value={content.contact}
            idPrefix="contact"
            onChange={(contact, opts) => onChange({ contact }, opts)}
          />
        </>
      );
    case 'summary':
      return (
        <SummaryFields headline={content.headline} summary={content.summary} onChange={onChange} />
      );
    case 'skills':
      return (
        <SkillsEditor
          skills={content.skills}
          onChange={(skills, opts) => onChange({ skills }, opts)}
          renderRowExtra={renderHeaderExtra}
          isMuted={isMuted}
        />
      );
    case 'custom':
      return (
        <CustomSectionsEditor
          sections={content.customSections}
          onChange={(customSections, opts) => onChange({ customSections }, opts)}
          deleteMessage={deleteMessage}
          renderHeaderExtra={renderHeaderExtra}
          isMuted={isMuted}
        />
      );
    case 'evidence': {
      const relatedOptions = [
        ...content.experience.map((e) => ({
          id: e.id,
          label: [e.title, e.company].filter(Boolean).join(', ') || 'Untitled role',
        })),
        ...content.projects.map((p) => ({ id: p.id, label: p.name || 'Untitled project' })),
      ];
      return (
        <>
          <p className="mb-4 text-sm text-muted">
            Evidence is yours to supply and stays private. Linking it to a bullet marks that bullet
            "Evidence attached". ResumeOS doesn't verify claims or evidence.
          </p>
          <EntryListEditor {...listProps('evidenceItems')} context={{ relatedOptions }} />
        </>
      );
    }
    default:
      return <EntryListEditor {...listProps(id)} />;
  }
}
