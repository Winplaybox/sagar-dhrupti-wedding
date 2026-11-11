# Sagar & Dhrupti · Wedding invitation

A multilingual (Gujarati, Hindi, Marathi, English) wedding card website with an admin console.

| Path | What it is |
| --- | --- |
| `site/index.html` | Public invitation: sealed-card opening, jharokha parallax hero, countdown, events, venue map, gallery, RSVP |
| `site/admin.html` | Admin console at `/admin`, Google sign-in |
| `site/config.js` | Supabase URL/publishable key, default ref and WhatsApp numbers (fallbacks; editable in admin) |
| `supabase/migrations/` | Database schema; run the newest file once in the Supabase SQL editor |

## Ref links

| Link | Side | RSVP replies go to |
| --- | --- | --- |
| `/` or `/?ref=sags` | Groom's side | WhatsApp +91 73873 22548 |
| `/?ref=drups` | Bride's side | WhatsApp +91 88284 76929 |

The ref decides whose WhatsApp receives the RSVP and the floating “Message us” button, which family is named first, and is saved with the RSVP so the admin can filter by side.
Extra URL options: `&to=Ramesh%20Kaka` greets a guest by name, `&c=CODE` uses a guest invite code from the admin, `&lang=gu|hi|mr|en` picks the language.

## Run locally

```bash
cd site && python3 -m http.server 8080
# http://localhost:8080/?ref=drups  ·  http://localhost:8080/admin.html
node scripts/check-static-site.mjs
```

Vercel runs the checker, copies `site/` to `dist/` and serves it; `/admin` rewrites to `admin.html`.
The older Next.js scaffold in `src/` is not used in production and is kept only for CI.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the one-time Supabase and Google sign-in setup.
