/*
 * Runs inside the page (scripts/qa/run.mjs): finds layout problems in what is on screen now, from the DOM's own
 * geometry. Returns [{ kind, text, rect, detail }].
 *
 * Left out, to keep false alarms down: decorative views (hidden from screen readers, such as the painted world and
 * the language ring), invisible ones, single glyphs (icons, the rolling digits), text under a sheet or modal that
 * covers it, and anything scrolled out of sight. Text passing under a header while scrolled is judged only at the
 * top and the bottom of the scroll, where it rests. A view can opt out with `dataSet={{ qa: 'ignore' }}`.
 *
 * `pos`: { atTop, atBottom } for the main scroll view's current position.
 */
// eslint-disable-next-line no-unused-vars
function qaDetect(pos = { atTop: true, atBottom: true }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const issues = [];
  const TALL = /[؀-ۿݐ-ݿऀ-ॿঀ-৿฀-๿]/;
  // Scripts that break lines only between words (so a break inside a word is a problem).
  const SPACED = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Bengali}]/u;
  // Scripts that may break anywhere (Chinese, Japanese, Korean, Thai): text with any of them is not judged for it.
  const ANYWHERE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;
  const main = document.querySelector('[data-qa-main]');
  const cache = new Map();
  const styles = new Map();
  const css = (el) => {
    let cs = styles.get(el);
    if (!cs) styles.set(el, (cs = getComputedStyle(el)));
    return cs;
  };
  const rects = new Map();
  const rectOf = (el) => {
    let r = rects.get(el);
    if (!r) rects.set(el, (r = el.getBoundingClientRect()));
    return r;
  };

  const info = (el) => {
    if (cache.has(el)) return cache.get(el);
    let r;
    if (!el || el === document.documentElement) r = { skip: false, opacity: 1 };
    else {
      const cs = css(el);
      const up = info(el.parentElement);
      r = {
        skip:
          up.skip ||
          el.getAttribute('aria-hidden') === 'true' ||
          el.dataset?.qa === 'ignore' ||
          el.classList?.contains('qa-mark') ||
          cs.display === 'none' ||
          cs.visibility === 'hidden',
        opacity: up.opacity * Number(cs.opacity || 1),
      };
    }
    cache.set(el, r);
    return r;
  };
  const shown = (el) => {
    const i = info(el);
    return !i.skip && i.opacity > 0.05;
  };
  const snippet = (s) => String(s).replace(/\s+/g, ' ').trim().slice(0, 70);
  const box = (r) => ({ x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
  const union = (rs) => {
    const u = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (const r of rs) {
      u.left = Math.min(u.left, r.left);
      u.top = Math.min(u.top, r.top);
      u.right = Math.max(u.right, r.right);
      u.bottom = Math.max(u.bottom, r.bottom);
    }
    return { ...u, width: u.right - u.left, height: u.bottom - u.top };
  };
  const cut = (r, w) => {
    const c = { left: Math.max(r.left, w.left), top: Math.max(r.top, w.top), right: Math.min(r.right, w.right), bottom: Math.min(r.bottom, w.bottom) };
    return { ...c, width: c.right - c.left, height: c.bottom - c.top };
  };
  const scrolls = (cs, axis) => /(auto|scroll)/.test(axis === 'x' ? cs.overflowX : cs.overflowY);
  const clips = (cs, axis) => /(hidden|clip)/.test(axis === 'x' ? cs.overflowX : cs.overflowY);
  const add = (kind, text, r, detail) => issues.push({ kind, text: snippet(text), rect: box(r), detail });
  // A frame at least as big as the screen (the app, a tab page, a scroll view taller than the screen on the web):
  // what it hides is off screen, not clipped.
  const screenSized = (r, axis) => (axis === 'x' ? r.width >= vw - 1 : r.height >= vh - 1);

  /** Where an element can be seen: the screen cut by its scrolling ancestors (`view`), and also by clipping ones (`seen`). */
  const windowsOf = (el) => {
    let view = { left: 0, top: 0, right: vw, bottom: vh };
    let seen = view;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = css(a);
      const sx = scrolls(cs, 'x') || clips(cs, 'x');
      const sy = scrolls(cs, 'y') || clips(cs, 'y');
      if (!sx && !sy) continue;
      const r = rectOf(a);
      const w = { left: sx ? r.left : -1e9, top: sy ? r.top : -1e9, right: sx ? r.right : 1e9, bottom: sy ? r.bottom : 1e9 };
      seen = cut(seen, w);
      if (scrolls(cs, 'x') || scrolls(cs, 'y') || screenSized(r, 'x') || screenSized(r, 'y')) view = cut(view, w);
    }
    return { view, seen };
  };
  const within = (r, w, tol = 1) => r.left >= w.left - tol && r.right <= w.right + tol && r.top >= w.top - tol && r.bottom <= w.bottom + tol;
  const meets = (r, w) => r.right > w.left + 1 && r.left < w.right - 1 && r.bottom > w.top + 1 && r.top < w.bottom - 1;

  /** What covers the point, if something opaque does (not the element itself or its own family). */
  const coverAt = (el, x, y) => {
    if (x < 0 || y < 0 || x > vw || y > vh) return null;
    const hit = document.elementFromPoint(x, y);
    if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return null;
    for (let c = hit; c && !c.contains(el); c = c.parentElement) {
      if (!shown(c)) return null;
      const cs = css(c);
      const bg = cs.backgroundColor.match(/[\d.]+/g);
      const alpha = bg ? (bg.length > 3 ? Number(bg[3]) : 1) : 0;
      const ownText = [...c.childNodes].some((k) => k.nodeType === 3 && k.textContent.trim().length > 1);
      if ((bg && alpha > 0.35 && info(c).opacity > 0.35) || ownText || /^(IMG|svg|CANVAS)$/i.test(c.tagName)) {
        // A layer covering most of the screen (a sheet, a modal, the recovery screen) hides what's under it on purpose.
        let big = c;
        for (let u = c; u && !u.contains(el); u = u.parentElement) {
          const r = rectOf(u);
          if (r.width * r.height > vw * vh * 0.5) big = u;
        }
        const br = rectOf(big);
        return { el: hit, layer: br.width * br.height > vw * vh * 0.5, text: hit.textContent };
      }
    }
    return null;
  };
  // Content in the main scroll view meeting something outside it: judged only where the content rests.
  const restingCheck = (el, r) => {
    if (!main || !main.contains(el)) return true;
    const mid = r.top + r.height / 2;
    return (pos.atTop && mid < vh / 2) || (pos.atBottom && mid >= vh / 2);
  };

  // --- Text ---
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const els = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    if (n.textContent.trim().length > 1 && n.parentElement && !/^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentElement.tagName))
      els.add(n.parentElement);

  const texts = [];
  for (const el of els) {
    if (!shown(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    const u = union(rects);
    const { view, seen } = windowsOf(el);
    if (!meets(u, seen)) continue; // scrolled away, or on another page of the tab pager
    const text = el.textContent;
    // Under a sheet or modal: not on screen.
    const c0 = coverAt(el, Math.min(Math.max(u.left + u.width / 2, 1), vw - 1), Math.min(Math.max(u.top + u.height / 2, 1), vh - 1));
    if (c0?.layer) continue;
    const whole = within(u, view, 1.5); // fully in sight: its edges can be judged
    const cs = css(el);
    const er = rectOf(el);
    texts.push({ el, rects: rects.map((r) => cut(r, seen)).filter((r) => r.width > 0 && r.height > 0), text });

    // Cut short with an ellipsis (numberOfLines) or a line clamp.
    const clamp = cs.webkitLineClamp;
    const clamped = !!clamp && clamp !== 'none';
    const truncated =
      (clamped || cs.textOverflow === 'ellipsis') && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 1);
    if (truncated) add('truncated', text, er, clamped ? `clamped to ${clamp} line(s)` : 'ellipsis');
    else {
      // Wider than the box it sits in (judged against the parent: a text's own box may be narrower by design).
      const pr = rectOf(el.parentElement);
      if (u.right > Math.max(er.right, pr.right) + 4 || u.left < Math.min(er.left, pr.left) - 4)
        add('overflow-x', text, u, 'text wider than its box');
    }

    // A line break inside a word (in a script that breaks between words).
    if (rects.length > 1 && text.length < 400 && SPACED.test(text) && !ANYWHERE.test(text) && !/https?:/.test(text)) {
      const node = [...el.childNodes].find((k) => k.nodeType === 3 && k.textContent.trim());
      const s = node?.textContent ?? '';
      const at = (i) => {
        const r = document.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + 1);
        return r.getBoundingClientRect();
      };
      for (let i = 1; i < s.length; i++) {
        if (!/[\p{L}\p{M}]/u.test(s[i]) || !/[\p{L}\p{M}]/u.test(s[i - 1])) continue;
        const a = at(i - 1);
        const b = at(i);
        if (b.top > a.top + a.height * 0.6 && a.width && b.width) {
          const w0 = s.slice(0, i).split(/[\s /·—–-]/).pop();
          const w1 = s.slice(i).split(/[\s /·—–-]/)[0];
          add('word-broken', text, er, `“${w0}|${w1}”`);
          break;
        }
      }
    }

    if (whole) {
      // Cut by an ancestor that clips (not one that scrolls, nor a screen-sized frame).
      for (let a = el; a && a !== document.body; a = a.parentElement) {
        const acs = css(a);
        const r = rectOf(a);
        const cx = clips(acs, 'x') && !screenSized(r, 'x');
        const cy = clips(acs, 'y') && !screenSized(r, 'y');
        if (!cx && !cy) continue;
        const tol = 1.5;
        const outY = cy && (u.top < r.top - tol || u.bottom > r.bottom + tol);
        const outX = cx && (u.left < r.left - tol || u.right > r.right + tol);
        if (outY || outX) {
          const kind = outY && TALL.test(text) ? 'clipped-script' : 'clipped';
          const by = outY
            ? `${Math.round(Math.max(r.top - u.top, u.bottom - r.bottom))}px at the ${u.bottom > r.bottom + tol ? 'bottom' : 'top'}`
            : `${Math.round(Math.max(r.left - u.left, u.right - r.right))}px at the side`;
          if (!(a === el && truncated)) add(kind, text, u, `cut ${by} by ${a === el ? 'its own box' : 'its container'}`);
          break;
        }
      }
    }

    // Off the side of the screen (not inside something that scrolls sideways).
    if ((u.right > vw + 1 || u.left < -1) && meets(u, { left: 0, top: 0, right: vw, bottom: vh })) {
      let sideways = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement)
        if (scrolls(css(a), 'x') && a.scrollWidth > a.clientWidth + 1) sideways = true;
      if (!sideways) add('offscreen-x', text, u, `${Math.round(Math.max(u.right - vw, -u.left))}px past the screen edge`);
    }

    // Covered by something drawn on top (a header, a bar, another control or text).
    for (const r of rects.slice(0, 4)) {
      const cover = coverAt(el, r.left + r.width / 2, r.top + r.height / 2);
      if (cover && !truncated && !cover.layer && meets(r, seen) && (restingCheck(el, r) || (main && main.contains(cover.el)))) {
        add('obscured', text, r, `under “${snippet(cover.text || cover.el.tagName.toLowerCase())}”`);
        break;
      }
    }
  }

  // Text laid over other text (two separate labels sharing glyph lines).
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      let hit = null;
      for (const ra of a.rects)
        for (const rb of b.rects) {
          const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
          const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
          if (ox > 3 && oy > Math.min(ra.height, rb.height) * 0.45) hit = ra;
        }
      if (!hit) continue;
      const inMainA = !!main?.contains(a.el);
      const inMainB = !!main?.contains(b.el);
      if (inMainA !== inMainB && !restingCheck(inMainA ? a.el : b.el, hit)) continue;
      add('overlap', `${a.text} ⟷ ${b.text}`, hit, 'two texts on the same pixels');
    }

  // --- Controls ---
  const controls = [...document.querySelectorAll('[role=button],[role=radio],[role=checkbox],[role=switch],[role=link],[role=tab],button,a[href]')].filter(shown);
  const placed = [];
  for (const c of controls) {
    const r = rectOf(c);
    if (r.width < 1 || r.height < 1) continue;
    if (r.right <= 0 || r.left >= vw) continue; // another page of the tab pager
    const label = c.getAttribute('aria-label') || c.textContent || c.getAttribute('role');
    const mid = coverAt(c, Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), Math.min(Math.max(r.top + r.height / 2, 1), vh - 1));
    if (mid?.layer) continue;
    // Reachable only if on screen or inside something that scrolls (on the web a scroll view may also simply be
    // taller than the screen, its content reached on a phone by scrolling).
    let canY = false;
    let canX = false;
    for (let a = c.parentElement; a && a !== document.body; a = a.parentElement) {
      const acs = css(a);
      const ar = rectOf(a);
      if (scrolls(acs, 'y') && (a.scrollHeight > a.clientHeight + 1 || ar.height > vh + 1)) canY = true;
      if (scrolls(acs, 'x') && (a.scrollWidth > a.clientWidth + 1 || ar.width > vw + 1)) canX = true;
    }
    if ((r.bottom > vh + 1 || r.top < -1) && !canY) add('control-offscreen', label, r, 'outside the screen, nothing scrolls to it');
    else if ((r.right > vw + 1 || r.left < -1) && !canX) add('control-offscreen', label, r, 'past the side of the screen');
    const { seen } = windowsOf(c);
    if (meets(r, seen)) placed.push({ c, r: cut(r, seen), label });
  }
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (a.c.contains(b.c) || b.c.contains(a.c)) continue;
      const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      const small = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
      if (ix <= 0 || iy <= 0 || (ix * iy) / small <= 0.3) continue;
      const inMainA = !!main?.contains(a.c);
      if (inMainA !== !!main?.contains(b.c) && !restingCheck(inMainA ? a.c : b.c, a.r)) continue;
      add('overlap-controls', `${a.label} ⟷ ${b.label}`, a.r, 'two controls on the same spot');
    }

  // The whole page scrolling sideways means something is wider than the phone.
  const sw = document.scrollingElement.scrollWidth;
  if (sw > vw + 1) add('page-wider', 'page', { left: vw - 4, top: 0, width: 4, height: vh }, `${sw - vw}px wider than the screen`);

  return issues;
}
