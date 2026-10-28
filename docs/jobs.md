# Job-description comparison

Code: `shared/src/jobs/` (pure functions used by both client and server).

## Privacy and consent

- **Saving is opt-in.** The "Save this job description" checkbox starts unticked. Unticked,
  extraction and comparison run entirely in the browser with the shared code; the job text is
  never sent to the server.
- Saved descriptions (`JobDescription`) are kept until the user deletes them or the account.
  They're included in the data export and never logged.
- Size limit: 20,000 characters (`400` beyond that, with advice to trim boilerplate). Pasted
  links are not fetched; ResumeOS never scrapes job sites.

## Term extraction (`extract.js`)

1. **Dictionary match.** `dictionary.js` is an explicit list of about 120 technical terms with their
   accepted variants (e.g. Node.js / NodeJS / Node; PostgreSQL / Postgres; Kubernetes / K8s). Only
   listed variants count as the same term.
2. **Longest match first.** The text is scanned with every dictionary form, longest first. Each
   span is claimed by one form and masked, so "JS" inside "Node.js" never produces "JavaScript",
   and "K8s"/"k8s" count once.
3. **Word boundaries** treat letters, digits, `+` and `#` as part of a word, so "Java" doesn't
   match "JavaScript" and "C" doesn't match "C++".
4. **Ambiguous names** that are also English words (Go, C, R, Java, Rust, Swift, Ruby, Express,
   Spring, Git) are case-sensitive, so "let go of" isn't Go.
5. **Importance** comes from the nearest heading. "Requirements", "Qualifications", "You have"
   mark _required_; "Nice to have", "Bonus", "Preferred" mark _nice to have_. Inline phrases like
   "is a plus" also mark nice to have. Text before any heading is _mentioned_. A term takes its
   most important occurrence.
6. **Candidates.** Capitalised words or acronyms that appear at least twice, aren't in the
   dictionary, aren't common job-ad words, and appear mid-sentence (not only at sentence starts)
   are listed with a "Check" badge for the user to keep or remove.
7. Terms are sorted by importance, then dictionary-before-candidate, then frequency. At most 80.

The user can remove terms, add their own, and change importance. A saved job keeps its edited
list (`userTerms`) separately from the extraction, and can be reset to it.

## Comparison (`coverage.js`)

For each term:

- **In this resume:** found in text that prints, meaning visible sections and entries: headline,
  summary, skills, entries, bullets and technologies. It's reported as **exact** (the term
  itself) or **normalized** (a listed variant, or the same letters ignoring spaces, dots and
  hyphens; the latter only for terms of four or more characters).
- **In your profile but not on this resume:** found in the master profile (private evidence notes
  excluded), with the locations. Where it's safe, a specific change is offered:
  - _Show the section_ when the section is hidden on this resume;
  - _Show the entry_ when the entry is on the resume but hidden;
  - _Add the entry from your profile_ when the resume doesn't include it (the same pull used by
    profile sync).

  Matches only in profile summary or headline wording get no automatic change.

- **Not found in your saved profile:** the UI says explicitly that this says nothing about the
  user's real experience, and advises against adding terms they can't discuss.

The headline number is a plain count, "12 of 18 job terms found in this resume", with exact and
normalized shown separately. It's never presented as a score or a prediction.

## Tailoring (`tailor.js`)

Each suggestion is a checkbox and nothing is pre-selected. The user can then:

- **Apply to this resume:** re-reads the latest draft and writes it with the usual revision check.
- **Create a tailored copy:** duplicates the resume (title "Role at Company", target role set),
  applies the approved changes, and links the copy to the saved job (`resume.jobId`).

Changes only reuse existing profile or resume content. No skill, term or claim is ever written
on the user's behalf.

## Known limitations

- The dictionary is software-focused and finite. Unlisted terms appear only as repeated
  candidates or when added by hand.
- Variants are context-free: "monitoring" counts as _observability_, and a resume that says
  "Node" counts for Node.js.
- Importance detection depends on recognisable headings. Postings without them mark everything
  "mentioned".
- Matching is lexical. "Led migrations to Kubernetes" and "Kubernetes experience" count the same,
  and depth of experience isn't assessed.
