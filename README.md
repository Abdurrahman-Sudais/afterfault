# Afterfault — unpublished review version

A complete React + Vite + JavaScript + Tailwind CSS website with Lucide icons, original vector branding, a local interactive warranty review desk, and prerendered marketing pages. No AWS backend, supplier integration, or contact-submission backend is connected. Nothing has been deployed or published.

## Quick review

Open the included `Afterfault-review-preview.html` inside the extracted project folder. It is a self-contained offline preview, including the sample demo, internal page navigation and embedded brand downloads. A modern browser is needed for interactive behavior; a document viewer may show only static content. The full source project below is the authoritative deployment version.

## Run it locally

1. Install Node.js 22.12 or newer (Node.js 24 also works).
2. Unzip this project. Open a terminal in the `afterfault` folder containing `package.json`.
3. Run `npm ci` to install the locked dependencies.
4. Run `npm run dev` and open the local URL shown in the terminal.
5. To check the deployable version, run `npm run build`, then `npm run preview`. Open the displayed URL. Stop either server with Ctrl+C.

The build creates real HTML for `/`, `/app` (prototype), `/brand`, `/privacy`, `/terms`, and `404.html`. The homepage HTML includes the headline, product explanation, and both founders before JavaScript runs. `dist` is included as a ready-built convenience copy; rebuild it after source edits.

## Run the supplied checks

```bash
npm run build
npm test
npm run test:ui
npm run test:prototype
npm run test:backend
npm run preview:file
node scripts/artifact-check.mjs
```

`npm run test:backend` runs the Python Lambda tests (standard library only, Python 3.10+). `vite preview` does not resolve clean URLs, so open `/app/` with a trailing slash there; Vercel and Cloudflare serve `/app`.

The UI checks use a DOM simulator, not a real browser. Browser appearance, real keyboard behavior, native downloads, and the user's email application must still be checked manually. See `QA-REPORT.md`.

## Deploy later using Vercel

Do these steps only when you decide to deploy; no deployment has been performed.

1. Upload the source folder to a Git repository you control (exclude `node_modules`, `.ssr`, and local environment files).
2. In Vercel, import the repository. If this folder is inside a larger repository, choose `afterfault` as the root directory.
3. Set the framework to Vite, install command to `npm ci`, build command to `npm run build`, and output directory to `dist`.
4. Use Node.js 22.12+ or 24. No environment variables are required for the demo.
5. Keep review access private using the host's access protection. `noindex` discourages indexing; it does not restrict access.
6. Test `/`, `/brand`, `/privacy`, `/terms`, and a made-up path such as `/missing-page`. Vercel clean URLs serve the generated page directories; `404.html` supplies the unknown-page experience. Do not add a blanket SPA rewrite to the homepage.
7. Configure `afterfault.site` as the production domain when ready. All production canonical and social URLs already use `https://afterfault.site` without `www`.

For another static host, upload the contents of `dist`; enable directory index pages and use `404.html` for unknown URLs. `public/_headers` provides review indexing headers for hosts that support this format. Route behavior must be tested on the chosen host.

## Deploy on Cloudflare Pages

1. Push this repository to GitHub (`https://github.com/Abdurrahman-Sudais/afterfault.git`).
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select `Abdurrahman-Sudais/afterfault`.
4. Configure the build settings:
   - **Framework preset**: `Vite` (or `None`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
   - Node.js version is configured automatically via `.node-version` (`22`).
5. Click **Save and Deploy**. Cloudflare Pages will build the static prerendered HTML and automatically serve clean URLs, custom 404 (`404.html`), and custom headers (`_headers`).
6. Alternatively, deploy directly with Wrangler:
   ```bash
   npm run build
   npx wrangler pages deploy dist
   ```

## Switch indexing only for an intended public launch

1. In the source `index.html`, replace `<meta name="robots" content="noindex,nofollow">` with `<meta name="robots" content="index,follow">`.
2. Remove the review `X-Robots-Tag` header from `vercel.json` and `public/_headers` (or remove the now-unused `_headers` file).
3. Replace `public/robots.txt` with:

```text
User-agent: *
Allow: /
Sitemap: https://afterfault.site/sitemap.xml
```

4. Rebuild and deploy the new output. Confirm the host is no longer adding a review `noindex` header. Keep the unknown-page response as HTTP 404.
5. Resolve the policy/operator details listed in `HANDOVER.md` before a public launch.

## Interactive prototype (`/app`)

A full warranty-recovery workspace with fictional data. Use **Demo as** to switch person and role, and **Reset demo data** to restore the seed. The demo date (1 Oct 2026) drives the deadline checks, and an administrator can change it.

- **Warranty analyst** (Alex Morgan, Riya Desai): deadline-first dashboard; case list; **New case**; per case, *Assessment* (each rule check with its clause or record, plus parts and labour arithmetic), *Evidence* (request specific records from the technician), *AI suggestions* (confirm or dismiss clause exclusions, with quotes), *Claim* (prepare → approve, with a second analyst above $250 → record the supplier reference → record the outcome) and *Activity*. Exports a draft claim pack and activity CSV.
- **Field technician** (Tomas Reyes): sees only open requests and repair facts, never amounts. Adds the record (invoice total, or the serial visible in the photo), and the case re-assesses straight away.
- **Administrator** (Grace Bello): recovery totals, supplier terms editor (coverage, filing window, labour share and cap, required evidence), users and roles, policy (AI on/off, second-approval threshold, demo date), audit log with CSV export, permissions matrix.

Try this path: as Alex, open RF-1042 → Evidence → request the photo. Switch to Tomas → add it. Switch back to Alex → Claim → prepare → approve → record a reference → record the outcome. RF-1045 shows the AI gate and two-person approval.

**Real:** the rules engine (`src/app/engine.js`), permissions on every action, approval revocation when facts change, the audit log, exports and persistence. **Simulated:** document upload and extraction (values are typed), AI (a keyword rule with the Bedrock output shape) and sign-in (the role switch).

## Website additions

Prototype call to action, benefits (`#benefits`), use cases (`#use-cases`), safeguards (`#safeguards`), plans (`#pricing`: “Pricing on request”, with no invented prices) and FAQ (`#faq`). The header links Safeguards, Pricing and FAQ, and the CTA opens the prototype. The early-access form now asks for company type and monthly repair volume, with consent, an optional updates box and a honeypot.

## Backend starters (`backend/`, not deployed)

- `lambdas/assess_case`: the same rules in Python.
- `lambdas/suggest_exclusions`: Bedrock call with input minimisation and quote validation. It fails closed.
- `dynamodb/table.json`: the table definition.
- `tests/fixtures/cases.json`: fixtures shared by `src/app/engine.test.js` and `backend/tests/test_lambdas.py`.

Design docs: `docs/architecture.md`, `docs/safeguards.md`, `docs/crm-plan.md`.

## Files and behavior

- `src/App.jsx`: marketing, leadership, navigation, contact, legal, brand and 404 pages.
- `src/Demo.jsx`: case desk, documents, review notes, evidence and sample export.
- `src/cases.js`: fictional records, structured coverage assessment, and draft text generation for the home-page desk.
- `src/app/`: prototype (`engine.js` rules, `actions.js` permission-checked changes, `seed.js`, role views, `app.css`).
- `src/Sections.jsx`, `src/lead.js`: new home sections and lead-form logic.
- `src/style.css`: responsive styling, focus states and reduced-motion support.
- `public/brand`: editable SVG logos, PNG versions, icons and social image.
- `scripts/prerender.mjs`: creates static route HTML from the React server render.
- `scripts/export-assets.mjs`: regenerate PNG assets with `npm run assets` after editing SVGs.
- `scripts/standalone.mjs`: generate the offline preview one directory above this project, after building.
- `.env.example`: documents that this review build needs no environment configuration.

Sample desk changes on the home page remain in memory and disappear on reload or reset. The prototype at `/app` saves its fictional state in `localStorage` (key `afterfault-prototype-v1`) and has a reset button. There are no application cookies or tracking scripts. Evidence additions create simulated references only. Exports are labelled sample drafts and do not submit claims. By default the early-access form opens an email draft; visitors must send it themselves. Setting the HubSpot variables in `.env.example` makes it submit to HubSpot instead (see `docs/crm-plan.md`). Copy-message uses the clipboard with a selectable-text fallback. No form data is sent to a website backend.

Core branding is SVG and editable. The wordmark uses the local Arial/Helvetica sans-serif stack rather than a remotely loaded font. PNGs are supplied so the rendered wordmark is fixed when needed.

The marketing site's static hosting is separate from the proposed AWS SaaS architecture. Read `HANDOVER.md` before adding real processing or uploading real repair evidence.
