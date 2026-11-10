import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const outputDir = resolve(process.argv[2] ?? 'dist');
const parts = Array.from({ length: 8 }, (_, i) => `styles/responsive-${String(i + 1).padStart(2, '0')}.css`);
const css = (await Promise.all(parts.map((file) => readFile(resolve(file), 'utf8')))).join('');
for (const rule of ['@media (max-width: 760px)', '@media (max-width: 480px)', '#petals', 'overflow-x: auto']) {
  if (!css.includes(rule)) throw new Error(`Responsive stylesheet is missing: ${rule}`);
}
await writeFile(join(outputDir, 'responsive.css'), css);

for (const file of ['index.html', 'admin.html']) {
  const path = join(outputDir, file);
  let html = await readFile(path, 'utf8');
  if (!/<meta\s+[^>]*name=["']viewport["']/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, '<head$1><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
  }
  if (!/href=["']\/responsive\.css(?:\?[^"']*)?["']/i.test(html)) {
    if (!/<\/head>/i.test(html)) throw new Error(`${file}: missing closing head tag`);
    html = html.replace(/<\/head>/i, '  <link rel="stylesheet" href="/responsive.css?v=1">\n</head>');
  }
  await writeFile(path, html, 'utf8');
  console.log(`Applied responsive stylesheet to ${file}`);
}
