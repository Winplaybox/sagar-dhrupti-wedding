// Shared helpers for the shagun (blessing gift) payment functions.
// Files starting with "_" are not exposed as Vercel functions.
//
// Secrets live only in Vercel → Project → Settings → Environment Variables:
//   DODO_API_KEY_GROOM   Dodo key for the groom's side (money goes to that Dodo account)
//   DODO_API_KEY_BRIDE   Dodo key for the bride's side
//   DODO_API_KEY         fallback used by a side that has no key of its own
// Keys starting with dodo_test_ use the test host, dodo_live_ the live host.

const SUPABASE_URL = 'https://vpqlgywiqsgiqmczsjrn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rbd02f4NJLvuUpC9aPVFvA_04iDRKpd';
const SIDES = ['groom', 'bride'];

function dodoKey(side) {
  const own = side === 'bride' ? process.env.DODO_API_KEY_BRIDE : process.env.DODO_API_KEY_GROOM;
  return (own || process.env.DODO_API_KEY || '').trim();
}

function dodoHost(key) {
  return key.startsWith('dodo_test_') ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
}

async function dodo(side, path, body) {
  const key = dodoKey(side);
  if (!key) {
    const err = new Error(`Online payments are not set up for the ${side}'s side yet.`);
    err.status = 503;
    throw err;
  }
  const r = await fetch(dodoHost(key) + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!r.ok) {
    const err = new Error((data && (data.message || data.error || data.code)) || `Dodo Payments error ${r.status}`);
    err.status = r.status >= 500 ? 502 : 400;
    throw err;
  }
  return data;
}

// Public site settings (payments config is is_public = true, so the publishable key can read it).
async function paymentsConfig() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?setting_key=eq.payments&select=value`, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
  });
  const rows = r.ok ? await r.json() : [];
  return (rows[0] && rows[0].value) || {};
}

// Confirms the caller is a signed-in admin by asking Supabase with the caller's own token.
async function requireAdmin(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { const e = new Error('Sign in again and retry.'); e.status = 401; throw e; }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_access`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: '{}'
  });
  const rows = r.ok ? await r.json() : [];
  const role = Array.isArray(rows) && rows[0] && rows[0].role;
  if (role !== 'admin' && role !== 'super_admin') { const e = new Error('Only admins can do this.'); e.status = 403; throw e; }
  return rows[0];
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

module.exports = { SIDES, dodo, dodoKey, paymentsConfig, requireAdmin, send, readBody, clean };
