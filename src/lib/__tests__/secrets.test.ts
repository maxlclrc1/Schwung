import { describe, expect, it } from '@jest/globals';

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readFileSync(file: string, encoding: 'utf8'): string;
  readdirSync(dir: string, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as { join(...parts: string[]): string; relative(from: string, to: string): string };

/*
 * No secret is ever committed. The app may hold only RevenueCat's public Apple SDK key (`appl_…`, made to ship
 * inside apps). RevenueCat secret API keys (`sk_…`), App Store Connect / In-App Purchase keys (.p8), private keys,
 * shared secrets and certificates live only in RevenueCat's dashboard, App Store Connect or EAS, never in Git.
 */
const ROOT = process.cwd();
const SKIP = new Set(['node_modules', '.git', '.qa', '.expo', 'dist', 'ios', 'android', 'web-build']);
const files: string[] = [];
const walk = (dir: string) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else files.push(p);
  }
};
walk(ROOT);
const rel = (p: string) => path.relative(ROOT, p);
const TEXT = /\.(ts|tsx|js|mjs|cjs|json|md|txt|yml|yaml|env|plist|xml|sh)$|^\.env/;

describe('no secrets in the repository', () => {
  it('has no key or certificate files', () => {
    expect(files.map(rel).filter((f) => /\.(p8|p12|pem|key|mobileprovision|cer)$|(^|\/)\.env(\.|$)/.test(f))).toEqual(
      [],
    );
  });

  it('has no secret API keys or private keys in any text file', () => {
    const hits = files
      .filter((p) => TEXT.test(p.split('/').pop() ?? ''))
      .filter((p) => !rel(p).startsWith('src/lib/__tests__/'))
      .filter((p) => {
        const t = fs.readFileSync(p, 'utf8');
        return (
          /\bsk_[A-Za-z0-9]{20,}/.test(t) || // RevenueCat (or Stripe) secret key
          /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t) ||
          /\bstrp_[A-Za-z0-9]{20,}/.test(t) ||
          /"?(sharedSecret|shared_secret|appSpecificSharedSecret)"?\s*[:=]\s*"[0-9a-f]{32}"/i.test(t)
        );
      })
      .map(rel);
    expect(hits).toEqual([]);
  });
});
