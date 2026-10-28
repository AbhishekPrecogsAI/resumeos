# User test plan (not yet run)

No user testing has been done. This is the plan for a first round with 5 target users:
backend, full-stack and DevOps engineers or SREs, each with an existing resume.

## Sessions (45 minutes, moderated, think-aloud)

1. Without help, create an account and fill the master profile from your current resume.
   _Observe:_ where people hesitate, which fields they skip, and whether autosave is trusted.
2. Create a resume, hide one older role, reorder sections and export a PDF.
   _Observe:_ whether the export check results are understood and believed.
3. Paste a real job posting the participant would apply to. Review the terms and create a
   tailored copy.
   _Observe:_ whether "not found in your saved profile" is read as intended, and whether anyone
   is tempted to add terms they can't support.
4. Save a version, edit, compare, and restore the earlier version.
   _Observe:_ whether the version model is understood without explanation.
5. Debrief: what they'd use weekly, what they'd stop using, what felt untrustworthy.

## Measures

Record these as observed facts only:

- Time to first successful export.
- Profile checklist completion at the end of task 1.
- Quality findings dismissed vs. acted on, and which rules felt noisy.
- Job terms removed from the extracted list (precision of extraction).
- Errors or confusion per task.

Write findings to `docs/user-research/` with dates. Don't summarise them as product-market fit.
