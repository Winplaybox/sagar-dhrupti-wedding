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

/* ───────── Design themes ─────────
 * Admins pick one per side (Design tab) and can override any colour.
 * Stored in site_settings.theme = { groom: {preset, font, colors}, bride: {...} }. */
window.WEDDING.themes = {
  kankotri: { name: 'Kankotri', note: 'Kumkum red, haldi gold, gulabi paper', font: 'rozha',
    colors: { primary: '#b3122e', primaryDeep: '#7d0a20', accent: '#f2b705', dark: '#3b0918', paper: '#fce6e3', paper2: '#f8d3cf', ink: '#2a0610', muted: '#5a2330', hero: '#e3342f', leaf: '#1f6b4f' } },
  vanam: { name: 'Vanam', note: 'Forest green, temple gold, ivory', font: 'cormorant',
    colors: { primary: '#1f5139', primaryDeep: '#123422', accent: '#d4af5a', dark: '#0e2a1d', paper: '#f8f2e2', paper2: '#efe4c6', ink: '#16261c', muted: '#4d5e52', hero: '#2f6b4c', leaf: '#8a6d1f' } },
  gulab: { name: 'Gulab', note: 'Blush, wine and rose', font: 'script',
    colors: { primary: '#9b1b4f', primaryDeep: '#6b0f36', accent: '#f3bfd0', dark: '#4a0f2e', paper: '#fbf1f5', paper2: '#f3e0ea', ink: '#3a0f24', muted: '#7a4a60', hero: '#c2416f', leaf: '#5f7a52' } },
  neelam: { name: 'Neelam', note: 'Royal blue and gold', font: 'rozha',
    colors: { primary: '#22408f', primaryDeep: '#15295e', accent: '#e9b949', dark: '#0d1a40', paper: '#eef2fa', paper2: '#dde5f4', ink: '#0f1a36', muted: '#46557a', hero: '#3558b8', leaf: '#1f6b4f' } }
};
window.WEDDING.fonts = {
  rozha: { name: 'Rozha One (bold Indian)', family: "'Rozha One','Noto Serif Devanagari',serif", weight: 400, style: 'normal' },
  cormorant: { name: 'Cormorant italic (elegant)', family: "'Cormorant Garamond','Noto Serif Gujarati',serif", weight: 600, style: 'italic' },
  script: { name: 'Great Vibes (script)', family: "'Great Vibes','Noto Serif Gujarati',cursive", weight: 400, style: 'normal' }
};
window.WEDDING.defaultTheme = { groom: { preset: 'kankotri' }, bride: { preset: 'kankotri' } };
/* CSS custom properties for one side's theme setting. */
window.WEDDING.themeVars = function (conf) {
  const W = window.WEDDING, t = W.themes[(conf && conf.preset)] || W.themes.kankotri;
  const c = Object.assign({}, t.colors, (conf && conf.colors) || {});
  const f = W.fonts[(conf && conf.font) || t.font] || W.fonts.rozha;
  return { '--sindoor': c.primary, '--sindoor-deep': c.primaryDeep, '--haldi': c.accent, '--night': c.dark,
    '--gulabi': c.paper, '--gulabi-2': c.paper2, '--ink': c.ink, '--muted': c.muted, '--hero': c.hero, '--paan': c.leaf,
    '--display': f.family, '--display-weight': String(f.weight), '--display-style': f.style };
};
