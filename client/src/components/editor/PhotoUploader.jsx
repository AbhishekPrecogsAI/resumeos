import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2, UserRound } from 'lucide-react';
import { photoApi, PHOTO_KEY, prepareProfilePhoto } from '../../api/photo.api.js';
import { Button } from '../ui/Button.jsx';
import { useToast } from '../ui/Toast.jsx';

/** `onSaved` runs after a successful upload, e.g. to show the photo on the resume being edited. */
export function PhotoUploader({ onSaved }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const photo = useQuery({ queryKey: PHOTO_KEY, queryFn: photoApi.get });

  const upload = useMutation({
    mutationFn: async (file) => photoApi.put(await prepareProfilePhoto(file)),
    onSuccess: (saved) => {
      setError(null);
      queryClient.setQueryData(PHOTO_KEY, saved);
      toast.success('Photo saved');
      onSaved?.(saved);
    },
    onError: (err) => setError(err.message),
  });
  const remove = useMutation({
    mutationFn: photoApi.remove,
    onSuccess: () => {
      queryClient.setQueryData(PHOTO_KEY, null);
      toast.success('Photo removed');
    },
    onError: (err) => toast.error("Couldn't remove the photo", err.message),
  });

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-rule bg-surface p-4">
      {photo.data ? (
        <img
          src={photo.data.dataUrl}
          alt="Your current upload"
          className="size-20 rounded-full object-cover"
        />
      ) : (
        <span
          className="grid size-20 place-items-center rounded-full bg-sunken text-faint"
          aria-hidden="true"
        >
          <UserRound className="size-8" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">Profile photo (optional)</p>
        <p className="mt-0.5 text-sm text-muted">
          Shown only on resumes where you switch it on, with templates that support photos. Many
          employers in the US, UK and Canada prefer resumes without photos, and applicant tracking
          systems ignore them.
        </p>
        {error && (
          <p role="alert" className="mt-1 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id="profile-photo-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = '';
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            loading={upload.isPending}
            loadingLabel="Uploading photo"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-4" aria-hidden="true" />{' '}
            {photo.data ? 'Replace photo' : 'Upload photo'}
          </Button>
          {photo.data && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="size-4" aria-hidden="true" /> Remove
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-faint">
          Cropped to a square and resized in your browser; location data in the file isn't uploaded.
        </p>
      </div>
    </div>
  );
}
