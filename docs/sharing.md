# Share links

A share link gives anyone who has it a read-only view of one resume, at `/r/<token>`. The owner
creates links from **Share** in the editor or on the resumes list and can have up to 20 per resume, each with its own
options.

## Options

| Option               | Values                                             | Default         |
| -------------------- | -------------------------------------------------- | --------------- |
| Who is it for?       | Free-text label, up to 60 characters               | Empty           |
| What they see        | This resume, kept up to date; or one saved version | Kept up to date |
| Allow PDF download   | On / off                                           | On              |
| Hide email and phone | On / off                                           | Off             |
| Link expires         | Never, 7, 30 or 90 days from creation              | Never           |

After creation the owner can change the download and contact options, turn a link off and on
again, or delete it. A "kept up to date" link shows the saved draft, so pending edits are saved
before the link is created. A version link stays as that version, whatever changes later.

## What a viewer receives

`GET /api/v1/shared/:token` returns only what the page shows, built by `shareableResume`
(`shared/src/sharing.js`):

- hidden sections and hidden entries are removed, not just marked hidden;
- evidence links on entries and bullets are removed;
- email and phone are blanked when the owner chooses to hide them;
- the resume title, the link label and anything about the owner's account are never included.

The viewer's browser renders it with the same template renderer as the editor and export. The
photo is included only when the resume shows one and the template supports it.
`GET /api/v1/shared/:token/pdf` renders the same content to PDF when downloads are allowed (403
`DOWNLOAD_NOT_ALLOWED` otherwise). PDF downloads share the export rate limit.

Unknown, turned-off and deleted links, and links whose resume or version was deleted, all answer
404 `SHARE_UNAVAILABLE`, so a token reveals nothing about why it doesn't work. Expired links
answer 410 `SHARE_EXPIRED`.

## Privacy and security

- Tokens are 18 random bytes (24 base64url characters) and are the only credential. The owner
  can see and copy them again, so they're stored as-is; turning a link off or deleting it takes
  effect on the next request.
- Shared API responses and the `/r/` page send `X-Robots-Tag: noindex, nofollow`, and the page
  adds a `robots` meta tag. API responses are `no-store` with `Referrer-Policy: no-referrer`.
- The owner sees how many times each link was opened and downloaded, and when it was last opened.
  Nothing about the viewer (IP address, browser) is stored. Opens count page loads, including the
  owner's own.
- Deleting a resume deletes its links. Deleting the account deletes every link, and links are
  included in the account data export.
