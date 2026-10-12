// The MCP server runs in plain Node and can't import the browser-side library (extensionless imports),
// so this writes a compact id/name/defaults index of the built-in exercises for it to match names against.
//   node scripts/build-server-index.mjs      (tests/mcp.test.js fails if the file is stale)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const { builtinLibrary } = await vite.ssrLoadModule('/src/data/library.js');
const index = builtinLibrary().map((e) => ({
  id: e.id, name: e.name, type: e.type, sets: e.sets, reps: e.reps, seconds: e.seconds, rest: e.rest,
  countdown: e.countdown ?? null, perSide: !!e.perSide, primary: e.primary, secondary: e.secondary, groups: e.groups,
}));
fs.writeFileSync(path.join(root, 'server', 'exerciseIndex.generated.json'), JSON.stringify(index));
console.log(`server/exerciseIndex.generated.json: ${index.length} exercises`);
await vite.close();
