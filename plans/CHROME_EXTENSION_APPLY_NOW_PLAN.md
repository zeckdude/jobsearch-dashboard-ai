# Chrome Extension Apply Now Flow

## Summary

Add an `Apply Now` button to the Chrome extension that appears only after a job has been saved. The extension will remember the last saved job, use the current active tab URL when clicked, tell the app to prepare the custom resume and cover letter, then launch the local application assistant for that job.

## Key Changes

- Add a backend endpoint for the extension, likely `POST /api/jobs/:id/apply-now`, that:
  - Requires the optional `BROWSER_EXTENSION_TOKEN` when configured, matching `/api/jobs/capture`.
  - Accepts `{ applicationUrl, atsProvider?, pageUrl? }` from the extension.
  - Updates the saved `JobPosting.applicationUrl` to the current tab URL before preparing.
  - Calls the existing `prepareApplicationPackage(jobId)` flow to generate/reuse resume and cover letter.
  - Calls the existing application assistant launch flow for the prepared application.
  - Returns application id, job id, launch status, assistant message, and manual-submit requirement.
- Update the capture response to expose stable extension-friendly identifiers:
  - Add `jobId: result.job.id`.
  - Keep existing `jobUrl`.
  - Optionally include `company` and `title` for popup status text.
- Update the Chrome popup:
  - Add a hidden `Apply Now` button after `Save to Job Search OS`.
  - After a successful save, store the last saved job in `chrome.storage.local`: job id, job URL, company, title, saved timestamp.
  - On popup load, show `Apply Now` if a last saved job exists.
  - When clicked, read the active tab URL and post it to `/api/jobs/:id/apply-now`.
  - Show progress states: preparing materials, launching assistant, launched, or actionable error.
  - Keep `Fill from Job Search OS` as a separate manual fill tool for already-ready applications.
- Update extension docs:
  - Document the new flow: save job description page, navigate to the real application page if needed, reopen extension, click `Apply Now`.
  - Reiterate that the assistant prepares materials and still requires manual final submit.

## Test Plan

- API tests:
  - `POST /api/jobs/:id/apply-now` updates the job application URL from the request.
  - It prepares a ready application with generated/reused resume and cover letter.
  - It launches the assistant and returns the existing launch payload shape.
  - It rejects invalid extension tokens when `BROWSER_EXTENSION_TOKEN` is configured.
  - It returns a clear error for missing job, missing application URL, missing profile/material prerequisites, or assistant launch blocker.
- Extension packaging/static checks:
  - Run existing Chrome extension package validation.
  - Verify popup JS can show/hide `Apply Now`, persist last saved job, and send the current tab URL.
- Regression checks:
  - Existing save capture flow still works.
  - Existing `Fill from Job Search OS` by current URL still works.
  - Existing app UI prepare/launch endpoints remain unchanged.

## Assumptions

- `Apply Now` uses the current active tab URL at click time.
- The extension remembers the last saved job across popup closes so the user can save on a job-description page, navigate to the real application form, reopen the popup, and launch.
- Final application submission remains manual unless existing assistant safety gates allow otherwise; no CAPTCHA bypass or forced submit behavior is added.
