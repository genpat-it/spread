// Every executable SPREAD option, in every UI language, phrased with the label
// the user actually sees, must resolve to that option and value.
// Run: node tests/assistant/coverage.mjs   (fixtures from dump_context.py)
import { context } from './harness.mjs';
import { interpret, splitClauses } from '../../js/assistant-intents.js';

const VERBS = {
  it: { on: ['mostra', 'attiva'], off: ['nascondi', 'disattiva'], set: 'imposta', to: 'a', run: '' },
  en: { on: ['show', 'enable'], off: ['hide', 'disable'], set: 'set', to: 'to', run: '' },
  fr: { on: ['affiche', 'active'], off: ['masque', 'désactive'], set: 'règle', to: 'à', run: '' }
};
const POS = /^(on|show|shown|show_[a-z_]+|active|apply)$/;
const NEG = /^(off|hide|hidden|hide_[a-z_]+|not-active|not-apply)$/;

function resolve(ctx, message) {
  const out = [];
  for (const clause of splitClauses(message)) {
    const result = interpret(clause, ctx);
    if (result?.actions) out.push(...result.actions);
    else return { error: result?.error || 'no match' };
  }
  return { actions: out };
}

let total = 0;
const failures = [];
const records = [];
for (const lang of ['it', 'en', 'fr']) {
  const ctx = context(lang);
  const v = VERBS[lang];
  const GROUPS = [
    ['legend:6', 'settings/node-style:0'],
    ['tree:8', 'map:8', 'metadata-card:0', 'legend:2', 'assistant:select#all'],
    ['tree:9', 'map:9', 'metadata-card:1', 'legend:4', 'zooms:6', 'assistant:select#clear']
  ];
  const key = (action) => action.id === 'assistant:select' ? `assistant:select#${action.value?.mode}` : action.id;
  const equivalent = (expected, got, action) => {
    if (got === expected.id) return true;
    if (GROUPS.some((group) => group.includes(expected.id) && group.includes(key(action)))) return true;
    if (expected.id.startsWith('zooms-filtered:') && got === expected.id.replace('zooms-filtered:', 'zooms:').replace(/:(\d+)$/, (m, n) => ':' + (Number(n) + 4))) return true;
    const a = ctx.catalog.find((entry) => entry.id === got);
    return a && a.label === expected.label && a.type === expected.type && a.area.split('/')[0] === expected.area.split('/')[0] || (a && a.label === expected.label && a.type === expected.type && expected.type === 'abutton');
  };
  for (const entry of ctx.catalog) {
    if (entry.valueRequired && entry.options.length === 0 && !['number', 'slider', 'search', 'text'].includes(entry.type)) continue; // empty selects (no ReporTree zooms loaded)
    const named = !/^[a-z]+(?: [a-z]+)*$/.test(entry.label) || entry.type === 'abutton' || entry.options.length === 0 ? entry.label : '';
    const cases = [];
    const polar = entry.options.length === 2 && entry.options.some((o) => POS.test(String(o.value))) && entry.options.some((o) => NEG.test(String(o.value)));
    if (polar) {
      const topic = named || entry.options.find((o) => POS.test(String(o.value))).label;
      const on = entry.options.find((o) => POS.test(String(o.value))).value;
      const off = entry.options.find((o) => NEG.test(String(o.value))).value;
      const bareTopic = topic.replace(/^(mostra|nascondi|show|hide|affiche[rz]?|masque[rz]?)\s+/i, '');
      for (const verb of v.on) cases.push([`${verb} ${bareTopic}`, on]);
      for (const verb of v.off) cases.push([`${verb} ${bareTopic}`, off]);
    } else if (entry.options.length) {
      // Unlabelled radios/toggles: users name the topic ("rendering statico").
      const optionWords = new Set(entry.options.flatMap((option) => option.terms.join(' ').toLowerCase().split(/\s+/)));
      const topic = named || (entry.terms[0] || '').split(/\s+/).filter((word) => !optionWords.has(word.toLowerCase())).join(' ');
      const labels = entry.options.map((option) => option.label);
      if (new Set(labels).size < labels.length) continue; // checkbox with one label: covered by EXTRA below
      for (const option of entry.options) cases.push([`${topic ? topic + ' ' : ''}${option.label}`.trim(), option.value]);
    } else if (['number', 'slider'].includes(entry.type)) {
      const value = Number.isFinite(entry.min) && Number.isFinite(entry.max) ? Math.round((entry.min + entry.max) / 2) : Number.isFinite(entry.min) ? entry.min + 3 : 3;
      cases.push([`${v.set} ${entry.label} ${v.to} ${value}`, value]);
      cases.push([`${entry.label} ${value}`, value]);
    } else if (['search', 'text'].includes(entry.type)) {
      cases.push([`${entry.label} "IT-003"`, 'IT-003']);
    } else {
      cases.push([entry.label, undefined]);
    }
    // Same visible wording in two panels: users add the panel ("…dei rami").
    const HINT = {
      it: { metadata: 'nella tabella', 'settings/branch-style': 'dei rami' },
      en: { metadata: 'in the table', 'settings/branch-style': 'of branches' },
      fr: { metadata: 'dans le tableau', 'settings/branch-style': 'des branches' }
    }[lang][entry.area];
    if (HINT) cases.forEach((pair) => { pair[0] = `${pair[0]} ${HINT}`; });
    for (const [phrase, value] of cases) {
      total++;
      const result = resolve(ctx, phrase);
      const action = result.actions?.length === 1 ? result.actions[0] : undefined;
      const ok = action && equivalent(entry, action.id, action) && (value === undefined || action.id.startsWith('assistant:select') || String(action.value) === String(value));
      if (!ok) failures.push(`[${lang}] ${entry.id} “${phrase}” → expected ${value === undefined ? '' : value} got ${JSON.stringify(result.actions || result.error)}`);
      records.push({ lang, id: entry.id, area: entry.area, label: entry.label || entry.terms[0] || entry.id, phrase, ok: Boolean(ok) });
    }
  }
}
// Hand-written phrasings for checkbox-style toggles and common requests.
const EXTRA = {
  it: [['mostra solo i selezionati nella tabella', 'metadata:0', 'show_selected'], ['mostra tutte le righe nella tabella', 'metadata:0', 'show_all'],
       ['velocità del video 1.5x', 'video-player:speed', '1.5'], ['riproduci il video', 'video-player:play'], ['metti in pausa il video', 'video-player:pause']],
  en: [['show only selected rows in the table', 'metadata:0', 'show_selected'], ['show all rows in the table', 'metadata:0', 'show_all'],
       ['timeline speed 0.5x', 'video-player:speed', '0.5'], ['play the timeline', 'video-player:play']],
  fr: [['afficher seulement les lignes sélectionnées dans le tableau', 'metadata:0', 'show_selected'], ['vitesse de lecture 2x', 'video-player:speed', '2']]
};
for (const [lang, list] of Object.entries(EXTRA)) {
  const ctx = context(lang);
  for (const [phrase, id, value] of list) {
    total++;
    const result = resolve(ctx, phrase);
    const action = result.actions?.length === 1 ? result.actions[0] : undefined;
    if (!(action && action.id === id && (value === undefined || String(action.value) === value))) failures.push(`[${lang}] ${id} “${phrase}” → expected ${value ?? ''} got ${JSON.stringify(result.actions || result.error)}`);
  }
}
console.log(`coverage: ${total - failures.length}/${total} phrases resolved to the right option`);
for (const failure of failures) console.log('  FAIL', failure);
if (process.argv.includes('--json')) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(new URL('./coverage-results.json', import.meta.url), JSON.stringify(records, null, 1));
}
process.exitCode = failures.length ? 1 : 0;
