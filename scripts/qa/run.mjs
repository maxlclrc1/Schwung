#!/usr/bin/env node
/*
 * Visual QA: opens the web build in every language and setting of the matrix, with deterministic saved states
 * (fixtures.ts), finds layout problems from the page's geometry (detect.js) and writes screenshots plus an HTML
 * report to .qa/report/ (git-ignored). Development only. Usage: scripts/qa/README.md.
 *
 *   node scripts/qa/run.mjs [--matrix=quick|full] [--lang=en,ar] [--scene=today,setup] [--config=small,large]
 *                           [--workers=4] [--shots=issues|all]
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { createServer } from 'http';
import { createRequire } from 'module';
import { dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WEB = join(ROOT, '.qa/web');
const OUT = join(ROOT, '.qa/report');
const FIXTURES = join(ROOT, '.qa/fixtures.json');
const DETECT = readFileSync(join(ROOT, 'scripts/qa/detect.js'), 'utf8');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const list = (k) => (args[k] ? args[k].split(',') : null);

/** Phone settings. small: 320pt (iPhone SE 1st gen); standard: 390pt (iPhone 15); large: accessibility text. */
const CONFIGS = {
  small: { w: 320, h: 568, theme: 'light', text: 1 },
  'small-dark': { w: 320, h: 568, theme: 'dark', text: 1 },
  standard: { w: 390, h: 844, theme: 'light', text: 1 },
  'standard-dark': { w: 390, h: 844, theme: 'dark', text: 1 },
  large: { w: 390, h: 844, theme: 'dark', text: 1.3 },
  'large-light': { w: 390, h: 844, theme: 'light', text: 1.3 },
  'small-large': { w: 320, h: 568, theme: 'light', text: 1.3 },
  'small-large-dark': { w: 320, h: 568, theme: 'dark', text: 1.3 },
};
const MATRIX = {
  // Every language, the core screens, a small phone and a large-text standard phone (dark).
  quick: { configs: ['small', 'large'], core: true },
  // Every language, every screen, both widths × both themes × normal and large text.
  full: { configs: Object.keys(CONFIGS), core: false },
};

if (!existsSync(join(WEB, 'index.html'))) fail('No web build: run `npm run qa:build` first.');
if (!existsSync(FIXTURES)) fail('No fixtures: run `npm run qa:fixtures` first.');
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  fail('Playwright is not installed (see scripts/qa/README.md).');
}
function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const fx = JSON.parse(readFileSync(FIXTURES, 'utf8'));
const matrix = MATRIX[args.matrix ?? 'quick'] ?? fail(`Unknown matrix ${args.matrix}`);
const langs = fx.languages.filter((l) => !list('lang') || list('lang').includes(l.code));
const scenes = fx.scenes.filter((s) => (list('scene') ? list('scene').includes(s.id) : !matrix.core || s.core));
const configs = (list('config') ?? matrix.configs).map((c) => [c, CONFIGS[c] ?? fail(`Unknown config ${c}`)]);
const allShots = args.shots === 'all';
const workers = Number(args.workers ?? 4);

// --- A static server for the web build (every unknown path is the app) ---
const TYPES = { '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = createServer((q, r) => {
  let p = join(WEB, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(WEB) || !existsSync(p) || statSync(p).isDirectory()) p = join(WEB, 'index.html');
  r.setHeader('Content-Type', TYPES[extname(p)] ?? 'application/octet-stream');
  createReadStream(p).pipe(r);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${server.address().port}`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'shots'), { recursive: true });

const cases = [];
for (const s of scenes) for (const l of langs) for (const [cid, c] of configs) cases.push({ scene: s, lang: l, cid, c });
console.log(`Visual QA: ${cases.length} cases (${scenes.length} screens × ${langs.length} languages × ${configs.length} settings)`);

const browser = await chromium.launch();
const results = [];
let done = 0;

/** Before the app loads: the saved state, the pinned clock, larger text and the layout direction. */
function initScript({ storage, text, rtl }) {
  if (!sessionStorage.getItem('qa-seeded')) {
    localStorage.clear();
    for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
    sessionStorage.setItem('qa-seeded', '1');
  }
  if (rtl) document.addEventListener('DOMContentLoaded', () => (document.documentElement.dir = 'rtl'));
  if (text !== 1) {
    // Larger accessibility text: every font size and line height React Native for Web writes, scaled.
    const scale = (css) =>
      css.replace(/(font-size|line-height):\s*([\d.]+)px/g, (_, p, n) => `${p}:${(Number(n) * text).toFixed(2)}px`);
    const insert = CSSStyleSheet.prototype.insertRule;
    CSSStyleSheet.prototype.insertRule = function (rule, i) {
      return insert.call(this, scale(rule), i);
    };
    const setProp = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = function (p, v, pr) {
      if ((p === 'font-size' || p === 'line-height') && /px$/.test(v)) v = `${(parseFloat(v) * text).toFixed(2)}px`;
      return setProp.call(this, p, v, pr);
    };
  }
}

async function settle(page, ms = 700) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(ms);
}

/**
 * Runs the detector over each screenful of the main scroll view (scrolled, or for a web scroll view that grew taller
 * than the screen, moved up), screenshots with the problems outlined.
 */
async function audit(page, base, label) {
  const found = [];
  const shots = [];
  const pages = await page.evaluate(() => {
    const vh = innerHeight;
    const vs = [...document.querySelectorAll('*')].filter((e) => {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      if (!/(auto|scroll)/.test(cs.overflowY) || r.left < -2 || r.right > innerWidth + 2 || e.clientHeight < 200) return false;
      return e.scrollHeight > e.clientHeight + 4 || r.bottom > vh + 4;
    });
    vs.sort((a, b) => b.scrollHeight - a.scrollHeight);
    const main = vs[0];
    if (!main) return 1;
    main.setAttribute('data-qa-main', '1');
    const r = main.getBoundingClientRect();
    const grown = r.bottom > vh + 4; // taller than the screen: moved instead of scrolled
    main.dataset.qaGrown = grown ? '1' : '';
    const visible = Math.min(main.clientHeight, vh - Math.max(0, r.top));
    const travel = grown ? r.bottom - vh : main.scrollHeight - main.clientHeight;
    main.dataset.qaStep = String(Math.round(visible * 0.85));
    main.dataset.qaTravel = String(Math.round(travel));
    return Math.min(6, 1 + Math.ceil(travel / (visible * 0.85)));
  });
  for (let i = 0; i < pages; i++) {
    const pos = await page.evaluate((i) => {
      const m = document.querySelector('[data-qa-main]');
      if (!m) return { atTop: true, atBottom: true };
      const travel = Number(m.dataset.qaTravel);
      const y = Math.min(travel, i * Number(m.dataset.qaStep));
      if (m.dataset.qaGrown) m.style.transform = `translateY(${-y}px)`;
      else m.scrollTop = y;
      return { atTop: y <= 0, atBottom: y >= travel };
    }, i);
    if (i > 0) await page.waitForTimeout(300);
    const issues = await page.evaluate(`(${DETECT.replace(/^[\s\S]*?function qaDetect/, 'function qaDetect')})(${JSON.stringify(pos)})`);
    const shot = `${base}-${label}${pages > 1 ? `-p${i + 1}` : ''}.jpg`;
    if (issues.length || allShots) {
      await page.evaluate((issues) => {
        for (const { rect } of issues) {
          const d = document.createElement('div');
          d.className = 'qa-mark';
          Object.assign(d.style, { position: 'fixed', left: `${rect.x - 2}px`, top: `${rect.y - 2}px`, width: `${rect.w + 4}px`, height: `${rect.h + 4}px`, outline: '2px solid #e5004f', background: 'rgba(229,0,79,0.12)', zIndex: 99999, pointerEvents: 'none' });
          document.body.appendChild(d);
        }
      }, issues);
      await page.screenshot({ path: join(OUT, 'shots', shot), type: 'jpeg', quality: 60 });
      await page.evaluate(() => document.querySelectorAll('.qa-mark').forEach((d) => d.remove()));
      shots.push(shot);
    }
    for (const it of issues) if (!found.some((f) => f.kind === it.kind && f.text === it.text)) found.push({ ...it, shot });
  }
  await page.evaluate(() => {
    const m = document.querySelector('[data-qa-main]');
    if (!m) return;
    m.style.transform = '';
    m.scrollTop = 0;
    m.removeAttribute('data-qa-main');
  });
  return { issues: found, shots };
}

async function runCase({ scene, lang, cid, c }) {
  const ctx = await browser.newContext({
    viewport: { width: c.w, height: c.h },
    deviceScaleFactor: 1,
    colorScheme: c.theme,
    reducedMotion: 'reduce',
    locale: lang.code,
    timezoneId: 'UTC',
  });
  const storage = storageFor(scene, lang.code, c.theme);
  await ctx.addInitScript(initScript, { storage, text: c.text, rtl: lang.rtl });
  const page = await ctx.newPage();
  page.setDefaultTimeout(2500);
  await page.clock.setFixedTime(new Date(`${fx.now}Z`));
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const base = `${scene.id}/${lang.code}-${cid}`;
  mkdirSync(join(OUT, 'shots', scene.id), { recursive: true });
  const steps = [];
  try {
    await page.goto(BASE + scene.route, { waitUntil: 'load' });
    await settle(page, 1500);
    if (scene.flow === 'setup') {
      let last = '';
      for (let n = 1; n <= 16; n++) {
        const text = await page.evaluate(() => document.body.innerText);
        if (text === last) break;
        last = text;
        steps.push(await audit(page, base, `step${String(n).padStart(2, '0')}`));
        if (await page.getByRole('button', { name: lang.confirm, exact: true }).count()) break;
        if (!(await advance(page, lang))) break;
        await settle(page, 600);
      }
    } else steps.push(await audit(page, base, 'screen'));
  } catch (e) {
    errors.push(String(e).slice(0, 200));
  }
  await ctx.close();
  const issues = steps.flatMap((s) => s.issues);
  const shots = steps.flatMap((s) => s.shots);
  results.push({ scene: scene.id, group: scene.group, lang: lang.code, config: cid, steps: steps.length, issues, shots, errors });
  done++;
  if (done % 20 === 0 || done === cases.length) console.log(`  ${done}/${cases.length}`);
}

/** Set-up: answers what the step asks (the first options) and presses Continue. */
async function advance(page, lang) {
  const next = page.getByRole('button', { name: lang.continue, exact: true }).last();
  if (!(await next.count())) return false;
  // The habit list: several habits, so the steps that ask about them (phone, wake time, activity, skill) come too.
  const boxes = page.locator('[role=checkbox]:not([aria-checked=true])');
  if ((await boxes.count()) >= 8) for (const i of [9, 7, 5, 3, 1]) await boxes.nth(i).click({ force: true }).catch(() => {});
  for (let tries = 0; tries < 10 && (await next.getAttribute('aria-disabled')) === 'true'; tries++) {
    // The last option first ("None of these" on the health step), then the ones before it.
    const picks = page.locator('[role=radio]:not([aria-checked=true]), [role=checkbox]:not([aria-checked=true])');
    if (await picks.count()) await picks.nth(Math.max(0, (await picks.count()) - 1 - tries)).click({ force: true }).catch(() => {});
    else
      for (const name of lang.more) {
        // A dial (age, time, a meter): a step up at a time until the answer is enough.
        const more = page.getByRole('button', { name, exact: true });
        if (await more.count()) for (let k = 0; k < 4; k++) await more.first().click({ force: true }).catch(() => {});
      }
    if ((await next.getAttribute('aria-disabled')) !== 'true') break;
    // Anything else on the step that answers it (a scale's marks): one more option each try.
    const top = (await next.boundingBox())?.y ?? 0;
    const options = await page.evaluate(
      (top) =>
        [...document.querySelectorAll('[role=button]')]
          .map((b, i) => [i, b.getBoundingClientRect()])
          .filter(([, r]) => r.width > 0 && r.y > 60 && r.y + r.height < top - 20)
          .map(([i]) => i),
      top,
    );
    if (options.length)
      await page.locator('[role=button]').nth(options[tries % options.length]).click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
  }
  await next.click({ force: true }).catch(() => {});
  return true;
}

/** localStorage for a case: the scene's saved state in this language and theme. */
function storageFor(scene, language, theme) {
  const s = scene.state;
  const out = {
    'schwung-preferences': JSON.stringify({
      state: { themePreference: theme, reminders: { enabled: false }, comebacks: true, language, languageChosen: true, ...s.prefs },
      version: 1,
    }),
  };
  if (s.pilot && s.pilot.raw) out['schwung-reset-pilot'] = s.pilot.raw;
  else if (s.pilot !== undefined) out['schwung-reset-pilot'] = JSON.stringify({ state: { program: s.pilot, devDayOffset: 0 }, version: 2 });
  if (s.journeys) out['schwung-journeys'] = JSON.stringify({ state: { journeys: s.journeys }, version: 1 });
  return out;
}

const queue = [...cases];
await Promise.all(
  Array.from({ length: workers }, async () => {
    while (queue.length) await runCase(queue.shift());
  }),
);
await browser.close();
server.close();

results.sort((a, b) => `${a.scene}${a.lang}${a.config}`.localeCompare(`${b.scene}${b.lang}${b.config}`));
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ when: new Date().toISOString(), args, results }, null, 1));
const { writeReport } = await import('./report.mjs');
const summary = writeReport(OUT, results, { matrix: args.matrix ?? 'quick', scenes, langs, configs: configs.map(([k]) => k) });
console.log(summary);
console.log(`Report: ${join(OUT, 'index.html')}`);
