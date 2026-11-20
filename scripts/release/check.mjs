#!/usr/bin/env node
/*
 * npm run release:check — run before every App Store (production) build. Fails while anything the publisher must
 * supply is still a placeholder, or a release safeguard is off. It reads files only (plus `npm audit` for the
 * app's own dependencies); it changes nothing. Not part of `npm test`, so development isn't blocked.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const json = (p) => JSON.parse(read(p));
const problems = [];
const fail = (msg) => problems.push(msg);
const placeholder = (v) => /(^|[@./])example\./i.test(String(v));

// 1. The publisher's identity (release.config.json): nothing invented, nothing left as a placeholder.
const r = json('release.config.json');
for (const [k, v] of Object.entries({
  ...r,
  ...Object.fromEntries(Object.entries(r.tipProducts).map(([s, id]) => [`tipProducts.${s}`, id])),
  ...Object.fromEntries((r.moreTipProducts ?? []).map((id, i) => [`moreTipProducts[${i}]`, id])),
})) {
  if (k === 'tipProducts' || k === 'moreTipProducts' || k === 'revenueCat') continue;
  if (typeof v !== 'string' || !v.trim()) fail(`release.config.json: ${k} is empty`);
  else if (placeholder(v)) fail(`release.config.json: ${k} is still a placeholder (${v})`);
}
const reverseDns = /^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)+$/;
if (!reverseDns.test(r.bundleIdentifier)) fail(`bundleIdentifier "${r.bundleIdentifier}" isn't a reverse-DNS ID`);
if (r.appName.length > 30) fail(`appName is longer than the App Store's 30 characters`);
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.supportEmail)) fail(`supportEmail "${r.supportEmail}" isn't an email address`);
for (const k of ['privacyPolicyUrl', 'supportUrl'])
  if (!/^https:\/\/[^\s]+$/.test(r[k])) fail(`${k} must be an https:// URL`);
const tips = [...Object.values(r.tipProducts), ...(r.moreTipProducts ?? [])];
if (new Set(tips).size !== tips.length) fail('tipProducts and moreTipProducts: every product ID must be different');
for (const id of tips)
  if (!/^[a-zA-Z0-9._]+$/.test(id)) fail(`tip product ID "${id}" has characters Apple doesn't allow`);

// RevenueCat (the tips): only the public Apple SDK key belongs in the app; secret keys never do.
const rc = r.revenueCat ?? {};
if (!/^appl_[A-Za-z0-9]+$/.test(rc.appleApiKey ?? ''))
  fail(
    'release.config.json: revenueCat.appleApiKey must be RevenueCat’s public Apple SDK key (appl_…), from Project settings → API keys',
  );
if (!rc.offering) fail('release.config.json: revenueCat.offering is empty');
for (const size of ['small', 'medium', 'large'])
  if (!rc.packages?.[size]) fail(`release.config.json: revenueCat.packages.${size} is empty`);
// Extra amounts ("Choose another amount"): optional, but each product needs its own package, in the same order.
const more = r.moreTipProducts ?? [];
const morePackages = rc.morePackages ?? [];
if (!Array.isArray(more) || !Array.isArray(morePackages) || more.length !== morePackages.length)
  fail('release.config.json: moreTipProducts and revenueCat.morePackages must be lists of the same length');
const packages = [...Object.values(rc.packages ?? {}), ...morePackages];
if (morePackages.some((p) => typeof p !== 'string' || !p.trim()))
  fail('release.config.json: revenueCat.morePackages has an empty package identifier');
if (new Set(packages).size !== packages.length)
  fail('release.config.json: every RevenueCat package identifier (packages and morePackages) must be different');

// No secrets anywhere in Git (RevenueCat secret keys, App Store Connect .p8 keys, private keys, certificates).
const tracked = execSync('git ls-files', { cwd: root }).toString().split('\n').filter(Boolean);
for (const f of tracked) {
  if (/\.(p8|p12|pem|key|mobileprovision|cer)$|(^|\/)\.env(\.|$)/.test(f))
    fail(`a key or certificate file is in Git: ${f}`);
  else if (/\.(ts|tsx|js|mjs|json|md|plist|yml|yaml)$/.test(f) && !f.startsWith('src/lib/__tests__/')) {
    const t = read(f);
    if (/\bsk_[A-Za-z0-9]{20,}/.test(t) || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t))
      fail(`a secret key is in Git: ${f}`);
  }
}

// 2. The EAS project (eas init) exists.
const app = json('app.json');
if (!app.expo.extra?.eas?.projectId) fail('app.json: no extra.eas.projectId; run `eas init` with your Expo account');

// 3. Release safeguards.
if (!/export const MINIMUM_EFFORT_LAUNCHED = false;/.test(read('src/lib/flags.ts')))
  fail('MINIMUM_EFFORT_LAUNCHED must stay false for v1.0');
const policy = read('docs/legal/PRIVACY_POLICY.md');
const todos = (policy.match(/TODO/g) ?? []).length;
if (todos)
  fail(`docs/legal/PRIVACY_POLICY.md still has ${todos} TODO(s); publish the final policy at privacyPolicyUrl`);
const eas = json('eas.json');
if (eas.build.production?.env?.EXPO_PUBLIC_SCHWUNG_CHANNEL !== 'production')
  fail('eas.json: production profile must build the production channel');

// 4. The app's own dependencies: no high or critical advisories.
try {
  execSync('npm audit --omit=dev --audit-level=high', { cwd: root, stdio: 'pipe' });
} catch (e) {
  const out = String(e.stdout ?? '') + String(e.stderr ?? '');
  // npm audit exits non-zero for high or critical advisories, or when it can't reach the registry.
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|audit endpoint returned an error/i.test(out))
    fail('npm audit could not reach the registry; run the release check again online');
  else fail('npm audit: high or critical advisories in the app’s dependencies (`npm audit --omit=dev`)');
}

// 5. The open-source notices shown in the app (Settings → About) match what the production build ships.
try {
  execSync('node scripts/licenses/notices.mjs --check', { cwd: root, stdio: 'pipe' });
} catch (e) {
  const out = (String(e.stderr ?? '') + String(e.stdout ?? '')).trim().split('\n').slice(0, 4).join(' / ');
  fail(`open-source notices: ${out || 'the check failed'} (\`node scripts/licenses/notices.mjs\`)`);
}

if (problems.length) {
  console.error(
    `Not ready for an App Store build (${problems.length}):\n` + problems.map((p) => `  ✗ ${p}`).join('\n'),
  );
  process.exit(1);
}
console.log('Release check passed: identity, EAS project, safeguards and dependencies are ready.');
