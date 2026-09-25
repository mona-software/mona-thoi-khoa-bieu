import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const modules = ['types', 'validation', 'score', 'engine', 'csv', 'export'];
const publicNames = ['xepThoiKhoaBieu', 'checkHardConstraints', 'InputError', 'validateInput', 'DEFAULT_CALENDAR', 'parseCsv', 'inputFromCsv', 'encodeCsv', 'toCsv', 'toHtml', 'scoreTimetable', 'DEFAULT_WEIGHTS'];
await mkdir('dist/types', { recursive: true });
let esbuild;
try { esbuild = await import('esbuild'); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
if (esbuild) {
  const checked = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--emitDeclarationOnly'], { stdio: 'inherit' });
  if (checked.status !== 0) process.exit(checked.status ?? 1);
  await Promise.all([
    esbuild.build({ entryPoints: ['src/index.ts'], outfile: 'dist/index.js', bundle: true, platform: 'neutral', format: 'esm', target: 'es2020' }),
    esbuild.build({ entryPoints: ['src/index.ts'], outfile: 'dist/index.cjs', bundle: true, platform: 'neutral', format: 'cjs', target: 'es2020' }),
    esbuild.build({ entryPoints: ['src/index.ts'], outfile: 'dist/browser.js', bundle: true, platform: 'browser', format: 'iife', globalName: 'MonaThoiKhoaBieu', target: 'es2020' }),
    esbuild.build({ entryPoints: ['src/cli.ts'], outfile: 'dist/cli.js', bundle: true, platform: 'node', format: 'esm', target: 'node18', banner: { js: '#!/usr/bin/env node' } }),
  ]);
  console.log('Build ESM + CJS + browser IIFE + CLI; TypeScript declarations checked.');
} else {
  // Offline bootstrap for Node >=22.13; published bundles still target Node >=18.
  const { stripTypeScriptTypes } = await import('node:module');
  if (!stripTypeScriptTypes) throw new Error('Build cần npm install hoặc Node >=22.13 để bootstrap offline.');
  let combined = '';
  for (const name of modules) {
    const source = await readFile(`src/${name}.ts`, 'utf8');
    const compiled = stripTypeScriptTypes(source, { mode: 'strip' })
      .replace(/^import[^\n]+from '\.\/[^']+';\s*$/gm, '')
      .replace(/^export (?=(?:function|class|const|async function)\b)/gm, '');
    combined += `\n// src/${name}.ts\n${compiled}\n`;
  }
  await Promise.all([
    writeFile('dist/index.js', combined + `\nexport { ${publicNames.join(', ')} };\n`),
    writeFile('dist/index.cjs', `'use strict';\n${combined}\nmodule.exports = { ${publicNames.join(', ')} };\n`),
    writeFile('dist/browser.js', `var MonaThoiKhoaBieu = (() => {\n'use strict';\n${combined}\nreturn { ${publicNames.join(', ')} };\n})();\n`),
    writeFile('dist/cli.js', '#!/usr/bin/env node\n' + stripTypeScriptTypes(await readFile('src/cli.ts', 'utf8'), { mode: 'strip' }).replace("from './index'", "from './index.js'")),
    writeFile('dist/types/types.d.ts', await readFile('src/types.ts', 'utf8')),
    writeFile('dist/types/index.d.ts', await readFile('src/offline-api.d.ts', 'utf8')),
  ]);
  console.log('Build ESM + CJS + browser IIFE + CLI (offline Node TypeScript stripping; run npm install + npm run typecheck for type checking).');
}
await chmod('dist/cli.js', 0o755);
