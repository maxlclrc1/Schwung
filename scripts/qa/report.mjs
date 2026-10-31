import { writeFileSync } from 'fs';
import { join } from 'path';

/*
 * The visual QA's HTML report (.qa/report/index.html): counts by problem and screen, then each screen's cases with
 * problems, grouped by language, each with its outlined screenshots. Returns a short text summary for the console.
 */

const KINDS = {
  truncated: 'Cut short (ellipsis or line clamp)',
  clipped: 'Clipped by its container',
  'clipped-script': 'Clipped glyphs (complex script)',
  'overflow-x': 'Wider than its box',
  'offscreen-x': 'Past the screen edge',
  'word-broken': 'Line break inside a word',
  obscured: 'Covered by something on top',
  overlap: 'Text over text',
  'overlap-controls': 'Controls on the same spot',
  'control-offscreen': 'Control out of reach',
  'page-wider': 'Page scrolls sideways',
  error: 'Page error',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function writeReport(dir, results, meta) {
  for (const r of results) for (const e of r.errors) r.issues.push({ kind: 'error', text: e, detail: '', shot: r.shots[0] });
  const all = results.flatMap((r) => r.issues.map((i) => ({ ...i, r })));
  const count = (f) => all.filter(f).length;
  const kinds = Object.keys(KINDS).filter((k) => count((i) => i.kind === k));
  const scenes = [...new Set(results.map((r) => r.scene))];
  const clean = results.filter((r) => !r.issues.length).length;

  const kindRows = kinds.map((k) => `<tr><td>${esc(KINDS[k])}</td><td>${count((i) => i.kind === k)}</td></tr>`).join('');
  const sceneRows = scenes
    .map((s) => {
      const rs = results.filter((r) => r.scene === s);
      const bad = rs.filter((r) => r.issues.length);
      const langs = [...new Set(bad.map((r) => r.lang))];
      return `<tr><td><a href="#${s}">${esc(s)}</a></td><td>${esc(rs[0].group)}</td><td>${bad.length}/${rs.length}</td><td>${esc(langs.join(' '))}</td></tr>`;
    })
    .join('');

  const sections = scenes
    .map((s) => {
      const bad = results.filter((r) => r.scene === s && r.issues.length);
      if (!bad.length) return '';
      const byLang = [...new Set(bad.map((r) => r.lang))];
      const body = byLang
        .map((l) =>
          bad
            .filter((r) => r.lang === l)
            .map((r) => {
              const shots = [...new Set(r.issues.map((i) => i.shot).filter(Boolean))];
              const items = r.issues
                .map((i) => `<li><b>${esc(KINDS[i.kind] ?? i.kind)}</b> “${esc(i.text)}” <span>${esc(i.detail ?? '')}</span></li>`)
                .join('');
              const imgs = shots.map((p) => `<a href="shots/${esc(p)}"><img loading="lazy" src="shots/${esc(p)}" alt=""></a>`).join('');
              return `<div class="case"><h3>${esc(l)} · ${esc(r.config)}</h3><ul>${items}</ul><div class="shots">${imgs}</div></div>`;
            })
            .join(''),
        )
        .join('');
      return `<section id="${esc(s)}"><h2>${esc(s)} <small>${esc(bad[0].group)}</small></h2>${body}</section>`;
    })
    .join('');

  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Schwung visual QA</title>
<style>
:root{--bg:#f7f5f0;--fg:#1d1b17;--mut:#6b665c;--line:#ddd7cb;--card:#fff;--acc:#e5004f}
@media (prefers-color-scheme:dark){:root{--bg:#15140f;--fg:#ece8df;--mut:#a29c90;--line:#35322b;--card:#1f1d18}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif;max-width:1200px;margin-inline:auto}
h1{font-size:22px;margin:0 0 4px}p{color:var(--mut);margin:0 0 16px}table{border-collapse:collapse;margin:0 0 24px;width:100%}
td,th{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}a{color:inherit}
section{margin:32px 0}h2 small{color:var(--mut);font-weight:400;font-size:14px}.case{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;margin:10px 0}
.case h3{margin:0 0 6px;font-size:14px}.case ul{margin:0 0 8px;padding-left:18px}.case li span{color:var(--mut)}
.shots{display:flex;gap:8px;overflow-x:auto}.shots img{height:260px;border:1px solid var(--line);border-radius:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
</style>
<h1>Schwung visual QA</h1>
<p>${esc(meta.matrix)} matrix · ${results.length} cases · ${clean} without problems · ${all.length} suspected problems · settings: ${esc(meta.configs.join(', '))}. Web build: native text rendering, right-to-left mirroring and animations are not judged here (scripts/qa/README.md).</p>
<div class="grid"><table><tr><th>Problem</th><th>Found</th></tr>${kindRows || '<tr><td>None</td><td>0</td></tr>'}</table>
<table><tr><th>Screen</th><th>Group</th><th>Cases with problems</th><th>Languages</th></tr>${sceneRows}</table></div>
${sections}
</html>`;
  writeFileSync(join(dir, 'index.html'), html);
  return `${results.length} cases, ${results.length - clean} with problems, ${all.length} suspected problems${kinds.length ? `: ${kinds.map((k) => `${k} ${count((i) => i.kind === k)}`).join(', ')}` : ''}`;
}
