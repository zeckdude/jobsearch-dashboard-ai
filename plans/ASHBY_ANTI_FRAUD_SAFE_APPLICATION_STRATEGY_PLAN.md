# Ashby Anti-Fraud Safe Application Strategy

## Summary

Ashby appears to be flagging Playwright-controlled submissions. Do not implement stealth, Patchright, CAPTCHA solving, proxy rotation, or anti-fraud bypass. Instead, move Ashby applications to a safer normal-browser assisted-apply path: the app prepares materials and the Chrome extension fills the Ashby form inside the user's regular Chrome session, then the user performs final submit.

## Key Changes

- Add Ashby block detection:
  - Detect `possible spam`, `We couldn't submit your application`, `reCAPTCHA`, and similar Ashby copy.
  - Record blocker type `ats_spam_block`.
  - Keep the application not-applied and create a Needs Me item with retry guidance.
- Route Ashby jobs away from Playwright submit flows:
  - Playwright may still prepare files and inspect the page, but Ashby final review/submission should happen in normal Chrome.
  - For Ashby, disable auto-submit and repeated submit attempts.
  - Keep existing safety policy: no stealth, no CAPTCHA solving, no proxy/VPN tricks.
- Add Chrome extension assisted apply mode:
  - Extend the existing Chrome extension from capture-only to `Fill from Job Search OS`.
  - The extension requests an assistant package for the selected application from the local app.
  - It fills safe known fields, reveals file-upload needs where possible, and pastes cover-letter/application-answer text into obvious fields.
  - It does not click submit.
  - It runs in the user's normal Chrome profile, reducing Playwright/CDP automation signals without bypassing controls.
- Add blocked-Ashby alternate path actions:
  - On `ats_spam_block`, show actions to retry in normal Chrome, find a company direct path, and prepare recruiter outreach.
  - Prefer company direct/recruiter paths over generic job boards.
  - Store alternate URL/outreach recommendations on the application notes or packet when available.
- Add source quality handling:
  - Keep Ashby ingestion.
  - Repeated blocks mark Ashby roles as normal-browser submit recommended.
  - Lower assistant auto-launch priority for Ashby until the user chooses extension-assisted path.

## Test Plan

- Parser tests for spam block text creates `ats_spam_block`, keeps the app not applied, and creates a Needs Me item.
- Extension package validation.
- UI tests for blocked Ashby warning.
- Run `npx tsc --noEmit --pretty false`.
- Run `npm run build`.

## Assumptions

- No stealth, Patchright, CAPTCHA solving, proxy rotation, or anti-bot bypass will be implemented.
- Desired path: app prepares, Chrome extension fills normal Chrome, user submits.
- If normal Chrome is still blocked, pivot to direct/recruiter outreach.
