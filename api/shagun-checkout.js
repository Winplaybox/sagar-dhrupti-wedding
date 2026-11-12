// POST /api/shagun-checkout
// Body: { side: 'groom'|'bride', amount: rupees, name, email?, message?, ref?, lang? }
// Creates a Dodo Payments checkout for that side's shagun product and returns { url }.
const { SIDES, dodo, paymentsConfig, send, readBody, clean } = require('./_dodo');

const MIN = 11, MAX = 500000;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
  try {
    const b = await readBody(req);
    const side = SIDES.includes(b.side) ? b.side : null;
    const amount = Math.round(Number(b.amount));
    const name = clean(b.name, 80);
    const email = clean(b.email, 160);
    if (!side) return send(res, 400, { error: 'Unknown side' });
    if (!Number.isFinite(amount) || amount < MIN || amount > MAX) return send(res, 400, { error: `Enter an amount between ₹${MIN} and ₹${MAX.toLocaleString('en-IN')}` });
    if (name.length < 2) return send(res, 400, { error: 'Add your name' });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res, 400, { error: 'Check the email address' });

    const conf = ((await paymentsConfig())[side]) || {};
    const productId = conf.dodo && conf.dodo.enabled && conf.dodo.product_id;
    if (!productId) return send(res, 503, { error: 'Online payment is not switched on for this side yet' });

    const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const ref = clean(b.ref, 32).toLowerCase().replace(/[^a-z0-9_-]/g, '') || (side === 'bride' ? 'drups' : 'sags');
    const back = `${origin}/?ref=${encodeURIComponent(ref)}&skip`;

    const session = await dodo(side, '/checkouts', {
      product_cart: [{ product_id: productId, quantity: 1, amount: amount * 100 }],
      ...(email ? { customer: { email, name } } : {}),
      return_url: `${back}&shagun=thanks#shagun`,
      cancel_url: `${back}#shagun`,
      metadata: { purpose: 'shagun', side, ref, guest_name: name, message: clean(b.message, 300), lang: clean(b.lang, 5) }
    });
    if (!session.checkout_url) return send(res, 502, { error: 'Payment page could not be created' });
    return send(res, 200, { url: session.checkout_url, session_id: session.session_id });
  } catch (err) {
    return send(res, err.status || 500, { error: err.message || 'Payment could not start' });
  }
};
