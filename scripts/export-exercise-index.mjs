// Writes exercise-index.csv: every built-in exercise with its id, names, type, groups and CURRENT media.
// This is the key sheet for the media-mapping file (match rows by `id`), and the "table of every
// exercise with its media link" — blank url = "no media yet".
//   node scripts/export-exercise-index.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const { builtinLibrary } = await vite.ssrLoadModule('/src/data/library.js');
const { exerciseIndexCsv } = await vite.ssrLoadModule('/src/lib/mediaImport.js');
const list = builtinLibrary();
fs.writeFileSync(path.join(root, 'exercise-index.csv'), exerciseIndexCsv(list) + '\n');
const missing = list.filter((e) => !e.media?.url);
console.log(`exercise-index.csv: ${list.length} exercises, ${list.length - missing.length} with media, ${missing.length} without (“no media yet”).`);
await vite.close();
