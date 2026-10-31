import { useQuery } from '@tanstack/react-query';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';
import { photoApi, PHOTO_KEY } from '../../api/photo.api.js';
import { Checkbox } from '../ui/Field.jsx';
import { PhotoUploader } from './PhotoUploader.jsx';

const PHOTO_TEMPLATES = TEMPLATES.filter((t) => t.photo).map((t) => t.name);

/**
 * The photo, from inside a resume: upload or replace it (it's shared by all your resumes) and
 * choose whether this resume shows it. Templates without a photo say so and name ones with one.
 */
export function ResumePhotoPanel({ template, layout, patchLayout }) {
  const photo = useQuery({ queryKey: PHOTO_KEY, queryFn: photoApi.get });

  if (!template?.photo)
    return (
      <p className="rounded-lg border border-rule bg-surface p-4 text-sm text-muted">
        {template?.name ?? 'This template'} doesn't show a photo. Templates that do:{' '}
        {PHOTO_TEMPLATES.join(', ')}.
      </p>
    );

  return (
    <div className="grid gap-3">
      <PhotoUploader
        onSaved={() => {
          // Uploading from a resume means you want it on this resume.
          if (!layout.showPhoto) patchLayout({ showPhoto: true });
        }}
      />
      <Checkbox
        label="Show my photo on this resume"
        hint={
          photo.data
            ? 'Many employers in the US, UK and Canada prefer resumes without photos; applicant tracking systems ignore them.'
            : 'Upload a photo above first. It is shared by all your resumes.'
        }
        checked={Boolean(layout.showPhoto)}
        disabled={!photo.data && !layout.showPhoto}
        onChange={(e) => patchLayout({ showPhoto: e.target.checked })}
      />
    </div>
  );
}
