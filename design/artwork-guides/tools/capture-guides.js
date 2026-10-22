// Captures the Ascent exactly as the app renders it, at 1500x1000 (frame 360x240pt x 4.1667).
// Usage: node capture-guides.js <outDir>   (needs the web build served on :8099)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const PLAN = ['discipline_bed', 'sleep_bedtime', 'move_walk', 'water', 'screen_limit'];
function state(today, pref, missed = []) {
  const start = new Date(); start.setDate(start.getDate() - (today - 1));
  const logs = {};
  for (let d = 1; d < today; d++) {
    if (missed.includes(d)) continue;
    const dt = new Date(start); dt.setDate(dt.getDate() + d - 1);
    logs[key(dt)] = { day: d, date: key(dt), completed: PLAN, planned: PLAN };
  }
  return JSON.stringify({ state: { startedAt: key(start), answers: null,
    plan: PLAN.map((id) => ({ habitId: id, level: today > 21 ? 'medium' : 'easy', addedOnDay: 1, levelSince: 0 })),
    logs, reminderTime: '20:00', notificationsEnabled: false, themePreference: pref,
    seenCeremonies: [1, 7, 21, 44, 66].filter((m) => m <= today), appliedPhase: today >= 45 ? 3 : today >= 22 ? 2 : 1,
    notices: [], devDayOffset: 0 }, version: 1 });
}
const FRAME = 360, SCALE = 1500 / FRAME;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const geometry = {};
  async function page(pref, today, missed, dsf, vp) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf });
    const p = await ctx.newPage();
    await p.addInitScript((v) => { try { localStorage.setItem('schwung-state', v); } catch {} }, state(today, pref, missed));
    await p.goto('http://localhost:8099/today'); await p.waitForTimeout(2500);
    return [ctx, p];
  }
  const frameOf = (p) => p.evaluateHandle(() => {
    const img = [...document.querySelectorAll('img')].find((i) => (i.src || '').includes('ascent'));
    let el = img; while (el && !(getComputedStyle(el).overflow === 'hidden' && el.getBoundingClientRect().height > 100)) el = el.parentElement;
    return el;
  });
  const MISSED = [9, 10, 17, 26];
  for (const pref of ['dark', 'light']) {
    for (const [tag, today, missed] of [['day30', 30, MISSED], ['day1', 1, []]]) {
      const [ctx, p] = await page(pref, today, missed, SCALE, { width: FRAME + 32, height: 852 });
      const frame = await frameOf(p);
      const box = await frame.boundingBox();
      if (Math.abs(box.width - FRAME) > 0.5 || Math.abs(box.height - 240) > 0.5) throw new Error('frame is ' + box.width + 'x' + box.height);
      // Rendered with the art, exactly as on a phone.
      await frame.screenshot({ path: `${OUT}/ascent-render-${pref}-${tag}-1500x1000.png` });
      if (pref === 'dark' && tag === 'day30') {
        // Measure the real boxes the app draws (in 0..1 of the frame).
        geometry.frame = box;
        geometry.boxes = await p.evaluate(({ fx, fy, fw, fh }) => {
          const rel = (r) => ({ x: (r.x - fx) / fw, y: (r.y - fy) / fh, w: r.width / fw, h: r.height / fh });
          const out = { pills: {}, markers: [] };
          for (const name of ['Foundation', 'Momentum', 'Mastery']) {
            const t = [...document.querySelectorAll('div')].find((d) => d.textContent === name && d.children.length === 0);
            out.pills[name] = rel(t.parentElement.getBoundingClientRect());
          }
          const w = [...document.querySelectorAll('div')].find((d) => d.textContent && /^Phase \d of 3$/i.test(d.textContent) && d.children.length === 0);
          out.where = rel(w.parentElement.getBoundingClientRect());
          for (const d of document.querySelectorAll('div')) {
            const r = d.getBoundingClientRect();
            if (r.x < fx || r.y < fy || r.right > fx + fw + 1 || r.bottom > fy + fh + 1) continue;
            const cs = getComputedStyle(d);
            if (cs.position === 'absolute' && (Math.abs(r.width - 7) < 0.1 || Math.abs(r.width - 5) < 0.1) && Math.abs(r.width - r.height) < 0.1 && cs.borderRadius !== '0px')
              out.markers.push({ x: (r.x + r.width / 2 - fx) / fw, y: (r.y + r.height / 2 - fy) / fh, size: r.width });
          }
          return out;
        }, { fx: box.x, fy: box.y, fw: box.width, fh: box.height });
      }
      // App overlay only: hide both landscapes and the frame fill, keep everything drawn on top.
      await p.evaluate(() => {
        const imgs = [...document.querySelectorAll('img')].filter((i) => (i.src || '').includes('ascent'));
        imgs.forEach((i) => { i.style.opacity = '0'; let e = i.parentElement; for (let k = 0; k < 4 && e; k++) { e.style.backgroundImage = 'none'; e = e.parentElement; } });
        // react-native-web draws <Image> as a div with a background image plus a hidden <img>.
        document.querySelectorAll('div').forEach((d) => { if ((getComputedStyle(d).backgroundImage || '').includes('ascent')) d.style.backgroundImage = 'none'; });
        // The top-left gradient is redrawn by the guide generator with iOS semantics (react-native-web stretches it).
        document.querySelectorAll('div').forEach((d) => { if ((getComputedStyle(d).backgroundImage || '').includes('linear-gradient')) d.style.display = 'none'; });
      });
      await p.evaluate((el) => {
        // The frame fill and every ancestor (screen, html, body) go transparent so only the app's overlay remains.
        for (let e = el; e; e = e.parentElement) e.setAttribute('data-guide-clear', '1');
        const st = document.createElement('style');
        st.textContent = '[data-guide-clear], html, body { background: transparent !important; background-color: transparent !important; }';
        document.head.appendChild(st);
      }, frame);
      await p.waitForTimeout(300);
      await frame.screenshot({ path: `${OUT}/ascent-overlay-${pref}-${tag}-1500x1000.png`, omitBackground: true });
      await ctx.close();
    }
    // G4: the whole Today screen on a 393x852 phone at 3x.
    const [ctx, p] = await page(pref, 30, MISSED, 3, { width: 393, height: 852 });
    await p.screenshot({ path: `${OUT}/today-${pref}-393x852@3x.png` });
    await ctx.close();
  }
  fs.writeFileSync(`${OUT}/app-geometry.json`, JSON.stringify(geometry, null, 1));
  await b.close();
  console.log('ok', geometry.boxes.markers.length, 'markers measured');
})();
