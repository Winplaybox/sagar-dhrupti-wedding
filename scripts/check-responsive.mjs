import { readFileSync } from 'node:fs';
const css = Array.from({ length: 8 }, (_, i) => readFileSync(`styles/responsive-${String(i + 1).padStart(2, '0')}.css`, 'utf8')).join('');
for (const rule of ['@media (max-width: 760px)', '@media (max-width: 480px)', '#petals', '#main .sm table', 'overflow-x: auto']) {
  if (!css.includes(rule)) throw new Error(`Responsive layout check failed: ${rule}`);
}
console.log('Responsive CSS and mobile/tablet breakpoints validated.');
