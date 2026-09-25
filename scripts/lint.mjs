import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const errors = [];
for (const name of await readdir('src')) {
  const source = await readFile(`src/${name}`, 'utf8');
  if (/\bdebugger\s*;/.test(source)) errors.push(`${name}: debugger`);
  if (/[ \t]+$/m.test(source)) errors.push(`${name}: trailing whitespace`);
  if (name !== 'cli.ts' && /from ['"]node:|\bprocess\.|\bBuffer\b/.test(source)) errors.push(`${name}: Node API trong core`);
}
for (const name of ['dist/index.js', 'dist/index.cjs', 'dist/browser.js', 'dist/cli.js']) {
  const checked = spawnSync(process.execPath, ['--check', name], { encoding: 'utf8' });
  if (checked.status !== 0) errors.push(checked.stderr);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Lint cơ bản và cú pháp 4 bản build: pass.');
