/* Shared configuration for the public invitation and the admin console.
 * Values here are fallbacks: the admin console can override couple, venue and
 * ref numbers through public.site_settings (keys: couple, venue, refs).
 * The publishable key is browser-safe; data is protected by Row Level Security. */
window.WEDDING = {
  supabaseUrl: 'https://vpqlgywiqsgiqmczsjrn.supabase.co',
  supabaseKey: 'sb_publishable_rbd02f4NJLvuUpC9aPVFvA_04iDRKpd',

  /* ?ref=sags (default) or ?ref=drups decides whose WhatsApp receives messages. */
  defaultRef: 'sags',
  refs: {
    sags: { label: "Sagar's side", side: 'groom', whatsapp: '917387322548' },
    drups: { label: "Dhrupti's side", side: 'bride', whatsapp: '918828476929' }
  },

  couple: { groom: 'Sagar', bride: 'Dhrupti', wedding_date: '2027-02-02' },
  venue: {
    name: 'Arya Samaj, Goregaon West',
    address: 'No. 15, Mandir Marg, Arya Samaj, 228, Jawahar Nagar Rd, Jawahar Nagar, Goregaon West, Mumbai, Maharashtra 400104',
    maps_url: 'https://maps.app.goo.gl/VW8QESZdue5Ez8xu8'
  },
  events: [
    { id: null, slug: 'wedding-ceremony', event_date: '2027-02-02', title: { en: 'Wedding & Pheras', gu: 'લગ્ન અને ફેરા', hi: 'विवाह एवं फेरे', mr: 'विवाह आणि फेरे' } },
    { id: null, slug: 'reception', event_date: '2027-02-02', title: { en: 'Reception', gu: 'સ્વાગત સમારંભ', hi: 'स्वागत समारोह', mr: 'स्वागत समारंभ' } }
  ]
};

/* Normalise a ref code from a URL or record. Unknown codes fall back to the default. */
window.WEDDING.resolveRef = function (code, refs) {
  const all = refs || window.WEDDING.refs;
  const c = String(code || '').trim().toLowerCase();
  return all[c] ? c : window.WEDDING.defaultRef;
};
