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

The build creates real HTML for `/`, `/brand`, `/privacy`, `/terms`, and `404.html`. The homepage HTML includes the headline, product explanation, and both founders before JavaScript runs. `dist` is included as a ready-built convenience copy; rebuild it after source edits.

## Run the supplied checks

```bash
npm run build
npm test
npm run test:ui
npm run preview:file
node scripts/artifact-check.mjs
```

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

## Files and behavior

- `src/App.jsx`: marketing, leadership, navigation, contact, legal, brand and 404 pages.
- `src/Demo.jsx`: case desk, documents, review notes, evidence and sample export.
- `src/cases.js`: fictional records, structured coverage assessment, and draft text generation.
- `src/style.css`: responsive styling, focus states and reduced-motion support.
- `public/brand`: editable SVG logos, PNG versions, icons and social image.
- `scripts/prerender.mjs`: creates static route HTML from the React server render.
- `scripts/export-assets.mjs`: regenerate PNG assets with `npm run assets` after editing SVGs.
- `scripts/standalone.mjs`: generate the offline preview one directory above this project, after building.
- `.env.example`: documents that this review build needs no environment configuration.

Sample desk changes remain in memory and disappear on reload or reset. There are no application cookies, tracking scripts or browser storage writes. Evidence additions create simulated references only. Exports are labelled sample drafts and do not submit claims. The early-access form opens an email draft; visitors must send it themselves. Copy-message uses the clipboard with a selectable-text fallback. No form data is sent to a website backend.

Core branding is SVG and editable. The wordmark uses the local Arial/Helvetica sans-serif stack rather than a remotely loaded font. PNGs are supplied so the rendered wordmark is fixed when needed.

The marketing site's static hosting is separate from the proposed AWS SaaS architecture. Read `HANDOVER.md` before adding real processing or uploading real repair evidence.
