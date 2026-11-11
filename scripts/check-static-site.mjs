import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Script } from 'node:vm';

const unpackDir = mkdtempSync(join(tmpdir(), 'wedding-site-'));
try {
  execFileSync('unzip', ['-q', 'wedding-site-source.zip', '-d', unpackDir]);
  for (const file of ['index.html', 'admin.html']) {
    const html = readFileSync(join(unpackDir, file), 'utf8');
    if (!html.toLowerCase().includes('<!doctype html>')) throw new Error(file + ': missing HTML doctype');
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1])
      .filter((source) => source.trim());
    for (const [index, source] of scripts.entries()) {
      new Script(source, { filename: file + '#inline-' + (index + 1) });
    }
    console.log('Validated ' + file + ': ' + scripts.length + ' inline script(s)');
  }
  const publicHtml = readFileSync(join(unpackDir, 'index.html'), 'utf8');
  for (const required of ['name="whatsapp_consent"', 'name="email"', 'name="dietary_notes"', 'submit-rsvp']) {
    if (!publicHtml.includes(required)) throw new Error('index.html: missing ' + required);
  }
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  if (vercel.outputDirectory !== 'dist' || !vercel.buildCommand.includes('wedding-site-source.zip') || !vercel.buildCommand.includes('scripts/apply-responsive-fixes.mjs')) {
    throw new Error('vercel.json: static ZIP build configuration is missing');
  }
  if (!vercel.rewrites?.some((rule) => rule.source === '/admin' && rule.destination === '/admin.html')) {
    throw new Error('vercel.json: missing /admin rewrite');
  }
  execFileSync(process.execPath, ['scripts/check-responsive.mjs']);
  console.log('Static archive, RSVP fields, responsive layout and Vercel configuration are valid.');
} finally {
  rmSync(unpackDir, { recursive: true, force: true });
}