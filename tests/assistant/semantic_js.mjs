// The example bank as the app uses it (js/assistant-examples.js + parser),
// measured on the held-out set and on the coverage phrases.
// Run: node tests/assistant/semantic_js.mjs   (after build_examples.py)
import { readFileSync } from 'node:fs';
import { context } from './harness.mjs';
import { interpret, splitClauses, valueFor } from '../../js/assistant-intents.js';
import { buildIndex, matchExamples, proposal, SIMILARITY } from '../../js/assistant-examples.js';
import * as examples from '../../js/assistant-examples.js';
const K = Number(process.env.K || examples.TOP_K);
const T = Number(process.env.T || SIMILARITY);
import { CASES } from './semantic_heldout.mjs';

const bank = JSON.parse(readFileSync(new URL('../../js/assistant-examples.json', import.meta.url)));
const contexts = {};
const index = {};
function answer(lang, text) {
  const ctx = contexts[lang] ||= context(lang);
  index[lang] ||= buildIndex(bank, new Set(ctx.catalog.map((entry) => entry.key)));
  const clause = splitClauses(text)[0] || text;
  const result = interpret(clause, ctx);
  const proposed = proposal({ result, matches: matchExamples(index[lang], clause, 3, K).filter((m) => m.similarity >= T).map((m) => ({ ...m, similarity: Math.max(m.similarity, SIMILARITY) })), catalog: ctx.catalog, text: clause, valueFor });
  if (proposed) return { id: proposed.entry.id, proposed: true };
  return { id: result?.actions?.[0]?.id ?? (result?.query || result?.stats || result?.macro || result?.locate ? 'structured' : null), proposed: false };
}

let ok = 0, wrong = 0, missed = 0, proposedOk = 0, proposedAll = 0;
const errors = [];
for (const [lang, text, expected] of CASES) {
  const { id, proposed } = answer(lang, text);
  if (proposed) { proposedAll += 1; if (id === expected) proposedOk += 1; }
  if (id === expected) ok += 1;
  else if (id) { wrong += 1; errors.push(`${lang} ${text} -> ${id} want ${expected}${proposed ? ' (proposed)' : ''}`); }
  else missed += 1;
}
console.log(`held-out: ok ${ok} wrong ${wrong} missed ${missed} of ${CASES.length}; proposals ${proposedOk}/${proposedAll} right`);
if (process.argv.includes('-v')) errors.forEach((line) => console.log('  ' + line));

// Phrases the parser resolves today must not become proposals.
const coverage = JSON.parse(readFileSync(new URL('./coverage-results.json', import.meta.url)));
const changed = coverage.filter((record) => record.ok && answer(record.lang, record.phrase).proposed);
console.log(`coverage phrases turned into proposals: ${changed.length}/${coverage.filter((record) => record.ok).length}`);
changed.slice(0, 10).forEach((record) => console.log('  ' + record.lang + ' ' + record.phrase));
