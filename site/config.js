/* Shared configuration for the public invitation and the admin console.
 * Values here are fallbacks: the admin console can override couple, venue and
 * ref numbers through public.site_settings (keys: couple, venue, refs).
 * The publishable key is browser-safe; data is protected by Row Level Security. */
window.WEDDING = {
  supabaseUrl: 'https://vpqlgywiqsgiqmczsjrn.supabase.co',
  supabaseKey: 'sb_publishable_rbd02f4NJLvuUpC9aPVFvA_04iDRKpd',

  /* ?ref=CODE decides who invited the guest, which side they belong to and whose
   * WhatsApp receives the RSVP. Family members' links live in public.referrers;
   * these two are the built-in fallbacks. A missing or unknown ref uses defaultRef. */
  defaultRef: 'sags',
  refs: {
    sags: { display_name: 'Sagar', relation: 'groom', side: 'groom', whatsapp: '917387322548' },
    drups: { display_name: 'Dhrupti', relation: 'bride', side: 'bride', whatsapp: '918828476929' }
  },

  couple: { groom: 'Sagar', bride: 'Dhrupti', wedding_date: '2027-02-02' },
  venue: {
    name: 'Arya Samaj, Goregaon West',
    address: 'No. 15, Mandir Marg, Arya Samaj, 228, Jawahar Nagar Rd, Jawahar Nagar, Goregaon West, Mumbai, Maharashtra 400104',
    maps_url: 'https://maps.app.goo.gl/VW8QESZdue5Ez8xu8'
  },
  events: [
    { id: null, slug: 'groom-vastu', event_type: 'vastu', audience: 'groom', event_date: '2026-12-25', title: { en: 'Vastu Puja', gu: 'વાસ્તુ પૂજન', hi: 'वास्तु पूजन', mr: 'वास्तु पूजन' } },
    { id: null, slug: 'groom-haldi', event_type: 'haldi', audience: 'groom', event_date: '2027-02-01', title: { en: 'Haldi', gu: 'પીઠી', hi: 'हल्दी', mr: 'हळद' } },
    { id: null, slug: 'wedding-ceremony', event_type: 'wedding', audience: 'both', event_date: '2027-02-02', title: { en: 'Wedding & Pheras', gu: 'લગ્ન અને ફેરા', hi: 'विवाह एवं फेरे', mr: 'विवाह आणि फेरे' } },
    { id: null, slug: 'reception', event_type: 'reception', audience: 'both', event_date: '2027-02-02', title: { en: 'Reception', gu: 'સ્વાગત સમારંભ', hi: 'स्वागत समारोह', mr: 'स्वागत समारंभ' } }
  ],

  /* Built-in sections and their default order. Admins can reorder or hide them and
   * add custom sections in between (public.site_sections, sort_order). */
  layout: { couple: 10, countdown: 20, events: 30, venue: 40, gallery: 50, rsvp: 60 }
};

/* Normalise a ref code from a URL or record. Unknown codes fall back to the default. */
/* Friendly aliases: ?ref=groom works like ?ref=sags, ?ref=bride like ?ref=drups. */
window.WEDDING.aliases = { groom: 'sags', bride: 'drups' };
window.WEDDING.aliasRef = function (code) {
  const c = String(code || '').trim().toLowerCase();
  return window.WEDDING.aliases[c] || c;
};
window.WEDDING.resolveRef = function (code, refs) {
  const all = refs || window.WEDDING.refs;
  const c = window.WEDDING.aliasRef(code);
  return all[c] ? c : window.WEDDING.defaultRef;
};
window.WEDDING.normalizeCode = function (code) {
  return String(code || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
};
