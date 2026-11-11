# Sagar & Dhrupti Wedding Website

The production website is the multilingual static invitation and private admin console supplied in `wedding-site-source.zip`. Vercel extracts the two HTML entry points into `dist/` and serves that static output. The original Next.js implementation remains in the repository as a development/build baseline and continues to be checked by GitHub Actions.

## Production website

- `wedding-site-source.zip` contains `index.html` and `admin.html` for the public invitation and admin console.
- Public invitation: Gujarati, Hindi, English and Marathi; countdown, events, venue, gallery and RSVP.
- Admin console: events, guest lists/invite links, RSVP records and CSV export, settings, gallery, content pages and role-managed admins.
- Supabase Edge Function: existing `submit-rsvp` endpoint.
- Vercel build: extracts the archive into `dist/`, then applies `styles/responsive-*.css` to both pages; `/admin` rewrites to the admin page.
- Responsive layout: public invitation and admin console are tuned for phone, tablet and desktop widths; admin data tables scroll inside their own containers on small screens.

## Local development and validation

```bash
npm install
npm run dev
node scripts/check-static-site.mjs
node scripts/check-responsive.mjs
```

To update the production site, update the two HTML files, rebuild `wedding-site-source.zip` with those files at the archive root, and commit the archive. The CI verifier parses the inline JavaScript, checks required RSVP fields and Vercel routing, and validates the responsive breakpoints. The responsive styles are applied after ZIP extraction so the archive remains the canonical invitation content.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for hosting, Supabase and first-admin setup. Never commit Supabase service-role keys or other secrets. The Supabase publishable key embedded in the static site is browser-safe by design.
