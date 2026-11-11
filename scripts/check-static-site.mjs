// Validates the static production site in site/ before Vercel publishes it.
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const fail = (msg) => { console.error('✗ ' + msg); process.exit(1); };
const read = (f) => readFileSync(new URL('../site/' + f, import.meta.url), 'utf8');

new Script(read('config.js'), { filename: 'config.js' });
const ctx = { window: {} };
new Script(read('config.js')).runInNewContext(ctx);
const W = ctx.window.WEDDING;
if (W.defaultRef !== 'sags') fail('config.js: default ref must be sags');
if (!W.layout || W.layout.rsvp !== 60) fail('config.js: layout defaults missing');
if (W.refs.sags?.whatsapp !== '917387322548') fail('config.js: sags WhatsApp number changed');
if (W.refs.drups?.whatsapp !== '918828476929') fail('config.js: drups WhatsApp number changed');
if (W.resolveRef('DRUPS') !== 'drups' || W.resolveRef('') !== 'sags' || W.resolveRef('xyz') !== 'sags') fail('config.js: resolveRef fallback broken');

for (const file of ['index.html', 'admin.html']) {
  const html = read(file);
  if (!/^<!doctype html>/i.test(html)) fail(file + ': missing doctype');
  if (!/name="viewport"/.test(html)) fail(file + ': missing viewport meta');
  if (!html.includes('src="/config.js"')) fail(file + ': must load /config.js');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).filter((s) => s.trim());
  scripts.forEach((src, i) => new Script(src, { filename: `${file}#inline-${i + 1}` }));
  console.log(`✓ ${file}: ${scripts.length} inline script(s) parse`);
}

const index = read('index.html');
for (const needle of ['name="guest_name"', 'name="whatsapp_consent"', 'name="email"', 'name="dietary_notes"', 'submit_rsvp_v2', 'submit-rsvp', 'get_referrer', 'site_sections', 'invited_by', 'wa.me', "qs.get('ref')", '@media (min-width:760px)', 'prefers-reduced-motion']) {
  if (!index.includes(needle)) fail('index.html: missing ' + needle);
}
const admin = read('admin.html');
for (const needle of ["provider: 'google'", 'claim_access', "from('members')", "from('referrers')", 'site_sections', '@media (max-width:900px)']) {
  if (!admin.includes(needle)) fail('admin.html: missing ' + needle);
}
if (/service_role|sb_secret_/i.test(index + admin + read('config.js'))) fail('A secret key appears in the site files');

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
if (vercel.outputDirectory !== 'dist' || !vercel.buildCommand.includes('cp -r site dist')) fail('vercel.json: build must copy site/ to dist/');
if (!vercel.rewrites?.some((r) => r.source === '/admin' && r.destination === '/admin.html')) fail('vercel.json: missing /admin rewrite');
console.log('✓ Static site, ref routing, Google admin login and Vercel config are valid.');
