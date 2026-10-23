#!/usr/bin/env node
// Install a packed tarball into an empty project the way a consumer would, then use both the
// library API and the CLI. Usage: node scripts/packaging-smoke.mjs out/theqrl-hypc-<version>.tgz
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const tgz = resolve(process.argv[2] || '');
const dir = mkdtempSync(join(tmpdir(), 'hypc-smoke-'));
const run = (cmd, args) => execFileSync(cmd, args, { cwd: dir, encoding: 'utf8' });
try {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'smoke', private: true }));
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tgz]);
  const version = run(process.execPath, ['-e', "process.stdout.write(require('@theqrl/hypc').version())"]);
  console.log(`ok   require('@theqrl/hypc').version() = ${version}`);
  const input = { language: 'Hyperion', sources: { 'a.hyp': { content: 'contract A { function f() public pure returns (uint) { return 1; } }' } }, settings: { outputSelection: { '*': { '*': ['qrvm.bytecode.object'] } } } };
  const output = JSON.parse(run(process.execPath, ['-e', `process.stdout.write(require('@theqrl/hypc').compile(${JSON.stringify(JSON.stringify(input))}))`]));
  const errors = (output.errors || []).filter((e) => e.severity === 'error');
  if (errors.length || !output.contracts?.['a.hyp']?.A?.qrvm?.bytecode?.object) throw new Error(`library compile failed: ${JSON.stringify(errors)}`);
  console.log('ok   library compile() produced bytecode');
  writeFileSync(join(dir, 'b.hyp'), 'contract B { function g() public pure returns (uint) { return 2; } }\n');
  run(join(dir, 'node_modules', '.bin', 'hypcjs'), ['--bin', '-o', 'build', 'b.hyp']);
  const outFiles = readdirSync(join(dir, 'build'));
  if (!outFiles.some((f) => f.endsWith('.bin'))) throw new Error(`CLI produced no .bin: ${outFiles}`);
  console.log(`ok   hypcjs --bin wrote ${outFiles.join(', ')}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
