# Afterfault review QA — packaging verification, 18 October 2026

## Executed successfully

All build and automated checks below were rerun for this packaging pass after a successful clean `npm ci` installation from `package-lock.json` (Node.js 24.19.0). Approved website copy and product behavior were preserved.

- Production client and server-render builds using Vite, plus static rendering of five page outputs.
- Five automated case-rule tests: $240 parts / $90 labour / $330 total; missing evidence; simulated evidence without approval; expired versus unknown eligibility; draft labels and unchanged case state; all three cases retain supplier outcome fields through every evidence addition and export.
- Fourteen DOM integration checks using jsdom and React Testing Library: home and leadership content; mobile-menu state and Team link; case search and empty result; evidence and review filters; case detail, itemised costs and clause dialog; evidence-record inspection; simulated evidence; reviewer and note changes; draft download generation and contents; all four workspace tabs; reset; contact validation and clipboard copy; clipboard fallback; Brand, Privacy, Terms and unknown-route content.
- Generated HTML checks: essential content exists without JavaScript, expected anchor IDs, route canonical URLs, review noindex metadata and truthful Organization data.
- All marketing navigation links point to existing sections or included routes. HTML favicon links, social preview image, robots.txt and both review indexing header configurations checked.
- All 14 brand-download targets exist. PNG transparency and 16px/32px/180px icon dimensions checked.
- Self-contained HTML preview evaluated in jsdom: hydration, mobile-menu state, route switching to Brand, embedded logo and download links; no captured console errors.
- The primary transparent logo image was visually inspected during the original build; it was not re-inspected during packaging.

Commands: `npm run build`, `npm test`, `npm run test:ui`, `npm run preview:file`, `node scripts/artifact-check.mjs`.

## Claim-state confirmation

Adding simulated evidence updates completeness only. It does not change the selected reviewer or local review decision. Draft generation does not mutate the case. All exported packs retain “Not submitted. No recovery received.” and explain that completeness is not supplier approval. No action sets submitted, supplier-approved, paid, or recovered outcomes. RF-1042 retains $240 potential parts recovery and $90 excluded labour; the $330 repair total is not labelled recoverable.

## Packaging checks

The source ZIP was checked for integrity, required files and byte-for-byte correspondence with the tested local project. It includes the npm lockfile, source, build scripts, prebuilt HTML/assets, original SVG/PNG branding, legal pages, README, this report and private handover notes. It excludes node_modules, .ssr, Git metadata, caches, real environment files and secrets.

## Not executed / remaining checks

A supported browser-control surface was unavailable, so no real browser was launched. Desktop and phone visual layout, actual viewport overflow, native dialog focus trapping and keyboard behavior, reduced-motion behavior, OS downloads, and real email-client opening/delivery have not been verified. DOM simulation checks behavior but cannot verify those browser/OS details.

The contact mailto destination and copy flow were checked; a real email draft was not opened and no email was sent. There is no live contact endpoint to test.

No deployment, custom domain/DNS, hosting access protection, live route status codes, AWS services, real supplier processing, or production integrations were tested or created. Pages and a conventional static 404 file are provided; host-specific behavior must be checked after an owner-authorized deployment.

Policies are review drafts. No Product Hunt draft is included because it was optional. No profiles or external accounts were created.


## StudyPatch-parity revision — 2026-10-29

Added: the interactive multi-role prototype (`/app`); home sections (prototype CTA, benefits, use cases, safeguards, plans, FAQ); a CRM-ready early-access form; `docs/architecture.md`, `docs/safeguards.md` and `docs/crm-plan.md`; and `backend/` starters. The original desk, leadership section, routes and noindex controls are unchanged.

Commands run, all passing: `npm run build` (6 routes); `npm test` (16 tests: original cases, shared rule fixtures, workflow and permissions, lead validation); `npm run test:ui` (14 original DOM checks); `npm run test:prototype` (three-role UI loop, persistence, reset); `npm run test:backend` (7 Python tests on the same fixtures); `npm run preview:file`; and `node scripts/artifact-check.mjs` (updated to allow the `/app` link).

Real browser (headless Chromium) at 1440×900 and 390×844 on the home page, `/app/`, case Assessment, AI, Evidence and Claim tabs, admin and `/privacy/`: no console or page errors and no horizontal overflow. Two problems were fixed along the way: the case status row overflowed on mobile, and the consent checkboxes collided with the existing `.check` icon style. The offline preview opens the prototype, navigates inside it and returns home without errors.

Not claimed: screen-reader and real-device checks, live HubSpot submission, anything on AWS.

Owner decisions open: real prices (the plans say “Pricing on request”); the HubSpot IDs and matching Privacy wording; actual supplier terms for a pilot.
