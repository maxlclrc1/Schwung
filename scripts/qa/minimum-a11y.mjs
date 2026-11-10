import { createRequire } from 'module';
import { createServer } from 'http';
import { createReadStream, existsSync, statSync, readFileSync } from 'fs';
import { join, extname } from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
// Usage (after an internal-channel web export and the QA fixtures, scripts/qa/README.md):
//   EXPO_PUBLIC_SCHWUNG_CHANNEL=internal npm run qa:build && npm run qa:fixtures && node scripts/qa/minimum-a11y.mjs
const WEB = new URL('../../.qa/web', import.meta.url).pathname.replace(/\/$/, '');
const all = JSON.parse(readFileSync(new URL('../../.qa/fixtures.json', import.meta.url), 'utf8'));
const scene = (id) => all.scenes.find((s) => s.id === id).state.pilot;
const fx = { day20: scene('min-today'), after: scene('min-momentum-journey') };
const TYPES = {
  '.js': 'application/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};
const server = createServer((q, r) => {
  let p = join(WEB, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(WEB) || !existsSync(p) || statSync(p).isDirectory()) p = join(WEB, 'index.html');
  r.setHeader('Content-Type', TYPES[extname(p)] ?? 'application/octet-stream');
  createReadStream(p).pipe(r);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
/*
 * Minimum Effort's accessibility pass on the web build: the names, roles and live region VoiceOver is given, and the
 * flow recorded and removed with the keyboard, all with Reduce Motion on. Development only; it is no substitute for
 * VoiceOver on an iPhone (docs/MINIMUM_EFFORT_RELEASE_CHECKLIST.md, section B).
 */
const results = [];
const errors = [];
const ok = (name, pass, detail = '') =>
  results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
async function open(program, url, lang = 'en') {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 1300 },
    reducedMotion: 'reduce',
    timezoneId: 'UTC',
    locale: lang,
  });
  const storage = {
    'schwung-preferences': JSON.stringify({
      state: {
        themePreference: 'light',
        reminders: { enabled: false },
        comebacks: true,
        language: lang,
        languageChosen: true,
      },
      version: 1,
    }),
    'schwung-reset-pilot': JSON.stringify({ state: { program, devDayOffset: 0 }, version: 3 }),
  };
  await ctx.addInitScript((s) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      sessionStorage.setItem('seeded', '1');
    }
  }, storage);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(url + ': ' + String(e)));
  await page.clock.setFixedTime(new Date('2026-06-15T10:00:00Z'));
  await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  return { page, ctx };
}
// 1. Habit Details: the action, the live state line, recording and removing (Daily Movement, minimum available).
{
  const { page, ctx } = await open(fx.day20, '/life-reset/move_walk');
  const add = page.getByRole('button', { name: 'Did the minimum', exact: true });
  ok('Details: "Did the minimum" is a button with its name', (await add.count()) === 1);
  const live = page.locator('[aria-live="polite"]');
  ok('Details: state line is a polite live region', (await live.count()) >= 1, await live.first().innerText());
  await add.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  ok(
    'Details: after recording, the live region reads "Minimum done."',
    (await live.first().innerText()).includes('Minimum done.'),
  );
  const remove = page.getByRole('button', { name: 'Remove minimum', exact: true });
  ok('Details: "Remove minimum" replaces the action', (await remove.count()) === 1);
  await remove.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  ok('Details: removing returns to "Not done yet."', (await live.first().innerText()).includes('Not done yet.'));
  await ctx.close();
}
// 2. Read Daily, recorded today.
{
  const { page, ctx } = await open(fx.day20, '/life-reset/mind_read');
  ok(
    'Details (recorded): "Remove minimum" shown, no "Did the minimum"',
    (await page.getByRole('button', { name: 'Remove minimum', exact: true }).count()) === 1 &&
      (await page.getByRole('button', { name: 'Did the minimum', exact: true }).count()) === 0,
  );
  const hint = await page.getByText('Your goal stays the same:').count();
  ok('Details (recorded): hint without nested parentheses', hint === 1);
  await ctx.close();
}
// 3. Habits card: its accessible summary names the minimum.
{
  const { page, ctx } = await open(fx.day20, '/today');
  const labels = await page.$$eval('[aria-label]', (els) => els.map((e) => e.getAttribute('aria-label')));
  const card = labels.find((l) => l && l.startsWith('Read Daily'));
  ok('Habits: Read Daily card label includes "Minimum done"', !!card && card.includes('Minimum done'), card ?? 'none');
  await ctx.close();
}
// 4. Journey: kept days read "Kept with the minimum."; a full day doesn't.
{
  const { page, ctx } = await open(fx.day20, '/progress');
  const labels = await page.$$eval('[role="button"][aria-label]', (els) =>
    els.map((e) => e.getAttribute('aria-label')),
  );
  const d13 = labels.find((l) => /^Day 13[.,]/.test(l));
  const d14 = labels.find((l) => /^Day 14[.,]/.test(l));
  ok('Journey: Day 13 reads "Day 13. Kept with the minimum."', d13 === 'Day 13. Kept with the minimum.', d13);
  ok('Journey: Day 14 (full) is not called kept', !!d14 && !d14.includes('minimum'), d14);
  await ctx.close();
}
// 5. Insights: labels name the minimums.
{
  const { page, ctx } = await open(fx.day20, '/insights');
  const labels = await page.$$eval('[aria-label]', (els) => els.map((e) => e.getAttribute('aria-label')));
  const ring = labels.find((l) => l.includes('consistency'));
  ok('Insights: consistency label names its minimums', !!ring && ring.includes('at the minimum'), ring);
  const rows = labels.filter((l) => l.includes('at the minimum') && !l.includes('consistency'));
  ok('Insights: habit rows with minimums say so', rows.length >= 1, rows[0]);
  await ctx.close();
}
// 6. After Day 66: the panel's label counts kept days.
{
  const { page, ctx } = await open(fx.after, '/progress');
  const labels = await page.$$eval('[aria-label]', (els) => els.map((e) => e.getAttribute('aria-label')));
  const since = labels.find((l) => l.startsWith('Since the summit'));
  ok('After 66: Since-the-summit label includes kept days', !!since && since.includes('kept with the minimum'), since);
  await ctx.close();
}
// 7. Arabic: the same labels, translated (the web build stays left-to-right; RTL layout is in the visual QA).
{
  const { page, ctx } = await open(fx.day20, '/progress', 'ar');
  const labels = await page.$$eval('[role="button"][aria-label]', (els) =>
    els.map((e) => e.getAttribute('aria-label')),
  );
  const kept = labels.filter((l) => l.includes('حُوفظ عليه بالحد الأدنى'));
  ok('Arabic: Journey kept days read in Arabic', kept.length === 3, `${kept.length} kept days`);
  await ctx.close();
}
console.log(results.join('\n'));
console.log('PAGE ERRORS', errors.length ? errors : 'none');
if (errors.length || results.some((r) => r.startsWith('FAIL'))) process.exitCode = 1;
await browser.close();
server.close();
