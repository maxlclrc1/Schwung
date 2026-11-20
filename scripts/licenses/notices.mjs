/*
 * Open-source notices: the copyright and licence notices of everything the iOS app ships, shown offline in
 * Settings → About → Open Source Licences (src/app/licenses.tsx) and written to THIRD_PARTY_NOTICES.md.
 *
 *   node scripts/licenses/notices.mjs           regenerate src/legal/notices.json and THIRD_PARTY_NOTICES.md
 *   node scripts/licenses/notices.mjs --check   fail if they don't match what a production build ships
 *
 * What ships is read from the build itself, not from package.json:
 *   - JavaScript: every package in the production iOS bundle (its source map);
 *   - native: every module autolinked into the iOS app (Expo modules and React Native packages);
 *   - outside node_modules: the CocoaPods those modules pull in and the icon fonts (scripts/licenses/native.json,
 *     with each project's licence file in scripts/licenses/upstream/). The check also fails if the build bundles
 *     an icon font that isn't listed there.
 * Each package's own LICENSE (and NOTICE) file is used; a package without one uses its repository's
 * (native.json "packages").
 */
import { execFileSync } from 'child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const HERE = join(ROOT, 'scripts/licenses');
const OUT_JSON = join(ROOT, 'src/legal/notices.json');
const OUT_MD = join(ROOT, 'THIRD_PARTY_NOTICES.md');
const check = process.argv.includes('--check');
const config = JSON.parse(readFileSync(join(HERE, 'native.json'), 'utf8'));
const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1 << 28,
  }).toString();

// --- What ships ---
const tmp = mkdtempSync(join(tmpdir(), 'schwung-notices-'));
let bundled;
let fonts;
try {
  run('npx', ['expo', 'export', '--platform', 'ios', '--source-maps', '--output-dir', tmp], {
    EXPO_PUBLIC_SCHWUNG_CHANNEL: 'production',
  });
  const dir = join(tmp, '_expo/static/js/ios');
  const map = JSON.parse(
    readFileSync(
      join(
        dir,
        readdirSync(dir).find((f) => f.endsWith('.map')),
      ),
      'utf8',
    ),
  );
  bundled = new Set();
  for (const s of map.sources) {
    const i = s.lastIndexOf('node_modules/');
    if (i < 0) continue;
    const parts = s.slice(i + 'node_modules/'.length).split('/');
    bundled.add(parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]);
  }
  const meta = JSON.parse(readFileSync(join(tmp, 'metadata.json'), 'utf8'));
  fonts = meta.fileMetadata.ios.assets.filter((a) => a.ext === 'ttf').length;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
const expoModules = JSON.parse(run('npx', ['expo-modules-autolinking', 'resolve', '--platform', 'apple', '--json']));
const community = JSON.parse(
  run('npx', ['expo-modules-autolinking', 'react-native-config', '--platform', 'ios', '--json']),
);
const linked = [...expoModules.modules.map((m) => m.packageName), ...Object.keys(community.dependencies ?? {})];
const names = [...new Set([...bundled, ...linked])].sort();

// --- Their notices ---
const dirOf = (name) =>
  [
    `node_modules/${name}`,
    `node_modules/expo/node_modules/${name}`,
    `node_modules/expo-router/node_modules/${name}`,
    `node_modules/react-native/node_modules/${name}`,
  ]
    .map((d) => join(ROOT, d))
    .find((d) => existsSync(join(d, 'package.json')));
const fileIn = (dir, re) => {
  const f = readdirSync(dir).find((x) => re.test(x));
  return f ? readFileSync(join(dir, f), 'utf8').trim() : null;
};
const LICENSE = /^(licen[cs]e|copying)(\.(md|txt))?$/i;
const NOTICE = /^notice(\.(md|txt))?$/i;
const upstream = (file) => readFileSync(join(HERE, 'upstream', `${file}.txt`), 'utf8').trim();

const problems = [];
const entries = [];
for (const name of names) {
  const dir = dirOf(name);
  if (!dir) {
    problems.push(`${name}: not installed`);
    continue;
  }
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  let text = fileIn(dir, LICENSE);
  if (!text) {
    const from = config.packages[name];
    const fromDir = from && dirOf(from);
    text =
      (fromDir && fileIn(fromDir, LICENSE)) ||
      (from && existsSync(join(HERE, 'upstream', `${from}.txt`)) ? upstream(from) : null);
  }
  if (!text) {
    problems.push(`${name}: no licence file (add it to scripts/licenses/native.json "packages")`);
    continue;
  }
  const notice = fileIn(dir, NOTICE);
  entries.push({
    name,
    version: pkg.version,
    license: typeof pkg.license === 'string' ? pkg.license : 'See text',
    text: notice ? `${text}\n\n${notice}` : text,
  });
}
for (const n of config.native) {
  entries.push({
    name: n.name,
    ...(n.version ? { version: n.version } : {}),
    license: n.license,
    via: n.via,
    text: [n.file, ...(n.extra ?? [])].map(upstream).join('\n\n'),
  });
}
if (fonts !== config.fonts.length)
  problems.push(
    `the build bundles ${fonts} fonts; native.json lists ${config.fonts.length} (${config.fonts.join(', ')})`,
  );
for (const e of entries)
  if (!/copyright|licen[cs]e/i.test(e.text)) problems.push(`${e.name}: its text has no copyright or licence notice`);

// --- Output: identical texts stored once ---
const texts = [];
const out = entries.map(({ text, ...e }) => {
  let i = texts.indexOf(text);
  if (i < 0) i = texts.push(text) - 1;
  return { ...e, text: i };
});
const json = `${JSON.stringify({ entries: out, texts }, null, 1)}\n`;

const md = [
  '# Third-party notices',
  '',
  'Schwung is built on open-source software. These are the copyright and licence notices of everything the iOS app',
  'ships, also shown in the app (Settings → About → Open Source Licences). Generated by',
  '`node scripts/licenses/notices.mjs` from the production build; `--check` verifies it.',
  '',
  'Development tools (Jest, ESLint, Prettier, TypeScript, the Expo CLI and their dependencies) are not part of the app.',
  '',
  '## Artwork and fonts',
  '',
  'The paintings in `assets/` (the world, the habit cards’ scenes, the collectibles, the discoveries and the summit',
  'beacon) were generated with OpenAI’s ChatGPT image tools for this app, then cropped, graded and compressed for it',
  '(`design/`). They are not third-party stock art. No text fonts are bundled: the app uses the system fonts. The two',
  'icon fonts it ships are listed below.',
  '',
  '## Components',
  '',
  '| Component | Version | Licence |',
  '| --- | --- | --- |',
  ...entries.map((e) => `| ${e.name}${e.via ? ` (via ${e.via})` : ''} | ${e.version ?? ''} | ${e.license} |`),
  '',
  '## Notices',
  '',
  ...entries.flatMap((e) => [`### ${e.name}${e.version ? ` ${e.version}` : ''}`, '', '```text', e.text, '```', '']),
].join('\n');

if (problems.length) {
  console.error(`Open-source notices: ${problems.length} problem(s)\n${problems.map((p) => `  ✗ ${p}`).join('\n')}`);
  process.exit(1);
}
if (check) {
  const stale = [
    [OUT_JSON, json],
    [OUT_MD, md],
  ].filter(([f, s]) => !existsSync(f) || readFileSync(f, 'utf8') !== s);
  if (stale.length) {
    console.error(
      `Open-source notices are out of date: run node scripts/licenses/notices.mjs\n${stale.map(([f]) => `  ✗ ${f.slice(ROOT.length + 1)}`).join('\n')}`,
    );
    process.exit(1);
  }
  console.log(`Open-source notices match the build: ${entries.length} components, ${fonts} fonts.`);
} else {
  writeFileSync(OUT_JSON, json);
  writeFileSync(OUT_MD, md);
  console.log(
    `Wrote ${entries.length} components (${texts.length} distinct texts) to src/legal/notices.json and THIRD_PARTY_NOTICES.md.`,
  );
}
