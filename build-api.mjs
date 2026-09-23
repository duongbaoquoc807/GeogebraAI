// Build script: bundle API serverless functions with esbuild
// This resolves the ESM-only @google/genai package issue on Vercel's ncc bundler
import { build } from 'esbuild';
import { readdirSync, mkdirSync, rmSync } from 'fs';

const API_SRC = './api-src';
const API_OUT = './api';

// Get all .ts files in api-src (excluding _ prefixed)
const entries = readdirSync(API_SRC)
  .filter(f => f.endsWith('.ts') && !f.startsWith('_'))
  .map(f => `${API_SRC}/${f}`);

console.log('[build-api] Building:', entries.map(e => e.split('/').pop()));

await build({
  entryPoints: entries,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: API_OUT,
  outExtension: { '.js': '.js' },
  packages: 'external',  // Don't bundle node_modules (Vercel installs them)
  sourcemap: false,
  minify: false,
});

console.log('[build-api] Done! Output:', API_OUT);
