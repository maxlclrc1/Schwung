#!/usr/bin/env node
/*
 * Schwung's offline translation workflow (docs/LOCALIZATION.md → Workflow). English is the source of truth.
 * Nothing here ships in the app or touches the network: it reads the catalogs, writes a small task file, and
 * applies approved translations back into src/i18n/locales/*.ts.
 *
 *   npm run i18n:status              what changed in English, what is missing, outdated or awaiting review
 *   npm run i18n:tasks               write scripts/i18n/tasks.json with only the strings that need translating
 *   npm run i18n:apply               validate and apply the translations filled in tasks.json
 *   npm run i18n:check [-- --strict] fail on anything missing, outdated or invalid (--strict: unreviewed safety text)
 *   npm run i18n:approve -- <lang|all> [key-prefix]   mark translations as reviewed by a person
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const I18N = path.join(ROOT, 'src/i18n');
const STATE_FILE = path.join(HERE, 'state.json');
const TASKS_FILE = path.join(HERE, 'tasks.json');
const GLOSSARY = JSON.parse(fs.readFileSync(path.join(HERE, 'glossary.json'), 'utf8'));

/** Health, safety, privacy and legal wording: never accepted from a machine without a person's review (--strict). */
const SENSITIVE = [
  'engine.notes',
  'engine.exclusion',
  'engine.problems.under16',
  'setup.health',
  'setup.q.health',
  'setup.ageDial.under16',
  'beyond.ascent.health',
  'settings.privacy',
  'settings.restore',
  'settings.recovery',
  'settings.tagline',
  'settings.language.intro',
  'story.privacy',
  'story.photosOff',
  'welcome.free',
  'welcome.time',
];
const isSensitive = (key) => SENSITIVE.some((p) => key === p || key.startsWith(`${p}.`));

// Load the TypeScript catalogs directly (types are erased; the catalogs have no runtime imports).
require.extensions['.ts'] = (m, file) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      fileName: file,
    }).outputText,
    file,
  );
const { LANGUAGES } = require(path.join(I18N, 'languages.ts'));
const { PLURAL_CATEGORIES, REQUIRED_PLURALS } = require(path.join(I18N, 'plural.ts'));
const LANGS = LANGUAGES.filter((l) => l.ready && l.code !== 'en').map((l) => l.code);

const localeFile = (lang) => path.join(I18N, 'locales', `${lang}.ts`);
const exportName = (lang) => lang.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const loadCatalog = (lang) => {
  const file = localeFile(lang);
  if (!fs.existsSync(file)) return {};
  delete require.cache[file];
  return Object.values(require(file))[0] ?? {};
};

// --- leaves ------------------------------------------------------------------------------------------------------
const isPlural = (x) => !!x && typeof x === 'object' && typeof x.other === 'string';
function flatten(o, prefix = '', out = {}) {
  if (typeof o === 'string' || isPlural(o)) out[prefix] = o;
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}
const canon = (leaf) =>
  typeof leaf === 'string'
    ? leaf
    : JSON.stringify(
        Object.keys(leaf)
          .sort()
          .map((k) => [k, leaf[k]]),
      );
const same = (a, b) => a !== undefined && b !== undefined && canon(a) === canon(b);
const forms = (leaf) => (typeof leaf === 'string' ? [leaf] : Object.values(leaf));
const placeholders = (leaf) =>
  [...new Set(forms(leaf).flatMap((s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1])))].sort();

/** What is wrong with a translation of `en` in `lang` (empty when it is fine). */
function problems(en, t, lang) {
  const out = [];
  if (isPlural(en)) {
    if (!isPlural(t)) return ['must be a plural object, like English'];
    const allowed = PLURAL_CATEGORIES[lang] ?? ['one', 'other'];
    const required = REQUIRED_PLURALS[lang] ?? ['one', 'other'];
    const missing = required.filter((c) => typeof t[c] !== 'string');
    const extra = Object.keys(t).filter((c) => !allowed.includes(c));
    if (missing.length) out.push(`plural forms missing: ${missing.join(', ')}`);
    if (extra.length) out.push(`plural forms ${lang} doesn’t have: ${extra.join(', ')}`);
  } else if (typeof t !== 'string') return ['must be a string, like English'];
  if (placeholders(en).join() !== placeholders(t).join())
    out.push(`placeholders {${placeholders(t).join('}, {')}} should be {${placeholders(en).join('}, {')}}`);
  const ref = typeof en === 'string' ? en : en.other;
  for (const s of forms(t)) {
    if (!s.trim()) out.push('empty text');
    else {
      // Strings are joined to others at these edges (French may add its own space before ; : ! ?).
      if (/^\s/.test(ref) && !/^\s/.test(s)) out.push('lost the leading space English has');
      // CJK punctuation (、，。：) carries its own spacing.
      if (/\s$/.test(ref) && !/[\s\u3000-\u303f\uff01-\uff1f]$/.test(s))
        out.push('lost the trailing space English has');
      if (ref.split('\n').length !== s.split('\n').length) out.push('line breaks differ from English');
    }
  }
  return [...new Set(out)];
}

// --- state: the English each translation was last made against ------------------------------------------------
function loadState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  return { en: s.en ?? {}, stale: s.stale ?? {}, review: s.review ?? {} };
}
function saveState(s) {
  const sortList = (m) =>
    Object.fromEntries(
      Object.entries(m)
        .filter(([, v]) => v.length)
        .sort()
        .map(([k, v]) => [k, [...new Set(v)].sort()]),
    );
  const json = { en: s.en, stale: sortList(s.stale), review: sortList(s.review) };
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(json, null, 2)}\n`);
}

/** Every (key, language) that needs a translation, plus anything invalid. */
function survey() {
  const state = loadState();
  if (!state) fail('No scripts/i18n/state.json yet. Run: node scripts/i18n/i18n.mjs baseline');
  const E = flatten(require(path.join(I18N, 'locales/en.ts')).en);
  const T = Object.fromEntries(LANGS.map((l) => [l, flatten(loadCatalog(l))]));
  const needs = new Map(); // key → { change, langs }
  const need = (key, change, lang) => {
    const n = needs.get(key) ?? { change, langs: [] };
    n.langs.push(lang);
    needs.set(key, n);
  };
  const invalid = [];
  for (const [key, leaf] of Object.entries(E)) {
    const prev = state.en[key];
    const change = prev === undefined ? 'new' : same(prev, leaf) ? null : 'modified';
    for (const lang of LANGS) {
      const t = T[lang][key];
      if (change) need(key, change, lang);
      else if (t === undefined) need(key, 'missing', lang);
      else if (state.stale[lang]?.includes(key)) need(key, 'outdated', lang);
      if (t !== undefined) for (const p of problems(leaf, t, lang)) invalid.push(`${lang} ${key}: ${p}`);
    }
  }
  const extra = LANGS.flatMap((l) =>
    Object.keys(T[l])
      .filter((k) => !(k in E))
      .map((k) => `${l} ${k}`),
  );
  const removed = Object.keys(state.en).filter((k) => !(k in E));
  return { E, T, state, needs, invalid, extra, removed };
}

// --- writing the TypeScript catalogs ----------------------------------------------------------------------------
const lit = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
const keyText = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) || /^\d+$/.test(k) ? k : lit(k));
const valueText = (leaf, lang) =>
  typeof leaf === 'string'
    ? lit(leaf)
    : `{ ${(PLURAL_CATEGORIES[lang] ?? Object.keys(leaf))
        .filter((c) => typeof leaf[c] === 'string')
        .map((c) => `${c}: ${lit(leaf[c])}`)
        .join(', ')} }`;
const nested = (segs, value) => (segs.length ? `{ ${keyText(segs[0])}: ${nested(segs.slice(1), value)} }` : value);

function rootObject(sf) {
  for (const st of sf.statements)
    if (ts.isVariableStatement(st))
      for (const d of st.declarationList.declarations)
        if (d.initializer && ts.isObjectLiteralExpression(d.initializer)) return d.initializer;
  throw new Error(`no catalog object in ${sf.fileName}`);
}
const propOf = (obj, name) =>
  obj.properties.find(
    (p) =>
      ts.isPropertyAssignment(p) &&
      (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name)) &&
      p.name.text === name,
  );
const parse = (text, file) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

/** Set (or with `value === null`, remove) one key in a catalog's source text. */
function edit(text, file, key, value) {
  const sf = parse(text, file);
  const segs = key.split('.');
  let obj = rootObject(sf);
  for (let i = 0; i < segs.length; i++) {
    const p = propOf(obj, segs[i]);
    const last = i === segs.length - 1;
    if (!p) {
      if (value === null) return text;
      const close = obj.getEnd() - 1;
      const comma = obj.properties.length && !obj.properties.hasTrailingComma ? ',' : '';
      const insert = `${comma}\n${keyText(segs[i])}: ${last ? value : nested(segs.slice(i + 1), value)},\n`;
      return text.slice(0, close) + insert + text.slice(close);
    }
    if (last) {
      if (value !== null) return text.slice(0, p.initializer.getStart(sf)) + value + text.slice(p.initializer.end);
      const end = text[p.end] === ',' ? p.end + 1 : p.end;
      return text.slice(0, p.getFullStart()) + text.slice(end);
    }
    if (!ts.isObjectLiteralExpression(p.initializer)) throw new Error(`${key}: ${segs[i]} is not an object in ${file}`);
    obj = p.initializer;
  }
  return text;
}

function writeCatalog(lang, changes) {
  const file = localeFile(lang);
  let text = fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8')
    : `import type { Translation } from '../index';\n\nexport const ${exportName(lang)}: Translation = {};\n`;
  for (const [key, leaf] of changes) text = edit(text, file, key, leaf === null ? null : valueText(leaf, lang));
  fs.writeFileSync(file, text);
  return file;
}

// --- context for translators -------------------------------------------------------------------------------------
let SOURCES;
function usedIn(key) {
  SOURCES ??= (function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) return d.name === 'i18n' || d.name === '__tests__' ? [] : walk(p);
      return /\.tsx?$/.test(d.name) ? [[path.relative(ROOT, p), fs.readFileSync(p, 'utf8')]] : [];
    });
  })(path.join(ROOT, 'src'));
  for (let segs = key.split('.'); segs.length > 1; segs = segs.slice(0, -1)) {
    const k = segs.join('.');
    const files = SOURCES.filter(([, src]) => src.includes(`'${k}`) || src.includes(`\`${k}`)).map(([f]) => f);
    if (files.length) return files;
  }
  return [];
}
const glossaryFor = (leaf, langs) =>
  GLOSSARY.terms
    .filter((term) =>
      forms(leaf).some((s) => new RegExp(`\\b${term.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(s)),
    )
    .map((term) => ({ en: term.en, ...(term.note ? { note: term.note } : {}), ...pick(term, langs) }));
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));

// --- commands ----------------------------------------------------------------------------------------------------
function fail(message) {
  console.error(message);
  process.exit(1);
}
const byLang = (pairs) => {
  const m = {};
  for (const [lang, key] of pairs) (m[lang] ??= []).push(key);
  return Object.entries(m).map(([l, ks]) => `  ${l}: ${ks.length}${ks.length <= 5 ? ` (${ks.join(', ')})` : ''}`);
};

function status() {
  const { needs, invalid, extra, removed, state } = survey();
  const counts = {};
  for (const n of needs.values()) counts[n.change] = (counts[n.change] ?? 0) + 1;
  const review = Object.entries(state.review).flatMap(([l, ks]) => ks.map((k) => [l, k]));
  console.log(
    needs.size
      ? `Keys needing translation: ${needs.size} (${Object.entries(counts)
          .map(([c, n]) => `${n} ${c}`)
          .join(', ')})`
      : 'Every key is translated in every ready language.',
  );
  if (needs.size) console.log(byLang([...needs].flatMap(([k, n]) => n.langs.map((l) => [l, k]))).join('\n'));
  if (invalid.length) console.log(`Invalid translations: ${invalid.length}\n  ${invalid.join('\n  ')}`);
  if (extra.length) console.log(`Keys English no longer has: ${extra.join(', ')}`);
  if (removed.length) console.log(`Removed from English since the last apply: ${removed.length}`);
  console.log(
    `Awaiting review by a person: ${review.length} (${review.filter(([, k]) => isSensitive(k)).length} health, safety, privacy or legal)`,
  );
  return { needs, invalid, extra, review };
}

function tasks() {
  const { E, T, state, needs } = survey();
  if (!needs.size) {
    if (fs.existsSync(TASKS_FILE)) fs.rmSync(TASKS_FILE);
    return console.log('Nothing to translate.');
  }
  const items = [...needs].map(([key, n]) => ({
    key,
    change: n.change,
    en: E[key],
    ...(n.change === 'modified' ? { previousEn: state.en[key] } : {}),
    placeholders: placeholders(E[key]),
    ...(isPlural(E[key]) ? { pluralForms: Object.fromEntries(n.langs.map((l) => [l, REQUIRED_PLURALS[l]])) } : {}),
    ...(isSensitive(key) ? { sensitive: 'Health, safety, privacy or legal: translate the meaning exactly.' } : {}),
    usedIn: usedIn(key),
    glossary: glossaryFor(E[key], n.langs),
    translations: Object.fromEntries(
      n.langs.map((l) => [
        l,
        { text: null, source: 'machine', ...(T[l][key] !== undefined ? { current: T[l][key] } : {}) },
      ]),
    ),
  }));
  const file = {
    instructions: [
      'Fill each translations.<lang>.text (a string, or an object of plural forms where English has one) and run npm run i18n:apply.',
      'Keep every {placeholder} exactly, and the leading/trailing spaces and line breaks English has.',
      'Leave text null to skip. Set source to "human" only when a person translated or reviewed it; "machine" marks it for review.',
      `Style and terms: docs/LOCALIZATION.md. Address: ${JSON.stringify(GLOSSARY.address)}.`,
    ],
    items,
  };
  fs.writeFileSync(TASKS_FILE, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, TASKS_FILE)}: ${items.length} keys.`);
}

function apply(force) {
  if (!fs.existsSync(TASKS_FILE)) fail('No tasks.json. Run npm run i18n:tasks first.');
  const file = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
  const { E, T, state, needs, removed } = survey();
  const errors = [];
  const writes = {}; // lang → [[key, leaf]]
  const applied = [];
  for (const item of file.items) {
    for (const [lang, entry] of Object.entries(item.translations ?? {})) {
      if (entry?.text == null) continue;
      if (!LANGS.includes(lang)) errors.push(`${lang} ${item.key}: not a ready language`);
      else if (!(item.key in E)) errors.push(`${lang} ${item.key}: English no longer has this key`);
      else if (!same(item.en, E[item.key]))
        errors.push(`${lang} ${item.key}: English changed since tasks.json was made`);
      else if (!force && !needs.get(item.key)?.langs.includes(lang) && T[lang][item.key] !== undefined)
        console.log(`Kept ${lang} ${item.key}: it is already translated and current (use --force to replace).`);
      else {
        const p = problems(E[item.key], entry.text, lang);
        if (p.length) errors.push(`${lang} ${item.key}: ${p.join('; ')}`);
        else {
          (writes[lang] ??= []).push([item.key, entry.text]);
          applied.push({ key: item.key, lang, human: entry.source === 'human' });
        }
      }
    }
  }
  if (errors.length) fail(`Nothing applied. Fix these in tasks.json:\n  ${errors.join('\n  ')}`);
  // Keys English dropped leave every catalog too.
  for (const lang of LANGS) {
    const gone = Object.keys(T[lang]).filter((k) => !(k in E));
    if (gone.length) (writes[lang] ??= []).push(...gone.map((k) => [k, null]));
  }
  const files = Object.entries(writes).map(([lang, changes]) => writeCatalog(lang, changes));
  if (files.length)
    execFileSync(path.join(ROOT, 'node_modules/.bin/prettier'), ['--write', ...files], { stdio: 'ignore' });

  // Record what each translation was made against.
  for (const { key, lang, human } of applied) {
    state.stale[lang] = (state.stale[lang] ?? []).filter((k) => k !== key);
    state.review[lang] = (state.review[lang] ?? []).filter((k) => k !== key);
    if (!human) state.review[lang].push(key);
  }
  for (const key of new Set(applied.map((a) => a.key))) {
    if (needs.get(key)?.change === 'modified')
      for (const lang of LANGS)
        if (!applied.some((a) => a.key === key && a.lang === lang) && T[lang][key] !== undefined)
          (state.stale[lang] ??= []).push(key);
    state.en[key] = E[key];
  }
  for (const key of removed) delete state.en[key];
  for (const m of [state.stale, state.review])
    for (const lang of Object.keys(m)) m[lang] = m[lang].filter((k) => k in E);
  saveState(state);

  // Keep only what is still untranslated in tasks.json.
  const done = new Set(applied.map((a) => `${a.lang} ${a.key}`));
  file.items = file.items
    .map((i) => ({
      ...i,
      translations: Object.fromEntries(Object.entries(i.translations).filter(([l]) => !done.has(`${l} ${i.key}`))),
    }))
    .filter((i) => Object.keys(i.translations).length);
  if (file.items.length) fs.writeFileSync(TASKS_FILE, `${JSON.stringify(file, null, 2)}\n`);
  else fs.rmSync(TASKS_FILE);
  console.log(`Applied ${applied.length} translations (${applied.filter((a) => !a.human).length} marked for review).`);
  for (const lang of Object.keys(writes))
    if (!fs.readFileSync(path.join(I18N, 'index.ts'), 'utf8').includes(`locales/${lang}'`))
      console.log(`New catalog ${lang}: add its loader to LOADERS in src/i18n/index.ts.`);
}

function check(strict) {
  const { needs, invalid, extra, review } = status();
  const sensitive = review.filter(([, k]) => isSensitive(k));
  if (strict && sensitive.length) console.log(byLang(sensitive).join('\n'));
  if (needs.size || invalid.length || extra.length || (strict && sensitive.length)) fail('Localization check failed.');
  console.log('Localization check passed.');
}

function approve(lang, prefix = '') {
  if (!lang) fail('Usage: npm run i18n:approve -- <lang|all> [key-prefix]');
  const state = loadState();
  let n = 0;
  for (const l of lang === 'all' ? Object.keys(state.review) : [lang]) {
    const before = state.review[l]?.length ?? 0;
    state.review[l] = (state.review[l] ?? []).filter(
      (k) => !(k === prefix || k.startsWith(prefix ? `${prefix}.` : '')),
    );
    n += before - state.review[l].length;
  }
  saveState(state);
  console.log(`Marked ${n} translations as reviewed.`);
}

/** Start tracking from the catalogs as they are. Existing translations count as machine-made, awaiting review. */
function baseline(force) {
  if (loadState() && !force) fail('state.json already exists (use --force to rebuild it).');
  const E = flatten(require(path.join(I18N, 'locales/en.ts')).en);
  const review = Object.fromEntries(LANGS.map((l) => [l, Object.keys(flatten(loadCatalog(l))).filter((k) => k in E)]));
  saveState({ en: E, stale: {}, review });
  console.log(`Baseline: ${Object.keys(E).length} English keys, ${LANGS.length} languages.`);
}

const [cmd, ...args] = process.argv.slice(2);
const flag = (f) => args.includes(f);
const positional = args.filter((a) => !a.startsWith('--'));
const COMMANDS = {
  status,
  tasks,
  apply: () => apply(flag('--force')),
  check: () => check(flag('--strict')),
  approve: () => approve(...positional),
  baseline: () => baseline(flag('--force')),
};
if (!((cmd ?? 'status') in COMMANDS)) fail(`Unknown command: ${cmd}`);
COMMANDS[cmd ?? 'status']();
