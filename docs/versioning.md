# Resume versions

## Model

- **Draft:** each resume's working copy. It's autosaved and revision-checked (`If-Match`).
- **Version:** an immutable snapshot of the draft's content, layout, sync baselines,
  template and page size (`ResumeVersion` collection). There is no update endpoint; versions
  can only be deleted.
- Version numbers come from a per-resume counter and are never reused, even after a deletion.
- `parentVersionId` points at the version the draft was based on when the snapshot was taken.
  If that version is deleted later, the UI says "from a deleted version".
- `resume.currentVersionId` is the most recent version the draft descends from. The UI
  compares the draft against it ("Matches v3" / "Changes since v3"), using the same content
  hash as the server.

## Restore

Restoring vN never rewrites history:

1. If the draft differs from the current version, it's saved first as an automatic version
   ("Before restoring vN").
2. A new version (kind `restore`, `restoredFromVersionId: vN`) is created with vN's content.
3. The draft is replaced with vN's content, template and page size, and its revision is bumped.
   The write is conditional on the draft revision read in step 1. If another tab saved in
   between, the new versions are removed and the request returns `409`. Editor tabs still open
   on the old revision get the usual conflict banner on their next save.

## Branching

`POST /resumes/:id/duplicate { fromVersionId, targetRole? }` creates a separate resume from
a saved version, for tailoring to another job. The new resume records `branchedFrom`.

## Comparison

`GET /resumes/:id/compare?left=<versionId|draft>&right=<versionId|draft>` returns a
structured diff from `shared/src/diff.js` (pure; also used by the client):

- Entries match by stable id, so an edited entry is reported as _changed_ (with field-level
  before/after), not as removed plus added.
- Moves use the minimal set of moved entries (outside a longest increasing subsequence). Swapping
  two entries is reported as one move.
- Bullets are matched by id, with word-level diffs. Texts over 600 tokens fall back to a
  whole replace.
- Section order, section visibility and hidden entries are reported separately from content,
  and template and page-size changes are reported separately again.
- The UI offers unified and side-by-side views. Every change carries a text label or icon, not
  just colour, and inserted/deleted words have screen-reader prefixes.

## Exports

An export records `resumeVersionId` only when the exported draft is identical (same content
hash and template) to the current version, so "Exported" on a version means that exact
content was exported.

## Retention

Up to 100 versions per resume (`409 VERSION_LIMIT_REACHED` beyond that). Versions are deleted
only by the user, along with their resume, or with the account, and they're included in the
account data export.
