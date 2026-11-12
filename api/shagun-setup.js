// POST /api/shagun-setup   (admins only; Authorization: Bearer <Supabase access token>)
// Body: { side: 'groom'|'bride', action: 'status' | 'create', min?: rupees, suggested?: rupees }
// status → tells whether a Dodo key is configured for that side (never returns the key)
// create → creates a pay-what-you-want "Shagun" product in that side's Dodo account and returns its id
const { SIDES, dodo, dodoKey, requireAdmin, send, readBody } = require('./_dodo');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
  try {
    await requireAdmin(req);
    const b = await readBody(req);
    const side = SIDES.includes(b.side) ? b.side : null;
    if (!side) return send(res, 400, { error: 'Unknown side' });

    const key = dodoKey(side);
    if (b.action === 'status') {
      return send(res, 200, {
        configured: Boolean(key),
        mode: key ? (key.startsWith('dodo_test_') ? 'test' : 'live') : null,
        source: side === 'bride' ? (process.env.DODO_API_KEY_BRIDE ? 'DODO_API_KEY_BRIDE' : key ? 'DODO_API_KEY' : null)
                                 : (process.env.DODO_API_KEY_GROOM ? 'DODO_API_KEY_GROOM' : key ? 'DODO_API_KEY' : null)
      });
    }

    const min = Math.max(1, Math.round(Number(b.min) || 11));
    const suggested = Math.max(min, Math.round(Number(b.suggested) || 1101));
    const product = await dodo(side, '/products', {
      name: side === 'bride' ? "Shagun for Dhrupti's family" : "Shagun for Sagar's family",
      description: 'Blessing gift (shagun) for the wedding of Sagar & Dhrupti, 2 February 2027.',
      tax_category: 'digital_products',
      price: {
        type: 'one_time_price', currency: 'INR', price: min * 100, discount: 0,
        pay_what_you_want: true, suggested_price: suggested * 100,
        purchasing_power_parity: false, tax_inclusive: true
      },
      metadata: { purpose: 'shagun', side }
    });
    if (!product.product_id) return send(res, 502, { error: 'Dodo did not return a product id' });
    return send(res, 200, { product_id: product.product_id });
  } catch (err) {
    return send(res, err.status || 500, { error: err.message || 'Setup failed' });
  }
};
