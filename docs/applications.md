# Application tracker

Each application records the company, role, status (`planned`, `applied`, `interviewing`,
`offer`, `rejected`, `withdrawn`), the applied and follow-up dates, and notes. Dates are
date-only `YYYY-MM-DD` strings, validated as real calendar dates and never shifted by
timezone.

An application can link:

- a saved **job description**;
- the **resume** sent, ideally pinned to a saved **version**, so you can open exactly what you
  sent (the UI links to a comparison of that version against the current draft).

Links are checked for ownership. Labels are copied at link time ("Backend, v2: Sent"), so the
history still reads correctly after the job, version or resume is deleted: the id is cleared
and the UI shows "(deleted)".

**Follow-ups:** `GET /api/v1/applications/due?today=YYYY-MM-DD` lists open applications
(planned, applied or interviewing) whose follow-up date is on or before the client's local
today. The dashboard shows them. No email or push reminders are sent, because there's no
delivery mechanism; the form says so.

Applications are included in the data export and removed with the account. At most 1,000 per
user.
