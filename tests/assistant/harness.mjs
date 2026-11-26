// Node harness: builds a parser context from a dumped live context fixture.
import { readFileSync } from 'node:fs';
import { parseClause, resolveCatalog, splitClauses } from '../../js/assistant-intents.js';
export function context(lang) {
  const raw = JSON.parse(String(readFileSync(new URL(`./context.${lang}.json`, import.meta.url))).replace(/-?Infinity/g, "null"));
  const rows = raw.rows;
  return {
    lang, columns: raw.columns.filter((c) => c !== 'nothing'), protectedColumns: raw.protectedColumns,
    values: (column) => [...new Set(rows.map((row) => row[column]).filter((value) => value !== undefined && String(value).trim() !== '').map(String))],
    ids: rows.map((row) => String(row.ID)), displayCategory: raw.displayCategory,
    catalog: raw.catalog, has: () => true
  };
}
export function plan(message, lang) {
  const ctx = context(lang);
  return splitClauses(message).map((clause) => {
    const parsed = parseClause(clause, ctx);
    if (parsed) return { clause, ...parsed };
    const generic = resolveCatalog(ctx, clause);
    return { clause, ...(generic || { none: true }) };
  });
}
if (process.argv[1] && process.argv[1].endsWith("harness.mjs") && process.argv[2]) {
  const lang = process.argv[3] || 'it';
  for (const line of process.argv[2].split('|')) console.log(JSON.stringify(plan(line, lang)));
}
