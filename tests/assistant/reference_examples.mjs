// Natural English example prompts per option, built from the interface's own
// English labels and kept only if the parser resolves them to that option.
import { readFileSync, writeFileSync } from 'node:fs';
import { context } from './harness.mjs';
import { interpret, splitClauses } from '../../js/assistant-intents.js';
const ctx = context('en');
const raw = JSON.parse(String(readFileSync(new URL('./context.en.json', import.meta.url))).replace(/-?Infinity/g, 'null'));
const POS = /^(on|show|shown|show_[a-z_]+|active|apply)$/;
const NEG = /^(off|hide|hidden|hide_[a-z_]+|not-active|not-apply)$/;
const HINT = { 'settings/branch-style': 'of branches', 'settings/branch-cutoffs': 'for long branches', 'settings/rendering': 'rendering', legend: 'in the legend', metadata: 'in the table', 'metadata-card': 'in the table', map: 'on the map', zooms: 'cluster' };
const clean = (text) => String(text || '').toLowerCase().replace(/\s*\(%\)/g, '').replace(/^\./, '').trim();
// Menu items that do exactly what an assistant action does.
const GROUPS = [['tree:8', 'map:8', 'metadata-card:0', 'legend:2', 'select#all'], ['tree:9', 'map:9', 'metadata-card:1', 'legend:4', 'zooms:6', 'select#clear'], ['legend:7', 'settings/node-style:0']];
const out = {};
for (const entry of ctx.catalog) {
  const name = clean((raw.locations[entry.id]?.path || []).slice(-1)[0] || entry.label).split(' / ')[0];
  const label = clean(entry.label).split(' / ')[0];
  const hint = HINT[entry.area] || '';
  const options = (entry.options || []).map((option) => ({ value: option.value, label: clean(option.label) }));
  const candidates = [];
  const polar = options.length === 2 && options.some((o) => POS.test(String(o.value))) && options.some((o) => NEG.test(String(o.value)));
  if (polar) {
    const on = options.find((o) => POS.test(String(o.value)));
    const off = options.find((o) => NEG.test(String(o.value)));
    const topic = (label || on.label).replace(/^(show|hide|display)\s+/, '');
    for (const [phrase, value] of [[on.label, on.value], [off.label, off.value], [`show ${topic}`, on.value], [`hide ${topic}`, off.value], [`show ${topic} ${hint}`, on.value], [`hide ${topic} ${hint}`, off.value], [`enable ${topic}`, on.value], [`disable ${topic}`, off.value]]) candidates.push([phrase, value]);
  } else if (options.length) {
    for (const option of options.slice(0, 3)) candidates.push([`${label} ${option.label}`, option.value], [option.label, option.value], [`${option.label} ${hint}`, option.value]);
  } else if (['number', 'slider'].includes(entry.type)) {
    const v = Number.isFinite(entry.min) && Number.isFinite(entry.max) ? Math.round((entry.min + entry.max) / 2) : (entry.min || 0) + 3;
    candidates.push([`${name} ${v}`, v], [`${name} ${v} ${hint}`, v], [`set ${name} to ${v}`, v]);
  } else if (['search', 'text'].includes(entry.type)) candidates.push([`${name} "IT-003"`, 'IT-003']);
  else candidates.push([name, undefined], [`${name} ${hint}`, undefined]);
  const kept = [];
  for (const [phrase, value] of candidates.map(([p, v]) => [p.replace(/\s+/g, ' ').trim(), v])) {
    if (!phrase || kept.includes(phrase) || !/[a-z]{3}/.test(phrase)) continue;
    const results = splitClauses(phrase).map((clause) => interpret(clause, ctx));
    const action = results.length === 1 && results[0]?.actions?.length === 1 ? results[0].actions[0] : null;
    const same = action && (action.id === entry.id || GROUPS.some((group) => group.includes(entry.id) && group.includes(action.id === 'assistant:select' ? `select#${action.value?.mode}` : action.id)));
    if (same && (value === undefined || action.id !== entry.id || String(action.value) === String(value))) kept.push(phrase);
    if (kept.length === 2) break;
  }
  out[entry.id] = kept;
}
writeFileSync(new URL('./reference-examples.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('options with a verified example:', Object.values(out).filter((list) => list.length).length, '/', Object.keys(out).length);
