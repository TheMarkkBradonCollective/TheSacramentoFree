#!/usr/bin/env node
/**
 * Convert a Supabase SQL Editor CSV export into Play Console tester upload format.
 *
 * Play Console wants one email per line, no header, no commas, UTF-8 without BOM.
 *
 * Usage:
 *   node scripts/convert-to-play-testers-csv.mjs ~/Downloads/supabase-export.csv
 *   node scripts/convert-to-play-testers-csv.mjs ~/Downloads/supabase-export.csv exports/play-testers.csv
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = process.argv[2];
const outputPath = process.argv[3] || join(root, 'exports', 'play-testers.csv');

if (!inputPath) {
  console.error('Usage: node scripts/convert-to-play-testers-csv.mjs <downloaded.csv> [output.csv]');
  process.exit(1);
}

function parseEmails(raw) {
  const text = readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const emails = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^email$/i.test(trimmed)) continue;

    // Supabase "Download CSV" is usually one column or "email" header + values.
    const firstCell = trimmed.split(',')[0]?.trim().replace(/^"|"$/g, '');
    if (!firstCell || !firstCell.includes('@')) continue;
    emails.push(firstCell.toLowerCase());
  }

  return [...new Set(emails)].sort();
}

const emails = parseEmails(inputPath);
if (emails.length === 0) {
  console.error(`No emails found in ${inputPath}`);
  process.exit(1);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${emails.join('\n')}\n`, 'utf8');

console.log(`Wrote ${emails.length} emails → ${outputPath}`);
console.log('Upload at Play Console → Testing → Closed testing → Testers → Upload CSV.');
if (emails.length > 100) {
  console.log('Use Closed testing (up to 2,000/list). Internal testing allows only 100.');
}
