# Sagar & Dhrupti · Wedding invitation

A multilingual (Gujarati, Hindi, Marathi, English) wedding card website with an admin console.

| Path | What it is |
| --- | --- |
| `site/index.html` | Public invitation: sealed-card opening, jharokha parallax hero, countdown, events, venue map, gallery, RSVP |
| `site/admin.html` | Admin console at `/admin`, Google sign-in |
| `site/config.js` | Supabase URL/publishable key, default ref and WhatsApp numbers (fallbacks; editable in admin) |
| `supabase/migrations/` | Database schema; run the newest file once in the Supabase SQL editor |

## Invite links (who invited whom)

Every family member gets their own link: `/?ref=CODE`. The code decides
- the line guests see in the hero (“Groom's side · Invited by Sagar's Mummy”),
- which side's events they see (groom-only, bride-only and shared events),
- whose WhatsApp receives the RSVP and the “Message us” button,
- and which dashboard the RSVP shows up in.

| Link | Side | Replies go to |
| --- | --- | --- |
| `/` or `/?ref=sags` | Groom | +91 73873 22548 |
| `/?ref=drups` | Bride | +91 88284 76929 |
| `/?ref=<code>` | Set per link | That person's WhatsApp |

Extra options: `&to=Ramesh%20Kaka` greets a guest by name, `&c=CODE` uses a guest invite code, `&lang=gu|hi|mr|en` picks the language.

## Roles (`/admin`, Google sign-in)

| Role | Can do |
| --- | --- |
| Super admin | Everything, including adding admins and other super admins |
| Admin | Edit the whole invitation (events, sections, text, gallery, couple & venue), all links and RSVPs, add family members |
| Family member | Create their own invite links, add guests, see RSVPs from their links, edit their profile |

## Run locally

```bash
cd site && python3 -m http.server 8080
# http://localhost:8080/?ref=drups  ·  http://localhost:8080/admin.html
node scripts/check-static-site.mjs
```

Vercel runs the checker, copies `site/` to `dist/` and serves it; `/admin` rewrites to `admin.html`.
The older Next.js scaffold in `src/` is not used in production and is kept only for CI.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the one-time Supabase and Google sign-in setup.
