// Deterministic natural-language parser for the SPREAD local assistant.
//
// It turns one clause of a request (Italian, English or French) into typed,
// validated assistant actions.  It is a pure module: everything it knows about
// the loaded data and the live SPREAD menus arrives through `ctx`, so it can be
// unit-tested without a browser.
//
// ctx = {
//   lang: 'it' | 'en' | 'fr',
//   columns: [string],            // loaded metadata columns (may include planned ones)
//   protectedColumns: [string],   // never edited, renamed or deleted
//   values(column) -> [string],   // distinct values of a column
//   ids: [string],                // sample IDs
//   displayCategory: string,      // column the tree is currently coloured by
//   catalog: [{ id, area, iid, type, terms: [string], options: [{ value, terms: [string] }], min, max }],
//   has(id) -> boolean            // whether an assistant action id is registered
// }
//
// A result is { actions: [...] } or { error: string }.  `null` means "not
// understood here", so the caller may try its own fallbacks.

const MESSAGES = {
  it: {
    noColumn: (name, columns) => `La colonna “${name}” non esiste. Colonne disponibili: ${columns.join(', ')}.`,
    columnExists: (name) => `La colonna “${name}” esiste già.`,
    protectedColumn: (name) => `La colonna “${name}” non è modificabile.`,
    missingColumn: 'Indica la colonna, per esempio: “nella colonna regione”.',
    missingName: 'Indica il nome della nuova colonna, per esempio: “aggiungi la colonna Pippo”.',
    missingValue: 'Indica il valore da scrivere.',
    noValue: (value, column, suggestions) => `Il valore “${value}” non è presente${column ? ` nella colonna ${column}` : ''}.${suggestions.length ? ` Forse intendevi: ${suggestions.join(', ')}?` : ''}`,
    ambiguousValue: (value, columns) => `Il valore “${value}” compare in più colonne (${columns.join(', ')}): specifica la colonna.`,
    noMatch: 'Nessun campione soddisfa la condizione.',
    badCondition: 'Non ho capito la condizione. Esempi: “dove regione è Lazio”, “con data dopo 2026-01-15”.',
    badColour: (colour) => `Il colore “${colour}” non è riconosciuto. Usa un nome (rosso, blu…) o un codice come #ff0000.`,
    colourSelected: 'SPREAD colora per gruppi: indica il valore da colorare (es. “colora Lazio di rosso”) oppure crea prima una colonna per i selezionati.',
    badTab: 'Il valore non può contenere tabulazioni o ritorni a capo.',
    alreadySelected: 'La selezione è unica e condivisa: i campioni selezionati sono già evidenziati nell’albero, nella mappa e nella tabella. Per vederli scrivi per esempio “selezionali nella mappa”.',
    notFound: (what) => `Non trovo un’opzione per “${what}”. Prova con il nome che vedi nell’interfaccia, o scrivi “aiuto”.`,
    question: 'Non ho capito la domanda. Posso rispondere a: quanti campioni (dove …), quanti valori distinti in una colonna, quanti campioni per gruppo, valore più frequente, minimo/massimo/intervallo, valori mancanti, quali colonne ci sono.',
    macroStep: (clause) => `Non ho capito il passo “${clause}” della macro, quindi non l’ho salvata.`,
    ambiguousAction: (labels) => `Richiesta ambigua: intendi ${labels.map((label) => `“${label}”`).join(' o ')}? Aggiungi un dettaglio (es. nodi, rami, mappa, legenda).`
  },
  en: {
    noColumn: (name, columns) => `Column “${name}” does not exist. Available columns: ${columns.join(', ')}.`,
    columnExists: (name) => `Column “${name}” already exists.`,
    protectedColumn: (name) => `Column “${name}” cannot be modified.`,
    missingColumn: 'Name the column, for example: “in the region column”.',
    missingName: 'Name the new column, for example: “add a column named Pippo”.',
    missingValue: 'Give the value to write.',
    noValue: (value, column, suggestions) => `Value “${value}” is not present${column ? ` in column ${column}` : ''}.${suggestions.length ? ` Did you mean: ${suggestions.join(', ')}?` : ''}`,
    ambiguousValue: (value, columns) => `Value “${value}” appears in several columns (${columns.join(', ')}): name the column.`,
    noMatch: 'No sample matches the condition.',
    badCondition: 'I did not understand the condition. Examples: “where region is Lazio”, “with date after 2026-01-15”.',
    badColour: (colour) => `Colour “${colour}” is not recognised. Use a name (red, blue…) or a code such as #ff0000.`,
    colourSelected: 'SPREAD colours by group: name the value to colour (e.g. “colour Lazio red”) or first create a column for the selected samples.',
    badTab: 'The value cannot contain tabs or line breaks.',
    alreadySelected: 'The selection is shared: selected samples are already highlighted in the tree, the map and the table. To see them, type for example “show them on the map”.',
    notFound: (what) => `I cannot find an option for “${what}”. Try the name shown in the interface, or type “what can you do”.`,
    question: 'I did not understand the question. I can answer: how many samples (where …), how many distinct values in a column, samples per group, most frequent value, min/max/range, missing values, which columns exist.',
    macroStep: (clause) => `I could not understand the macro step “${clause}”, so the macro was not saved.`,
    ambiguousAction: (labels) => `Ambiguous request: do you mean ${labels.map((label) => `“${label}”`).join(' or ')}? Add a detail (e.g. nodes, branches, map, legend).`
  },
  fr: {
    noColumn: (name, columns) => `La colonne « ${name} » n’existe pas. Colonnes disponibles : ${columns.join(', ')}.`,
    columnExists: (name) => `La colonne « ${name} » existe déjà.`,
    protectedColumn: (name) => `La colonne « ${name} » ne peut pas être modifiée.`,
    missingColumn: 'Indiquez la colonne, par exemple : « dans la colonne région ».',
    missingName: 'Indiquez le nom de la nouvelle colonne.',
    missingValue: 'Indiquez la valeur à écrire.',
    noValue: (value, column, suggestions) => `La valeur « ${value} » est absente${column ? ` de la colonne ${column}` : ''}.${suggestions.length ? ` Vouliez-vous dire : ${suggestions.join(', ')} ?` : ''}`,
    ambiguousValue: (value, columns) => `La valeur « ${value} » apparaît dans plusieurs colonnes (${columns.join(', ')}) : précisez la colonne.`,
    noMatch: 'Aucun échantillon ne correspond à la condition.',
    badCondition: 'Je n’ai pas compris la condition.',
    badColour: (colour) => `La couleur « ${colour} » n’est pas reconnue.`,
    colourSelected: 'SPREAD colore par groupes : indiquez la valeur à colorer.',
    badTab: 'La valeur ne peut pas contenir de tabulations ni de retours à la ligne.',
    alreadySelected: 'La sélection est partagée : les échantillons sélectionnés sont déjà mis en évidence dans l’arbre, la carte et le tableau.',
    notFound: (what) => `Je ne trouve pas d’option pour « ${what} ».`,
    question: 'Je n’ai pas compris la question. Je peux répondre : combien d’échantillons (où …), valeurs distinctes d’une colonne, échantillons par groupe, valeur la plus fréquente, min/max, valeurs manquantes, colonnes.',
    macroStep: (clause) => `Je n’ai pas compris l’étape « ${clause} » de la macro ; elle n’a pas été enregistrée.`,
    ambiguousAction: (labels) => `Demande ambiguë : voulez-vous dire ${labels.map((label) => `« ${label} »`).join(' ou ')} ? Ajoutez un détail (nœuds, branches, carte, légende).`
  }
};

export const COLOURS = {
  black: '#000000', nero: '#000000', noir: '#000000',
  white: '#ffffff', bianco: '#ffffff', blanc: '#ffffff',
  red: '#e41a1c', rosso: '#e41a1c', rouge: '#e41a1c',
  green: '#4daf4a', verde: '#4daf4a', vert: '#4daf4a',
  blue: '#377eb8', blu: '#377eb8', azzurro: '#56b4e9', celeste: '#56b4e9', bleu: '#377eb8',
  yellow: '#ffd92f', giallo: '#ffd92f', jaune: '#ffd92f',
  orange: '#ff7f00', arancione: '#ff7f00', arancio: '#ff7f00',
  purple: '#984ea3', viola: '#984ea3', violet: '#984ea3', lilla: '#c8a2c8',
  pink: '#f781bf', rosa: '#f781bf', rose: '#f781bf',
  brown: '#a65628', marrone: '#a65628', marron: '#a65628',
  gray: '#999999', grey: '#999999', grigio: '#999999', gris: '#999999',
  cyan: '#00bcd4', ciano: '#00bcd4', magenta: '#e7298a', fucsia: '#e7298a',
  gold: '#d4af37', oro: '#d4af37', or: '#d4af37'
};

// ---------------------------------------------------------------------------
// Text helpers

// Lower-case and strip accents without changing string length, so indices in
// the folded text can be used to slice the original text (keeps user casing
// for new names and values).
export function fold(text) {
  let out = '';
  for (const char of String(text)) {
    const base = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    out += base.length === char.length ? base : char.toLowerCase().slice(0, char.length).padEnd(char.length, ' ');
  }
  return out;
}

export function norm(text) {
  return fold(text).replace(/[^a-z0-9]+/g, ' ').trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function tolerance(length) { return length >= 8 ? 2 : length >= 4 ? 1 : 0; }

// Fuzzy equality of two normalised strings (typo-tolerant for longer words).
export function similar(a, b) {
  if (a === b) return true;
  const limit = tolerance(Math.min(a.length, b.length));
  return limit > 0 && Math.abs(a.length - b.length) <= limit && levenshtein(a, b) <= limit;
}

function unquote(text) {
  return String(text || '').trim().replace(/^["“”'«»‘’](.*)["“”'«»‘’]$/s, '$1').replace(/^[«"“](.*)$/, '$1').trim();
}

function tokens(text) { return norm(text).split(' ').filter(Boolean); }

function hasWord(text, words) {
  const list = tokens(text);
  return list.some((token) => words.some((word) => (word.length >= 5 ? similar(token, word) : token === word)));
}

function wordRegex(words) {
  return new RegExp(`(?:^|[^a-z0-9])(?:${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|')})(?=$|[^a-z0-9])`, 'i');
}

// ---------------------------------------------------------------------------
// Vocabulary (folded)

const W = {
  column: ['colonna', 'colonne', 'column', 'columns', 'campo', 'campi', 'field', 'attributo', 'variabile', 'variable', 'col'],
  add: ['aggiungi', 'aggiungere', 'aggiunge', 'crea', 'creare', 'inserisci', 'inserire', 'add', 'create', 'insert', 'ajoute', 'ajouter', 'cree', 'creer', 'nuova', 'new', 'nouvelle'],
  remove: ['elimina', 'eliminare', 'rimuovi', 'rimuovere', 'cancella', 'cancellare', 'togli', 'togliere', 'leva', 'levare', 'delete', 'remove', 'drop', 'erase', 'supprime', 'supprimer', 'efface', 'effacer', 'enleve', 'enlever'],
  rename: ['rinomina', 'rinominare', 'rename', 'renomme', 'renommer'],
  replace: ['sostituisci', 'sostituire', 'sovrascrivi', 'sovrascrivere', 'rimpiazza', 'rimpiazzare', 'cambia', 'cambiare', 'modifica', 'modificare', 'correggi', 'correggere', 'trasforma', 'converti', 'replace', 'change', 'overwrite', 'substitute', 'swap', 'convert', 'rewrite', 'remplace', 'remplacer', 'modifie', 'modifier', 'corrige', 'riscrivi', 'rinomina'],
  set: ['imposta', 'impostare', 'metti', 'mettere', 'setta', 'settare', 'assegna', 'assegnare', 'scrivi', 'scrivere', 'riempi', 'riempire', 'compila', 'valorizza', 'set', 'assign', 'fill', 'put', 'write', 'mark', 'segna', 'marca', 'definis', 'definir', 'mets', 'mettre', 'attribue', 'riscrivi'],
  select: ['seleziona', 'selezionare', 'selezionami', 'scegli', 'select', 'pick', 'choose', 'selectionne', 'selectionner', 'selectionnez', 'selectionnes'],
  deselect: ['deseleziona', 'deselezionare', 'deselect', 'unselect', 'deselectionne', 'deselectionner', 'deselectionnez'],
  colour: ['colora', 'colorare', 'colorami', 'coloralo', 'colorala', 'colore', 'colori', 'color', 'colour', 'colorize', 'paint', 'dipingi', 'colorie', 'colorier', 'couleur'],
  selected: ['selezionati', 'selezionate', 'selezionato', 'selezionata', 'selected', 'selection', 'selezione', 'selectionnes', 'selectionnees', 'selectionne'],
  all: ['tutto', 'tutti', 'tutte', 'all', 'everything', 'everyone', 'tous', 'toutes', 'tout', 'ogni', 'every', 'ovunque', 'everywhere', 'intero', 'intera', 'whole']
};

// Any of these at the start of a clause marks a new command when splitting
// compound requests ("seleziona Lazio e poi nascondili").
const CLAUSE_VERBS = [
  'apri', 'chiudi', 'mostra', 'mostrami', 'visualizza', 'nascondi', 'colora', 'seleziona', 'deseleziona', 'aggiungi', 'elimina', 'rimuovi',
  'cancella', 'rinomina', 'sostituisci', 'sovrascrivi', 'imposta', 'metti', 'cambia', 'zoom', 'zooma', 'ingrandisci', 'riduci', 'centra', 'ricentra',
  'collassa', 'espandi', 'scarica', 'esporta', 'salva', 'carica', 'riproduci', 'avvia', 'ferma', 'pausa', 'attiva', 'disattiva', 'ordina', 'inquadra',
  'inverti', 'pulisci', 'evidenzia', 'ridisegna', 'togli', 'leva', 'crea', 'assegna', 'porta', 'vai', 'usa', 'passa', 'rendi', 'rendili', 'trasforma', 'trasformali',
  'open', 'close', 'show', 'hide', 'color', 'colour', 'select', 'deselect', 'add', 'delete', 'remove', 'rename', 'replace', 'set', 'change',
  'center', 'centre', 'recenter', 'collapse', 'expand', 'download', 'export', 'save', 'load', 'play', 'pause', 'stop', 'enable', 'disable',
  'sort', 'fit', 'invert', 'clear', 'highlight', 'redraw', 'create', 'turn', 'switch', 'use', 'make', 'seek', 'go',
  'ouvre', 'ferme', 'affiche', 'masque', 'colore', 'selectionne', 'deselectionne', 'ajoute', 'supprime', 'renomme', 'remplace', 'definis',
  'agrandis', 'reduis', 'telecharge', 'exporte', 'enregistre', 'lis', 'active', 'desactive', 'trie', 'replie', 'deplie',
  'ouvrez', 'fermez', 'affichez', 'masquez', 'colorez', 'selectionnez', 'deselectionnez', 'ajoutez', 'supprimez', 'renommez', 'remplacez',
  'definissez', 'telechargez', 'exportez', 'enregistrez', 'activez', 'desactivez', 'triez', 'repliez', 'depliez', 'developpez', 'centrez'
];

const CLITIC_WORD = '(?:nascond|collass|espand|selezion|deselezion|color|mostr|elimin|cancell|evidenz|scaric|esport|riduc|ingrand|chiud|apr)(?:i|a|e)(?:li|le|lo|la|mi)';
const CLITIC = /^(nascond|collass|espand|selezion|deselezion|color|mostr|elimin|cancell|evidenz|scaric|esport|riduc|ingrand|chiud|apr)(i|a|e)(li|le|lo|la|mi)$/;

// Expand Italian clitic pronouns ("nascondili" → "nascondi selezionati").
export function expandClitics(text) {
  // English "hide them", French "masque-les": the pronoun is the selection.
  text = String(text).replace(/\b(hide|collapse|expand|colou?r|show|select|delete|remove|export|paint|make)\s+(?:them|those|these)\b/gi, '$1 selected')
    .replace(/\b([a-zà-ÿ]+)-(?:les|la|le)\b/gi, '$1 sélectionnés');
  return String(text).replace(/[A-Za-zÀ-ÿ]+/g, (word) => {
    const match = fold(word).match(CLITIC);
    if (!match) return word;
    // "nascondili/le" = the selected nodes; "mostrala/lo" = the thing just named.
    return ['li', 'le'].includes(match[3]) ? `${match[1]}${match[2]} selezionati` : match[1] + match[2];
  });
}

// "crea una macro Panoramica: apri la mappa, apri i metadati…" is one request.
const MACRO_DEFINITION = /^\s*(?:crea|creare|definisci|definire|registra|salva|fai|create|define|make|record|save|cree|creer|definis|enregistre)\s+(?:una\s+|la\s+|a\s+|the\s+|une\s+|la\s+)?(?:nuova\s+|new\s+|nouvelle\s+)?macro\b(?=.*(?::|\bcome\b|\bche\b|\bcon\b|\bwith\b|\bthat\b|\bas\b|\bqui\b|\bcomme\b|\bavec\b|\bper\b|\bfor\b|\bpour\b|=|->|→))(?!.*\b(?:ultim[ieoa]|last|derni))/i;

export function splitClauses(message) {
  if (MACRO_DEFINITION.test(fold(message))) return [String(message).trim()];
  return splitClausesInner(message);
}

// Commas also separate the steps of a macro definition.
function splitClausesInner(message) {
  const parts = String(message).split(/("[^"]*"|“[^”]*”|«[^»]*»)/);
  const verbs = CLAUSE_VERBS.join('|');
  const conjunction = new RegExp(`(?:\\s*[;\\n]\\s*|\\s+(?:and then|then|e poi|poi|quindi|dopodiche|dopodiché|infine|after that|afterwards|puis|ensuite|et puis)\\s+|\\s*,\\s*(?:e\\s+|and\\s+|et\\s+)?(?=(?:${verbs})\\b)|\\s+(?:and|e|ed|et)\\s+(?=(?:${verbs}|${CLITIC_WORD})\\b))`, 'i');
  const clauses = [''];
  parts.forEach((part, index) => {
    if (index % 2) { clauses[clauses.length - 1] += part; return; }
    const pieces = part.split(conjunction).filter((piece) => piece !== undefined);
    clauses[clauses.length - 1] += pieces[0];
    clauses.push(...pieces.slice(1));
  });
  return clauses.map((clause) => clause.trim().replace(/^(?:e|and|et|poi|then|puis)\s+/i, '').replace(/[.!?]+$/, '').trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Data lookup

function msg(ctx) { return MESSAGES[ctx.lang] || MESSAGES.en; }

function resolveColumn(ctx, name, { includeProtected = true } = {}) {
  const wanted = norm(name);
  if (!wanted) return undefined;
  const columns = ctx.columns.filter((column) => includeProtected || !ctx.protectedColumns.includes(column));
  return columns.find((column) => norm(column) === wanted) ||
    columns.find((column) => norm(column).replace(/ /g, '') === wanted.replace(/ /g, '')) ||
    columns.find((column) => similar(norm(column), wanted)) ||
    columns.find((column) => COLUMN_ALIASES[wanted]?.includes(norm(column))) ||
    columns.find((column) => Object.entries(COLUMN_ALIASES).some(([alias, targets]) => similar(alias, wanted) && targets.includes(norm(column))));
}

// Common translations of metadata column names, so "regione" finds "region".
const COLUMN_ALIASES = {
  regione: ['region'], provincia: ['province'], citta: ['city'], comune: ['municipality', 'city'], paese: ['country'], nazione: ['country'],
  data: ['date', 'sampling date', 'collection date'], anno: ['year'], mese: ['month'], specie: ['species'], ospite: ['host'],
  origine: ['source', 'origin'], esito: ['outcome'], risultato: ['outcome', 'result'],
  lignaggio: ['lineage'], campionamento: ['sampling date', 'sampling_date', 'collection date', 'dataprelievo'], prelievo: ['sampling date', 'sampling_date', 'dataprelievo'], echantillonnage: ['sampling date', 'sampling_date'], sampling: ['sampling date', 'sampling_date'], sierotipo: ['serotype', 'serovar'], sierovariante: ['serovar'], serotipo: ['serotype', 'serovar'], fonte: ['source'], matrice: ['matrix'], tipo: ['type'], cluster: ['cluster'], latitudine: ['latitude'], longitudine: ['longitude'], gruppo: ['cluster', 'group'],
  pays: ['country'], ville: ['city'], annee: ['year'], espece: ['species'], hote: ['host'], resultat: ['outcome', 'result'], lignee: ['lineage']
};

function valueIndex(ctx) {
  if (ctx._valueIndex) return ctx._valueIndex;
  const index = [];
  for (const column of ctx.columns) {
    if (column === 'nothing' || column === '__Node') continue;
    for (const value of ctx.values(column)) {
      const key = norm(value);
      if (key) index.push({ column, value: String(value), key });
    }
  }
  ctx._valueIndex = index;
  return index;
}

// Exact/fuzzy lookup of a user-typed value; returns matches across columns.
function lookupValue(ctx, text, column) {
  const key = norm(text);
  if (!key) return [];
  const pool = valueIndex(ctx).filter((entry) => !column || entry.column === column);
  let found = pool.filter((entry) => entry.key === key);
  if (!found.length) found = pool.filter((entry) => entry.key.replace(/ /g, '') === key.replace(/ /g, ''));
  if (!found.length) found = pool.filter((entry) => similar(entry.key, key));
  if (!found.length) found = closestValues(pool, key);
  return found;
}

// Did-you-mean fallback: the clearly best fuzzy candidate, word by word.
// Each word is compared with prefix bonus and relative edit distance; the
// winner must be close enough and well ahead of the runner-up. The corrected
// value is shown in the plan before anything is applied.
function closestValues(pool, key) {
  const words = key.split(' ').filter(Boolean);
  if (!words.length || key.length < 4) return [];
  const wordScore = (a, b) => {
    if (a === b) return 1;
    const distance = levenshtein(a, b);
    let common = 0;
    while (common < Math.min(a.length, b.length) && a[common] === b[common]) common++;
    return Math.max(0, 1 - distance / Math.max(a.length, b.length)) * 0.8 + Math.min(common, 4) / 4 * 0.2;
  };
  const scored = pool.map((entry) => {
    const target = entry.key.split(' ');
    if (target.length !== words.length) return { entry, score: 0 };
    const score = words.reduce((sum, word, index) => sum + wordScore(word, target[index]), 0) / words.length;
    return { entry, score };
  }).filter((item) => item.score >= 0.62).sort((a, b) => b.score - a.score);
  if (!scored.length) return [];
  const best = scored[0].score;
  const winners = scored.filter((item) => item.score >= best - 0.02);
  const runnerUp = scored.find((item) => item.score < best - 0.02);
  if (new Set(winners.map((item) => item.entry.key)).size > 1) return [];
  if (runnerUp && runnerUp.score > best - 0.08) return [];
  return winners.map((item) => item.entry);
}

function suggestions(ctx, text, column) {
  const key = norm(text);
  return [...new Set(valueIndex(ctx).filter((entry) => (!column || entry.column === column) &&
    (entry.key.includes(key) || key.includes(entry.key) || levenshtein(entry.key, key) <= 3)).map((entry) => entry.value))].slice(0, 5);
}

// Values literally present in a clause (word-bounded), longest first.
function valuesInText(ctx, text) {
  const haystack = ` ${norm(text)} `;
  const hits = valueIndex(ctx).filter((entry) => (entry.key.length > 1 || /\d/.test(entry.key)) && haystack.includes(` ${entry.key} `));
  return hits.sort((a, b) => b.key.length - a.key.length);
}

function columnsInText(ctx, text) {
  const haystack = ` ${norm(text)} `;
  const found = ctx.columns.filter((column) => column !== 'nothing' && haystack.includes(` ${norm(column)} `));
  for (const [alias, targets] of Object.entries(COLUMN_ALIASES)) {
    if (!haystack.includes(` ${alias} `)) continue;
    const column = ctx.columns.find((candidate) => targets.includes(norm(candidate)));
    if (column && !found.includes(column)) found.push(column);
  }
  return found;
}

// "nella colonna X", "column X", "the X column", "colonna di nome X".
const COLUMN_FILLERS = ['nei', 'ai', 'nel', 'dei', 'metadati', 'metadata', 'metadonnees', 'nuova', 'new', 'nouvelle', 'di', 'nome', 'chiamata', 'chiamato', 'denominata',
  'named', 'called', 'name', 'nommee', 'appelee', 'avec', 'le', 'nom', 'una', 'un', 'a', 'the', 'in', 'la', 'une', 'de', 'des', 'du', 'tabella', 'table', 'with', 'con', 'il'];

const PREPOSITIONS = ['dans', 'nella', 'nelle', 'nel', 'della', 'delle', 'dalla', 'sulla', 'alla', 'la', 'le', 'in', 'of', 'the', 'on', 'from', 'to', 'dans', 'de', 'sur', 'per', 'una', 'nuova', 'a', 'into'];

function findColumnPhrase(text) {
  const folded = fold(text);
  const keyword = folded.match(new RegExp(`(?:^|[^a-z0-9])(${W.column.filter((word) => word !== 'col').join('|')}|col[a-z]{0,4}n[a-z]{0,2}|clonna|colona|coloumn|colum)(?=$|[^a-z0-9])`, 'i'));
  if (!keyword) return null;
  let keywordStart = keyword.index + keyword[0].length - keyword[1].length;
  let cursor = keywordStart + keyword[1].length;
  const preposition = folded.slice(0, keywordStart).match(/(?:^|\s)(\S+)\s+$/);
  if (preposition && PREPOSITIONS.some((word) => word === preposition[1] || (preposition[1].length >= 4 && levenshtein(word, preposition[1]) <= 2 && preposition[1][0] === word[0]))) {
    keywordStart -= preposition[0].length - (preposition[0].startsWith(' ') ? 1 : 0);
    const second = folded.slice(0, keywordStart).match(/(?:^|\s)(\S+)\s+$/);
    if (second && ['in', 'dans', 'on', 'of', 'de', 'sur', 'from'].includes(second[1])) keywordStart -= second[0].length - (second[0].startsWith(' ') ? 1 : 0);
  }
  // Words before the keyword: "the region column", "la colonna".
  const before = text.slice(0, keywordStart).trimEnd();
  const after = text.slice(cursor);
  const quoted = after.match(/^\s*(?:[a-zA-Zàèéìòù]+\s+){0,4}?["“«']([^"”»']+)["”»']/);
  if (quoted) return { start: keywordStart, end: cursor + quoted[0].length, name: quoted[1], keywordStart, quoted: true, before };
  const words = [...after.matchAll(/\S+/g)];
  let index = 0;
  while (index < words.length && COLUMN_FILLERS.includes(norm(words[index][0])) && index < 4) index++;
  if (index < words.length) {
    const word = words[index];
    const name = word[0].replace(/[,;:.!?]+$/, '');
    return { start: keywordStart, end: cursor + word.index + word[0].length, name, nameWords: words.slice(index).map((match) => match[0]), keywordStart, before };
  }
  // "the region column"
  const previous = before.match(/(\S+)\s*$/);
  if (previous) {
    let start = before.length - previous[0].length;
    let head = before.slice(0, start);
    for (let step = 0; step < 2; step++) {
      const prep = fold(head).match(/(?:^|\s)(\S+)\s*$/);
      if (!prep || !PREPOSITIONS.includes(prep[1])) break;
      start = head.length - prep[0].length + (prep[0].startsWith(' ') ? 1 : 0);
      head = head.slice(0, start);
    }
    return { start, end: cursor, name: previous[1], keywordStart, before: before.slice(0, before.length - previous[0].length), suffix: true };
  }
  return { start: keywordStart, end: cursor, name: '', keywordStart, before };
}

// Resolve the column after a keyword, accepting multi-word names.
function columnFromPhrase(ctx, phrase) {
  if (!phrase || !phrase.name) return undefined;
  if (phrase.nameWords) {
    for (let count = Math.min(4, phrase.nameWords.length); count >= 1; count--) {
      const candidate = phrase.nameWords.slice(0, count).join(' ').replace(/[,;:.!?]+$/, '');
      const column = resolveColumn(ctx, candidate) || resolveColumn(ctx, candidate.replace(/\s+/g, '_'));
      if (column) return column;
    }
  }
  const column = resolveColumn(ctx, phrase.name);
  if (column) return column;
  const before = phrase.before?.match(/(\S+)\s*$/)?.[1];
  return before ? resolveColumn(ctx, before) : undefined;
}

// ---------------------------------------------------------------------------
// Conditions

const OPERATORS = [
  ['gte', ['>=', '≥', 'almeno', 'maggiore o uguale a', 'at least', 'greater than or equal to', 'au moins', 'da']],
  ['lte', ['<=', '≤', 'al massimo', 'al piu', 'minore o uguale a', 'at most', 'less than or equal to', 'au plus', 'fino a', 'until', 'up to', 'jusqu a']],
  ['ne', ['!=', '<>', '≠', 'diverso da', 'diversa da', 'diversi da', 'non e', 'non uguale a', 'is not', 'isnt', 'not equal to', 'not', 'other than', 'n est pas', 'different de', 'differente de', 'tranne', 'eccetto', 'except', 'sauf']],
  ['gt', ['>', 'maggiore di', 'maggiori di', 'piu di', 'piu grande di', 'superiore a', 'sopra', 'oltre', 'dopo il', 'dopo la', 'dopo', 'successiv[oaie] a', 'greater than', 'more than', 'larger than', 'above', 'over', 'after', 'later than', 'superieur a', 'plus de', 'apres le', 'apres']],
  ['lt', ['<', 'minore di', 'minori di', 'meno di', 'piu piccolo di', 'inferiore a', 'sotto', 'prima del', 'prima della', 'prima di', 'prima', 'precedent[ei] a', 'less than', 'smaller than', 'fewer than', 'below', 'under', 'before', 'earlier than', 'inferieur a', 'moins de', 'avant le', 'avant']],
  ['contains', ['che contiene', 'che contengono', 'contiene', 'contengono', 'contenente', 'containing', 'contains', 'contain', 'including', 'includes', 'contient', 'contenant', 'like', 'come']],
  ['notempty', ['non vuoto', 'non vuota', 'non vuoti', 'non vuote', 'valorizzato', 'valorizzata', 'valorizzati', 'presente', 'not empty', 'non empty', 'present', 'filled', 'non vide', 'renseigne']],
  ['empty', ['vuoto', 'vuota', 'vuoti', 'vuote', 'mancante', 'mancanti', 'assente', 'senza valore', 'is empty', 'empty', 'missing', 'blank', 'vide', 'manquant']],
  ['eq', ['==', '=', ':', 'uguale a', 'uguali a', 'pari a', 'e', 'sono', 'vale', 'is', 'are', 'equals', 'equal to', 'est', 'vaut', 'egal a', 'of', 'di', 'del', 'della', 'in', 'con', 'with']]
];

function opRegex(phrases) {
  return phrases.map((phrase) => phrase.replace(/[.*+?^${}()|\\]/g, (char) => (char === '[' || char === ']' ? char : `\\${char}`)).replace(/ /g, '\\s+')).join('|');
}

function compareValues(op, left, right) {
  if (op === 'empty') return left === undefined || left === null || String(left).trim() === '';
  if (op === 'notempty') return !(left === undefined || left === null || String(left).trim() === '');
  const a = String(left ?? '');
  const b = String(right ?? '');
  if (op === 'contains') return norm(a).includes(norm(b));
  const numeric = a.trim() !== '' && b.trim() !== '' && !Number.isNaN(Number(a)) && !Number.isNaN(Number(b));
  const x = numeric ? Number(a) : norm(a);
  const y = numeric ? Number(b) : norm(b);
  if (op === 'eq') return x === y;
  if (op === 'ne') return x !== y;
  // ISO dates and plain strings compare lexicographically on the raw text.
  const p = numeric ? x : a;
  const q = numeric ? y : b;
  if (op === 'gt') return p > q;
  if (op === 'gte') return p >= q;
  if (op === 'lt') return p < q;
  if (op === 'lte') return p <= q;
  return false;
}

// Rows/IDs matching a `where` clause.  `rows` = [{ ID, ...columns }].
export function matchRows(rows, where) {
  if (!where) return rows;
  if (where.all) return rows.filter((row) => where.all.every((condition) => matchRows([row], condition).length));
  if (where.any) return rows.filter((row) => where.any.some((condition) => matchRows([row], condition).length));
  if (where.ids) {
    const wanted = new Set(where.ids.map(String));
    return rows.filter((row) => wanted.has(String(row.ID)));
  }
  if (where.op === 'in') return rows.filter((row) => where.value.some((value) => compareValues('eq', row[where.column], value)));
  return rows.filter((row) => compareValues(where.op, row[where.column], where.value));
}

function looksLikeDate(value) { return /^\d{4}-\d{2}(-\d{2})?/.test(String(value)); }
function looksNumeric(value) { return String(value).trim() !== '' && !Number.isNaN(Number(value)); }

// Parse one condition ("regione è Lazio", "Teramo", "data dopo 2026-01-15").
function parseCondition(ctx, raw) {
  let text = stripFolded(String(raw).trim(), /^(?:che|which|that|qui|dove|where|ou|quando|when|se|if|con|with|di|del|della|dello|dei|delle|degli|da|dal|dalla|in|nel|nella|from|of|avec|de|du|des)\s+/i).trim();
  text = text.replace(/^(?:(?:la colonna|il campo|column|the column|the|la|il|lo|le|gli|i)\s+|l['’]\s*)/i, '').trim();
  if (!text) return null;
  const folded = fold(text);
  // Explicit "COL OP VALUE" with a known column at the start.
  const words = text.split(/\s+/);
  for (let count = Math.min(4, words.length); count >= 1; count--) {
    const column = resolveColumn(ctx, words.slice(0, count).join(' ')) || resolveColumn(ctx, words.slice(0, count).join('_'));
    if (!column) continue;
    let rest = words.slice(count).join(' ');
    // "regione è diverso da Lazio": drop the copula before a real operator.
    const copula = fold(rest).match(/^(?:e|is|est|sono|are|sont|e'|è)\s+(?=\S+\s+\S)/);
    if (copula && !/^(?:e|is|est)\s+(?:uguale|pari|equal|egal)/.test(fold(rest))) {
      const tail = rest.slice(copula[0].length);
      const operatorFirst = OPERATORS.some(([op, phrases]) => op !== 'eq' && new RegExp(`^(?:${opRegex(phrases)})(?=$|\\s)`, 'i').test(fold(tail)));
      if (operatorFirst) rest = tail;
    }
    const foldedRest = fold(rest);
    for (const [op, phrases] of OPERATORS) {
      const match = foldedRest.match(new RegExp(`^(?:${opRegex(phrases)})(?=$|\\s|[0-9"“«'])\\s*`, 'i'));
      if (!match) continue;
      const value = unquote(rest.slice(match[0].length));
      if (op === 'empty' || op === 'notempty') return { column, op };
      if (!value) continue;
      return finishCondition(ctx, column, op, value);
    }
    if (rest.trim()) return finishCondition(ctx, column, 'eq', unquote(rest));
  }
  // "OP VALUE" without column: infer it from the value.
  for (const [op, phrases] of OPERATORS) {
    if (op === 'eq') continue;
    const match = folded.match(new RegExp(`^(?:${opRegex(phrases)})\\s+`, 'i'));
    if (!match) continue;
    const value = unquote(text.slice(match[0].length));
    const column = inferColumnForValue(ctx, value, op);
    return column ? finishCondition(ctx, column, op, value) : { error: msg(ctx).missingColumn };
  }
  // "VALUE in COLUMN" / bare "VALUE".
  const inColumn = text.match(/^(.+?)\s+(?:in|nella colonna|nel campo|in the column|in column|dans la colonne)\s+(.+)$/i);
  if (inColumn) {
    const column = resolveColumn(ctx, inColumn[2]);
    if (column) return finishCondition(ctx, column, 'eq', unquote(inColumn[1]));
  }
  // Several values: "Lazio o Toscana", "Lazio, Toscana".
  const alternatives = text.split(/\s*(?:,|\bo\b|\boppure\b|\bor\b|\bou\b)\s*/i).map(unquote).filter(Boolean);
  if (alternatives.length > 1) {
    const conditions = alternatives.map((value) => parseCondition(ctx, value));
    if (conditions.every((condition) => condition && !condition.error)) {
      const columns = [...new Set(conditions.map((condition) => condition.column))];
      if (columns.length === 1 && conditions.every((condition) => condition.op === 'eq')) return { column: columns[0], op: 'in', value: conditions.map((condition) => condition.value) };
      return { any: conditions };
    }
  }
  const value = unquote(text.replace(/^(?:dell|dall|nell|sull|all|dell|de|d|l)['’]\s*/i, '')
    .replace(/\s+(?:samples?|campioni|campione|nodes?|nodi|isolates?|isolati|strains?|ceppi|rows?|righe|echantillons?|échantillons?)\s*$/i, ''));
  // A year on its own: a range on the date column ("i campioni del 2026").
  if (/^(?:19|20)\d\d$/.test(value) && !lookupValue(ctx, value).length) {
    const column = inferColumnForValue(ctx, `${value}-01-01`, 'gte');
    if (column) return { all: [{ column, op: 'gte', value }, { column, op: 'lt', value: String(Number(value) + 1) }] };
  }
  const matches = lookupValue(ctx, value);
  const columns = [...new Set(matches.map((entry) => entry.column))];
  if (columns.length === 1) return { column: columns[0], op: 'eq', value: matches[0].value };
  if (columns.length > 1) {
    const active = matches.find((entry) => entry.column === ctx.displayCategory);
    if (active) return { column: active.column, op: 'eq', value: active.value };
    const nonId = matches.filter((entry) => entry.column !== 'ID');
    if (new Set(nonId.map((entry) => entry.column)).size === 1) return { column: nonId[0].column, op: 'eq', value: nonId[0].value };
    return { error: msg(ctx).ambiguousValue(value, columns) };
  }
  return { error: msg(ctx).noValue(value, '', suggestions(ctx, value)) };
}

function inferColumnForValue(ctx, value, op) {
  const candidates = ctx.columns.filter((column) => !['nothing', '__Node', 'ID'].includes(column));
  if (looksLikeDate(value)) {
    const dated = candidates.filter((column) => ctx.values(column).some(looksLikeDate));
    if (dated.length === 1) return dated[0];
  }
  if (op === 'contains') {
    const containing = candidates.filter((column) => ctx.values(column).some((entry) => norm(entry).includes(norm(value))));
    if (containing.length === 1) return containing[0];
  }
  return undefined;
}

function finishCondition(ctx, column, op, value) {
  if (op === 'eq' || op === 'ne') {
    const matches = lookupValue(ctx, value, column);
    if (matches.length) return { column, op, value: matches[0].value };
    if (looksNumeric(value)) return { column, op, value };
    return { error: msg(ctx).noValue(value, column, suggestions(ctx, value, column)) };
  }
  return { column, op, value };
}

// Split "A e B" into conditions only when every side is a valid condition.
function parseConditions(ctx, raw) {
  // OR binds looser than AND: "regione è Lazio e source è food o cluster è A".
  const alternatives = String(raw).split(/\s+(?:oppure|o|or|ou)\s+(?=[^\s])/i);
  if (alternatives.length > 1) {
    const branches = alternatives.map((piece) => parseAll(ctx, piece));
    if (branches.every((branch) => branch && !branch.error)) {
      const columns = new Set(branches.map((branch) => branch.column));
      if (branches.every((branch) => branch.op === 'eq') && columns.size === 1) return { column: branches[0].column, op: 'in', value: branches.map((branch) => branch.value) };
      return { any: branches };
    }
  }
  return parseAll(ctx, raw);
}

// "Enteritidis e Typhimurium" names two values of one column: in everyday
// language that is "both groups" (OR); an AND could never match. Conditions on
// different columns stay AND ("source è food e regione è Abruzzo").
function mergeSameColumn(conditions) {
  const merged = [];
  const byColumn = new Map();
  for (const condition of conditions) {
    const values = condition.op === 'eq' ? [condition.value] : condition.op === 'in' ? condition.value : null;
    if (!values || !condition.column) { merged.push(condition); continue; }
    if (byColumn.has(condition.column)) {
      const target = byColumn.get(condition.column);
      target.value = [...new Set([...target.value, ...values])];
      continue;
    }
    const entry = { column: condition.column, op: 'in', value: [...values] };
    byColumn.set(condition.column, entry);
    merged.push(entry);
  }
  const simplify = (condition) => (condition.op === 'in' && condition.value.length === 1 ? { column: condition.column, op: 'eq', value: condition.value[0] } : condition);
  const result = merged.map(simplify);
  return result.length === 1 ? result[0] : { all: result };
}

function parseAll(ctx, raw) {
  const pieces = String(raw).split(/\s+(?:e anche|and also|e|and|et|ed)\s+(?=[^\s])/i);
  if (pieces.length > 1) {
    const conditions = pieces.map((piece) => parseCondition(ctx, piece));
    if (conditions.every((condition) => condition && !condition.error)) return mergeSameColumn(conditions);
  }
  const single = parseCondition(ctx, raw);
  return single;
}

// IDs listed in text ("IT-001, IT-003 e IT-005").
function idsInText(ctx, text) {
  const ids = new Set(ctx.ids.map(String));
  const found = String(text).split(/[\s,;]+|\s(?:e|and|et)\s/).map((word) => unquote(word.replace(/[.!?]+$/, ''))).filter((word) => ids.has(word));
  return [...new Set(found)];
}

// ---------------------------------------------------------------------------
// Scope ("per i selezionati", "dove regione è Lazio", "per IT-001")

const SCOPE_SELECTED = /\s*(?:,\s*)?(?:(?:solo|soltanto|only|seulement|uniquement)\s+)?(?:per|a|ai|agli|alle|sui|sugli|sulle|nei|negli|nelle|for|to|on|in|pour|aux|sur|les)?\s*(?:i|gli|le|the|les|tutti i|all)?\s*(?:nodi|campioni|righe|elementi|ceppi|isolati|samples|nodes|rows|items|isolates|strains|echantillons|lignes|noeuds)?\s*(?:selezionat[ioae]|selected|selectionne(?:e?s)?|in selezione|della selezione|of the selection|de la selection)(?:\s+(?:nodi|campioni|righe|samples|nodes|rows|items|echantillons|lignes))?(?:\s+(?:only|soltanto|solamente))?/i;
const SCOPE_WHERE = /\s*(?:,\s*)?(?:(?:solo\s+)?(?:per|a|ai|agli|alle|sui|nei|for|to|on|pour|aux|sur)\s+(?:i|gli|le|the|les|tutti i|all)?\s*(?:nodi|campioni|righe|elementi|ceppi|isolati|quelli|quelle|samples|nodes|rows|items|isolates|strains|those|ones|echantillons|lignes|ceux|celles)\s+(?:che hanno|che sono|che|con|di|da|in|del|della|dove|where|with|having|that|which|from|of|ayant|avec|de|dont|ou|qui)|\bdove\b|\bwhere\b|\bwhen\b|\bquando\b|\bse\b|\bif\b|\bou\b|\blorsque\b)\s+/i;

// The value for the samples left out of a condition, at the end of it:
// "e no per gli altri", ", no for the others", "altrimenti no".
function splitOtherValue(text) {
  const other = text.match(/(?:\s*,\s*|\s+(?:e|ed|and|et)\s+)(?:(?:il |un )?valore\s+|(?:the )?value\s+|(?:la )?valeur\s+)?([^,]+?)\s+(?:per|a|ai|agli|for|to|pour|aux)\s+(?:gli|i|le|the|les)?\s*(?:altri|altre|other|others|rest|resto|autres)\s*$/i) ||
    text.match(/\s*(?:,\s*)?(?:altrimenti|otherwise|else|sinon)\s+(.+)$/i);
  return other ? { text: text.slice(0, other.index), otherValue: unquote(other[1]) } : { text, otherValue: undefined };
}

function extractScope(ctx, text) {
  const folded = fold(text);
  const selected = folded.match(SCOPE_SELECTED);
  if (selected && /selez|select/.test(selected[0])) {
    const rest = text.slice(0, selected.index) + text.slice(selected.index + selected[0].length);
    const other = rest.match(/(?:^|\s|,)(?:e|ed|and|et|,)\s+(?:(?:il |un )?valore\s+|(?:the )?value\s+|(?:la )?valeur\s+)?([^,]+?)\s+(?:per|a|ai|agli|for|to|pour|aux)\s+(?:gli|i|le|the|les)?\s*(?:altri|altre|other|others|rest|resto|non selezionati|unselected|autres)\s*$/i) ||
      rest.match(/\s*(?:,\s*)?(?:altrimenti|otherwise|else|sinon)\s+(.+)$/i);
    return { where: { selected: true }, otherValue: other ? unquote(other[1]) : undefined, text: other ? rest.slice(0, other.index) : rest };
  }
  const where = folded.match(SCOPE_WHERE);
  if (where && where.index > 0) {
    const tail = splitOtherValue(text.slice(where.index + where[0].length));
    const condition = parseConditions(ctx, tail.text);
    if (condition && !condition.error) return { where: condition, otherValue: tail.otherValue, text: text.slice(0, where.index) };
    if (condition?.error) return { error: condition.error };
  }
  const prepositions = [...text.matchAll(/\s+(?:per|a|ai|al|sul|sui|for|to|on|pour|aux|au)\s+(?:(?:il|i|the|le|les)\s+)?(?:campion[ei]|sample|samples|nod[oi]|nodes?|echantillons?)?\s*/gi)].reverse();
  for (const preposition of prepositions) {
    const tail = text.slice(preposition.index + preposition[0].length);
    const ids = idsInText(ctx, tail);
    const words = tail.split(/[\s,;]+/).filter((word) => word && !/^(e|and|et)$/i.test(word));
    if (ids.length && ids.length === words.length) return { where: { ids }, text: text.slice(0, preposition.index) };
  }
  const allScope = folded.match(/\s+(?:a|per|in|for|to|on|pour|dans)?\s*(?:tutti|tutte|all|every|tous|toutes)\s+(?:i |gli |le |the |les )?(?:campioni|nodi|righe|valori|samples|nodes|rows|values|echantillons|lignes|valeurs)?\s*$/i);
  if (allScope) return { where: null, all: true, text: text.slice(0, allScope.index) };
  return { where: null, text };
}

// ---------------------------------------------------------------------------
// Intents

// The error of an operation already recognised (add, rename, delete a column):
// final, the generic resolver of the catalog must not replace it with a guess.
function definite(error) {
  return { error, definite: true };
}

function checkNewValue(ctx, value) {
  if (value === undefined || value === null) return msg(ctx).missingValue;
  if (/[\t\r\n]/.test(value)) return msg(ctx).badTab;
  return '';
}

const VALUE_INTRO = /^(?:(?:con|col|with|avec)\s+)?(?:(?:il|un|the|a|le|la|une)\s+)?(?:valor[ei]|value|values|valeur|valeurs|default|predefinito)\s*(?:di\s+|of\s+|de\s+|a\s+|=\s*|:\s*|uguale a\s+|pari a\s+)?|^=\s*|^:\s*/i;

function parseAddColumn(ctx, text, phrase) {
  let name = phrase.name;
  if (!name || W.column.includes(norm(name))) return definite(msg(ctx).missingName);
  name = unquote(name);
  if (resolveColumn(ctx, name) && norm(resolveColumn(ctx, name)) === norm(name)) return definite(msg(ctx).columnExists(resolveColumn(ctx, name)));
  let rest = text.slice(phrase.end);
  const scope = extractScope(ctx, rest);
  if (scope.error) return definite(scope.error);
  rest = scope.text.trim();
  let value = '';
  if (rest) {
    const intro = rest.match(VALUE_INTRO) || rest.match(/^(?:con|with|avec|=|:)\s+/i);
    value = unquote(intro ? rest.slice(intro[0].length) : rest);
  } else {
    const before = text.slice(0, phrase.start).match(/(?:con|with|avec)\s+(?:il\s+|the\s+)?(?:valore|value|valeur)\s+(.+?)\s*$/i);
    if (before) value = unquote(before[1]);
  }
  const problem = value ? checkNewValue(ctx, value) : '';
  if (problem) return definite(problem);
  const action = { id: 'assistant:metadata-add-column', value: { column: name, value } };
  if (scope.where) {
    action.value.where = scope.where;
    action.value.otherValue = scope.otherValue ?? '';
  }
  ctx.columns.push(name);
  ctx._valueIndex = undefined;
  ctx.plannedValues = { ...(ctx.plannedValues || {}), [name]: [value, action.value.otherValue].filter((entry) => entry !== undefined) };
  return { actions: [action] };
}

function parseDeleteColumns(ctx, text, phrase) {
  const after = phrase.suffix ? '' : text.slice(phrase.keywordStart).replace(/^\S+\s*/, '');
  const names = after.split(/\s*(?:,|\be\b|\band\b|\bet\b|&)\s*/).map((name) => unquote(name.replace(/^(?:la|le|il|the|colonna|colonne|column|columns)\s+/i, ''))).filter(Boolean);
  const listed = names.length ? names : [phrase.name];
  const columns = [];
  for (const name of listed) {
    const column = resolveColumn(ctx, name) || (phrase.before && resolveColumn(ctx, phrase.before.match(/(\S+)\s*$/)?.[1] || ''));
    if (!column) return definite(msg(ctx).noColumn(name, editable(ctx)));
    if (ctx.protectedColumns.includes(column)) return definite(msg(ctx).protectedColumn(column));
    columns.push(column);
  }
  return { actions: [...new Set(columns)].map((column) => ({ id: 'assistant:metadata-delete-column', value: { column } })) };
}

function editable(ctx) { return ctx.columns.filter((column) => !ctx.protectedColumns.includes(column)); }

function parseRenameColumn(ctx, text) {
  const folded = fold(text);
  const match = folded.match(/(?:rinomina(?:re)?|rename|renomme(?:r)?|(?:cambia|change|modifica|modifie)\s+(?:il\s+|the\s+|le\s+)?(?:nome|name|nom))\s+(?:(?:della|la|il|the|of the|of|de la|la)\s+)?(?:colonn[ae]|column|campo|field)?\s*(?:"([^"]+)"|“([^”]+)”|(\S+(?:\s+\S+){0,3}?))\s+(?:in|to|come|as|en|->|→|=>|con|with|into)\s+(.+)$/i);
  if (!match) return null;
  const start = match.index + match[0].length - match[0].length;
  const fromRaw = match[1] || match[2] || text.slice(start + match[0].indexOf(match[3]), start + match[0].indexOf(match[3]) + match[3].length);
  const toRaw = unquote(text.slice(text.length - match[4].length));
  const from = resolveColumn(ctx, fromRaw.replace(/^(?:colonna|column|campo)\s+/i, ''));
  if (!from) return { error: msg(ctx).noColumn(unquote(fromRaw), editable(ctx)) };
  if (ctx.protectedColumns.includes(from)) return definite(msg(ctx).protectedColumn(from));
  if (!toRaw) return definite(msg(ctx).missingName);
  if (resolveColumn(ctx, toRaw) && norm(resolveColumn(ctx, toRaw)) === norm(toRaw)) return definite(msg(ctx).columnExists(toRaw));
  const problem = checkNewValue(ctx, toRaw);
  if (problem) return definite(problem);
  ctx.columns.splice(ctx.columns.indexOf(from), 1, toRaw);
  ctx._valueIndex = undefined;
  return { actions: [{ id: 'assistant:metadata-rename-column', value: { from, to: toRaw } }] };
}

// "sostituisci Teramo con Roma nella colonna X", "cambia Teramo in Roma".
function parseReplace(ctx, text) {
  const phrase = findColumnPhrase(text);
  let column = phrase ? columnFromPhrase(ctx, phrase) : undefined;
  if (phrase && phrase.name && !column && !W.all.includes(norm(phrase.name))) return { error: msg(ctx).noColumn(phrase.name, editable(ctx)) };
  let body = phrase ? (text.slice(0, phrase.start) + ' ' + text.slice(phrase.end)) : text;
  body = body.replace(/\s+/g, ' ').trim();
  const scope = extractScope(ctx, body);
  if (scope.error) return scope;
  body = scope.text.trim();
  const verb = fold(body).match(/^(\S+)\s*/);
  if (verb && [...W.replace, ...W.set].some((word) => (word.length >= 6 ? similar(verb[1], word) : verb[1] === word))) body = body.slice(verb[0].length);
  body = body.replace(/^(?:(?:tutt[ie]\s+)?(?:i|gli|le|the|all|les|tous les|toutes les)\s+)?(?:valor[ei]|values?|valeurs?|occorrenz[ae]|occurrences?|testo|text)\s+(?:di|of|de|del|della|dei|uguali a|equal to)?\s*/i, '')
    .replace(/^(?:il|lo|la|the|le|un)\s+(?:valore|value|valeur)\s+/i, '').trim();
  const folded = fold(body);
  const connectors = [...folded.matchAll(/\s+(?:con il valore|con il|con|col|with the value|with|by|par|in|into|to|a|al|en|->|→|=>|diventa|becomes|devient)\s+/gi)];
  // Try split points; prefer a left side that exists as a value.
  let best;
  for (const connector of connectors) {
    const left = unquote(body.slice(0, connector.index));
    let right = unquote(body.slice(connector.index + connector[0].length).replace(VALUE_INTRO, ''));
    if (!left || !right) continue;
    const matches = lookupValue(ctx, left, column);
    const exact = matches.some((entry) => entry.key === norm(left));
    const score = (matches.length ? 2 : 0) + (exact ? 1 : 0);
    if (!best || score > best.score) best = { left, right, matches, score };
  }
  if (!best) return null;
  const { left, right } = best;
  const problem = checkNewValue(ctx, right);
  if (problem) return { error: problem };
  if (W.all.includes(norm(left).split(' ')[0])) {
    if (!column) return { error: msg(ctx).missingColumn };
    return setAction(ctx, column, right, scope.where);
  }
  if (!best.matches.length) return { error: msg(ctx).noValue(left, column, suggestions(ctx, left, column)) };
  const columns = [...new Set(best.matches.map((entry) => entry.column))];
  if (!column) {
    const editableColumns = columns.filter((candidate) => !ctx.protectedColumns.includes(candidate));
    if (editableColumns.length > 1) return { error: msg(ctx).ambiguousValue(left, editableColumns) };
    column = editableColumns[0] || columns[0];
  }
  if (ctx.protectedColumns.includes(column)) return { error: msg(ctx).protectedColumn(column) };
  const old = best.matches.find((entry) => entry.column === column)?.value ?? best.matches[0].value;
  const condition = { column, op: 'eq', value: old };
  return setAction(ctx, column, right, scope.where ? { all: [condition, scope.where] } : condition);
}

function setAction(ctx, column, value, where) {
  if (ctx.protectedColumns.includes(column)) return { error: msg(ctx).protectedColumn(column) };
  const action = { id: 'assistant:metadata-set', value: { column, value } };
  if (where) action.value.where = where;
  return { actions: [action] };
}

// "imposta regione = Lazio per i selezionati", "metti Roma nella colonna X".
function parseSet(ctx, text) {
  const legacy = text.match(/^set all values in the (.+?) column to (.+)$/i) || text.match(/^riscrivi nella colonna (.+?) tutti i valori a (.+)$/i);
  if (legacy) {
    const column = resolveColumn(ctx, legacy[1]);
    if (!column) return { error: msg(ctx).noColumn(legacy[1], editable(ctx)) };
    return setAction(ctx, column, unquote(legacy[2]));
  }
  const phrase = findColumnPhrase(text);
  let column = phrase ? columnFromPhrase(ctx, phrase) : undefined;
  let body = phrase && column ? (text.slice(0, phrase.start) + ' ' + text.slice(phrase.end)) : text;
  body = body.replace(/\s+/g, ' ').trim();
  const scope = extractScope(ctx, body);
  if (scope.error) return scope;
  body = scope.text.trim();
  const verb = fold(body).match(/^\S+\s*/);
  body = body.slice(verb ? verb[0].length : 0).trim();
  if (!column) {
    // "imposta regione a Lazio" / "set region to Lazio" / "imposta regione = Lazio"
    const words = body.split(/\s+/);
    for (let start = 0; start < Math.min(3, words.length) && !column; start++) {
      for (let count = Math.min(3, words.length - start); count >= 1; count--) {
        const candidate = resolveColumn(ctx, words.slice(start, start + count).join(' '));
        if (candidate && !/^(il|la|the|le)$/i.test(words[start + count] || '')) {
          column = candidate;
          body = words.slice(start + count).join(' ');
          break;
        }
        if (candidate) { column = candidate; body = words.slice(start + count).join(' '); break; }
      }
      if (!/^(il|la|lo|the|le|valore|value|colonna|column|campo)$/i.test(words[start] || '')) break;
    }
  }
  if (!column) {
    if (phrase?.name) return { error: msg(ctx).noColumn(phrase.name, editable(ctx)) };
    return null;
  }
  body = body.replace(/^(?:(?:a|al|to|=|:|uguale a|pari a|come|as|on|sur|a la valeur|al valore|con|with|en|in)\s+)+/i, '').replace(VALUE_INTRO, '').replace(/^(?:a|al|to|=|:)\s+/i, '');
  body = body.replace(/^(?:(?:tutt[ie]\s+)?(?:i|gli|le|the|all|les)\s+)?(?:valor[ei]|values?|valeurs?)\s+(?:a|to|=|en)\s+/i, '');
  const value = unquote(body);
  if (!value) return { error: msg(ctx).missingValue };
  const problem = checkNewValue(ctx, value);
  if (problem) return { error: problem };
  return setAction(ctx, column, value, scope.where);
}

// Remove a prefix matched on the accent-folded text (same length as original).
function stripFolded(text, regex) {
  const match = fold(text).match(regex);
  return match && match.index === 0 ? text.slice(match[0].length) : text;
}

// "seleziona nella mappa gli Infantis", "select the Infantis on the map": the
// place says where to look; the selection is shared, so it opens that panel.
const SELECT_PLACE = /\s*\b(?:(?:nella|sulla|nel|sul|in|on|into|sur|dans)\s+(?:(?:la|il|l'|the|le|les)\s*)?)(mappa|cartina|map|carte|tabella|table|tableau|metadati|metadata|metadonnees|métadonnées|albero|tree|arbre)\b\s*/i;

function parseSelect(ctx, text) {
  const place = text.match(SELECT_PLACE);
  if (place) {
    const selected = parseSelect(ctx, text.replace(SELECT_PLACE, ' ').replace(/\s+/g, ' ').trim());
    if (!selected?.actions) return selected;
    const word = fold(place[1]);
    const view = /mapp|cartin|map|cart/.test(word) ? 'map' : /alber|tree|arbre/.test(word) ? 'tree' : 'metadata';
    const layout = view !== 'tree' ? ctx.catalog.find((entry) => entry.area === 'layout' && entry.type === view) : null;
    return layout ? { actions: [...selected.actions, { id: layout.id, value: 'on' }] } : selected;
  }
  const folded = fold(text);
  let mode = 'replace';
  if (/^(?:deselezion\w*|deselect\w*|unselect\w*|deselectionne\w*)\b/.test(folded) || /\b(?:togli|rimuovi|leva|remove|enleve)\b.*\bdalla selezione\b|\bfrom (?:the )?selection\b/.test(folded)) mode = 'remove';
  else if (/\b(?:aggiungi|add|ajoute)\b.*\b(?:alla selezione|to (?:the )?selection|a la selection)\b/.test(folded)) mode = 'add';
  let body = text.replace(/\s*(?:alla|dalla|to the|from the|to|from|a la|de la)\s+(?:selezione|selection)\s*/i, ' ').trim();
  const verb = fold(body).match(/^\S+\s*/);
  body = body.slice(verb ? verb[0].length : 0).trim();
  body = body.replace(/^(?:anche|also|aussi|solo|soltanto|only|seulement)\s+/i, '');
  const everything = /^(?:(?:tutto|tutti|tutte|all|everything|tout|tous|toutes)(?:\s+(?:i|gli|le|the|les))?(?:\s+(?:campioni|nodi|samples|nodes|echantillons|noeuds))?(?:\s+(?:dell'albero|nell'albero|on the tree|in the tree|dans l'arbre))?|niente|nothing|rien)$/i;
  if (!body || everything.test(body)) {
    if (/^(?:niente|nothing|rien)$/i.test(body)) return { actions: [{ id: 'assistant:select', value: { mode: 'clear' } }] };
    return { actions: [{ id: 'assistant:select', value: { mode: mode === 'remove' ? 'clear' : 'all' } }] };
  }
  const ids = idsInText(ctx, body);
  const words = body.split(/[\s,;]+/).filter((word) => !/^(?:e|and|et|i|il|the|campioni|campione|samples|sample|nodi|nodes|gli|le|les)$/i.test(word));
  if (ids.length && ids.length === words.length) return { actions: [{ id: 'assistant:select', value: { mode, where: { ids } } }] };
  body = stripFolded(body, /^(?:(?:tutt[ie]\s+)?(?:i|gli|le|the|all|les|tous les|toutes les)\s+)?(?:nodi|campioni|ceppi|isolati|righe|elementi|samples|nodes|strains|isolates|rows|items|echantillons|noeuds|lignes|quelli|quelle|those|ones|ceux|celles)\b\s*/i);
  body = stripFolded(body, /^(?:che hanno|che sono|che|having|that are|that have|which are|with|where|dove|qui|dont|ou)\s+/i);
  // A bare article before a value ("les Infantis", "gli Infantis").
  body = stripFolded(body, /^(?:i|gli|le|la|il|lo|the|les|des)\s+/i);
  if (!body) return { actions: [{ id: 'assistant:select', value: { mode: 'all' } }] };
  const where = parseConditions(ctx, body);
  if (!where) return { error: msg(ctx).badCondition };
  if (where.error) return where;
  return { actions: [{ id: 'assistant:select', value: { mode, where } }] };
}

function colourIn(text) {
  const hex = String(text).match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i);
  if (hex) {
    const raw = hex[0].length === 4 ? '#' + [...hex[0].slice(1)].map((char) => char + char).join('') : hex[0];
    return { colour: raw.toLowerCase(), start: hex.index, end: hex.index + hex[0].length };
  }
  const folded = fold(text);
  for (const [name, colour] of Object.entries(COLOURS)) {
    if (name.length < 3) continue;
    const match = folded.match(new RegExp(`(?:^|[^a-z])(${name})(?=$|[^a-z])`));
    if (match) {
      const start = match.index + match[0].length - name.length;
      return { colour, start, end: start + name.length, name };
    }
  }
  return null;
}

function colourByEntry(ctx) {
  const columnOptions = (entry) => entry.options && entry.options.some((option) => ctx.columns.includes(String(option.value)));
  return ctx.catalog.find((entry) => entry.iid === 'tree-metadata-select' && columnOptions(entry)) ||
    ctx.catalog.find((entry) => entry.iid === 'legend-menu-color-by' && columnOptions(entry)) ||
    ctx.catalog.find((entry) => entry.terms.some((term) => /colou?r by|colora per/.test(norm(term))) && columnOptions(entry));
}

// SPREAD colours by category, so "colour the selected nodes red" becomes:
// write the colour name into a highlight column for the selected samples,
// colour the tree by that column and give that value the requested colour.
const HIGHLIGHT = { it: 'evidenziati', en: 'highlight', fr: 'surbrillance' };
function colourSelected(ctx, colour) {
  const column = ctx.columns.find((name) => Object.values(HIGHLIGHT).includes(name)) || HIGHLIGHT[ctx.lang] || HIGHLIGHT.en;
  const value = colour.name || colour.colour;
  const entry = colourByEntry(ctx);
  if (!entry || !ctx.has('assistant:node-colour')) return { error: msg(ctx).colourSelected };
  const actions = [];
  if (ctx.columns.includes(column)) actions.push({ id: 'assistant:metadata-set', value: { column, value, where: { selected: true } } });
  else {
    actions.push({ id: 'assistant:metadata-add-column', value: { column, value, where: { selected: true }, otherValue: '' } });
    ctx.columns.push(column);
  }
  actions.push({ id: entry.id, value: column, deferred: true });
  actions.push({ id: 'assistant:node-colour', value: { category: column, id: value, colour: colour.colour }, deferred: true });
  return { actions };
}

function parseColour(ctx, text) {
  const folded = fold(text);
  // Colour by column.
  const byColumn = folded.match(/\b(?:per|by|secondo|in base a|in base al|in base alla|based on|according to|selon|par|usando|using|con|with)\s+(?:la\s+|il\s+|the\s+|le\s+|l')?(?:colonna\s+|column\s+|campo\s+|colonne\s+)?(.+)$/);
  const colour = colourIn(text);
  if (byColumn && !colour) {
    const raw = text.slice(text.length - byColumn[1].length).trim();
    const column = resolveColumn(ctx, raw) || resolveColumn(ctx, raw.replace(/\s+/g, '_'));
    const entry = colourByEntry(ctx);
    if (column && entry) return { actions: [{ id: entry.id, value: column, deferred: !entry.options.some((option) => option.value === column) }] };
    if (!column && raw && entry) return { error: msg(ctx).noColumn(raw, ctx.columns.filter((name) => name !== 'nothing')) };
  }
  if (!colour) {
    // "colora l'albero per regione" handled above; "colora regione" (column only)
    const columns = columnsInText(ctx, text);
    const entry = colourByEntry(ctx);
    if (columns.length === 1 && entry && !valuesInText(ctx, text).length) return { actions: [{ id: entry.id, value: columns[0] }] };
    return null;
  }
  // Colour a group or sample.
  if (!ctx.has('assistant:node-colour')) return null;
  let rest = (text.slice(0, colour.start) + ' ' + text.slice(colour.end)).replace(/\s+/g, ' ').trim();
  rest = rest.replace(/^(?:colora(?:re)?|colorami|colou?r(?:ize)?|paint|dipingi|colorie(?:r)?|(?:set|imposta|metti|cambia|change|definis)(?:\s+(?:il|the|le|la))?\s+(?:colore|colou?r|couleur)(?:\s+(?:of|di|del|della|de))?)\s*/i, '')
    .replace(/\s+(?:di|in|to|en|a|al|con|with|as|come|of)\s*$/i, '').replace(/^(?:di|in|to|en|a|al|con|with|as|come)\s+/i, '')
    .replace(/\s+(?:di|in|to|en|a|al|con|with|as|come)\s+(?=\S*$)/i, ' ').trim();
  if (/^(?:(?:i |gli |le |the |les )?(?:nodi |campioni |samples |nodes |echantillons )?(?:selezionat[ioae]|selected|selection|selezione|selectionnes)(?: nodes| samples)?)$/i.test(rest)) return colourSelected(ctx, colour);
  const scope = rest.match(/^(?:(?:il|lo|la|i|gli|le|the)\s+|l['’]\s*)?(?:(campione|sample|nodo|node|echantillon|gruppo|group|groupe|valore|value|valeur|tutti i|all)\s+)?(?:(?:del|della|dei|delle|di|of|de|du|in|con|with)\s+)?(?:(?:il|lo|la|i|gli|le|the)\s+|l['’]\s*)?(.+)$/i);
  const kind = norm(scope?.[1] || '');
  let target = unquote(scope?.[2] || rest);
  const phrase = findColumnPhrase(target);
  let column;
  if (phrase) {
    column = columnFromPhrase(ctx, phrase);
    target = unquote((target.slice(0, phrase.start) + ' ' + target.slice(phrase.end)).replace(/\s+(?:nella|in|in the|dans la)\s*$/i, '').trim());
  }
  if (!column) {
    const words = target.split(/\s+/);
    if (words.length > 1) {
      const leading = resolveColumn(ctx, words[0]);
      if (leading && lookupValue(ctx, words.slice(1).join(' '), leading).length) { column = leading; target = words.slice(1).join(' '); }
    }
  }
  if (['campione', 'sample', 'nodo', 'node', 'echantillon'].includes(kind)) column = column || 'ID';
  let matches = lookupValue(ctx, target, column).filter((entry) => entry.column !== 'nothing');
  if (['gruppo', 'group', 'groupe'].includes(kind)) matches = matches.filter((entry) => entry.column !== 'ID');
  if (!matches.length) {
    const inside = valuesInText(ctx, target).filter((entry) => !column || entry.column === column);
    if (inside.length) matches = inside.filter((entry) => entry.key === inside[0].key);
  }
  if (!matches.length) return target ? { error: msg(ctx).noValue(target, column, suggestions(ctx, target, column)) } : null;
  const active = matches.filter((entry) => entry.column === ctx.displayCategory);
  const nonId = matches.filter((entry) => entry.column !== 'ID');
  const chosen = active.length === 1 ? active[0] : matches.length === 1 ? matches[0] : new Set(nonId.map((entry) => entry.column)).size === 1 ? nonId[0] : null;
  if (!chosen) return { error: msg(ctx).ambiguousValue(target, [...new Set(matches.map((entry) => entry.column))]) };
  return { actions: [{ id: 'assistant:node-colour', value: { category: chosen.column, id: chosen.value, colour: colour.colour } }] };
}

// ---------------------------------------------------------------------------
// Generic resolver over the live menu catalog

const STOP = new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'di', 'del', 'della', 'dei', 'delle', 'a', 'al', 'alla', 'in', 'nel', 'nella', 'per', 'con',
  'su', 'sul', 'sulla', 'da', 'e', 'o', 'the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'with', 'and', 'or', 'by', 'me', 'mi', 'please', 'per', 'favore',
  'puoi', 'potresti', 'vorrei', 'voglio', 'can', 'could', 'you', 'would', 'like', 'want', 'les', 'des', 'du', 'de', 'et', 'ou', 'pour', 'sur', 'dans', 'un', 'une', 'je', 'veux', 'stp',
  'grazie', 'thanks', 'merci', 'ora', 'now', 'adesso', 'subito', 'come', 'as', 'comme', 'modalita', 'mode', 'modo', 'vista', 'view', 'tipo', 'type', 'set', 'imposta', 'metti', 'regle', 'mets']);

const POSITIVE = ['affichez', 'activez', 'ouvrez', 'montre', 'montrez', 'mostra', 'mostrare', 'mostrami', 'visualizza', 'vedi', 'attiva', 'attivare', 'abilita', 'abilitare', 'accendi', 'apri', 'aprire', 'metti', 'usa', 'show', 'display', 'enable', 'on', 'open', 'activate', 'turn on', 'switch on', 'use', 'affiche', 'afficher', 'active', 'activer', 'ouvre', 'ouvrir', 'si', 'yes', 'oui', 'applica', 'apply', 'applique', 'includi', 'include', 'con', 'with', 'fammi vedere', 'fai vedere', 'rimetti', 'riapri', 'bring up', 'bring back', 'pull up', 'montre moi', 'fais voir', 'remets', 'rouvre'];
const NEGATIVE = ['masquez', 'cachez', 'desactivez', 'fermez', 'nascondi', 'nascondere', 'disattiva', 'disattivare', 'disabilita', 'spegni', 'togli', 'togliere', 'leva', 'levare', 'rimuovi', 'chiudi', 'chiudere', 'hide', 'disable', 'off', 'close', 'remove', 'deactivate', 'turn off', 'switch off', 'masque', 'masquer', 'cache', 'cacher', 'desactive', 'desactiver', 'ferme', 'fermer', 'no', 'non', 'senza', 'without', 'sans', 'escludi', 'exclude', 'not', 'get rid of', 'sbarazzati', 'enleve', 'enlever', 'retire', 'retirer', 'vire'];

const POSITIVE_VALUES = /^(on|show|shown|show_[a-z_]+|active|apply|visible|enabled|true|yes)$/;
const NEGATIVE_VALUES = /^(off|hide|hidden|hide_[a-z_]+|not-active|not-apply|inactive|disabled|false|no)$/;

function polarity(text) {
  const words = ` ${norm(text)} `;
  const negative = NEGATIVE.some((word) => words.includes(` ${word} `));
  const positive = POSITIVE.some((word) => words.includes(` ${word} `));
  if (negative && !positive) return -1;
  if (positive && !negative) return 1;
  if (negative && positive) return /^\s*(?:nascondi|disattiva|disabilita|spegni|togli|leva|rimuovi|chiudi|hide|disable|close|remove|masque|desactive|ferme|cache)/.test(words) ? -1 : 1;
  return 0;
}

function vocabulary(terms) {
  const set = new Set();
  for (const term of terms) for (const token of tokens(term)) if (!STOP.has(token) && token.length > 1) set.add(token);
  return set;
}

function matchToken(token, vocab) {
  if (vocab.has(token)) return 1;
  if (token.length >= 4) {
    for (const word of vocab) {
      if (word.length >= 5 && (word.startsWith(token.slice(0, 5)) || token.startsWith(word.slice(0, 5)))) return 0.7;
      if (word.length >= 4 && similar(word, token)) return 0.8;
    }
  }
  return 0;
}

function numberIn(text) {
  const match = String(text).match(/(-?\d+(?:[.,]\d+)?)\s*(%|x|px|pt|volte|times)?/i);
  return match ? Number(match[1].replace(',', '.')) : undefined;
}

function chooseOption(entry, text) {
  const options = entry.options || [];
  if (!options.length) return undefined;
  // Numeric options ("1.5x", map delta 3): match the number itself.
  if (options.every((option) => looksNumeric(option.value))) {
    const number = numberIn(text);
    const exact = options.find((option) => Number(option.value) === number);
    return exact ? exact.value : undefined;
  }
  const words = tokens(text);
  const textVocab = new Set(words);
  // Terms every option shares (checkbox toggles reuse one label) say nothing.
  const shared = options.length > 1 ? options.map((option) => new Set(option.terms.map(norm))).reduce((a, b) => new Set([...a].filter((term) => b.has(term)))) : new Set();
  // Options named in the request.
  const scored = options.map((option) => {
    const optionTerms = option.terms.filter((term) => !shared.has(norm(term)));
    const vocab = vocabulary(optionTerms);
    let score = 0;
    for (const token of textVocab) score += matchToken(token, vocab);
    const exact = optionTerms.some((term) => norm(term) && ` ${norm(text)} `.includes(` ${norm(term)} `));
    return { option, score: score + (exact ? 2 : 0) };
  }).sort((a, b) => b.score - a.score);
  const polar = options.length === 2 && options.some((option) => POSITIVE_VALUES.test(String(option.value))) && options.some((option) => NEGATIVE_VALUES.test(String(option.value)));
  if (polar) {
    const sign = polarity(text);
    if (sign) return options.find((option) => (sign > 0 ? POSITIVE_VALUES : NEGATIVE_VALUES).test(String(option.value))).value;
  }
  if (scored[0].score > 0 && (scored.length === 1 || scored[0].score > scored[1].score)) return scored[0].option.value;
  if (polar) return options.find((option) => POSITIVE_VALUES.test(String(option.value))).value;
  return undefined;
}

const AREA_WORDS = {
  tree: ['albero', 'tree', 'mst', 'arbre', 'nodi', 'nodes', 'rami', 'branches'],
  map: ['mappa', 'map', 'carte', 'marker', 'marcatori', 'marqueurs'],
  metadata: ['metadati', 'metadata', 'tabella', 'table', 'griglia', 'grid', 'metadonnees', 'tableau'],
  'metadata-card': ['metadati', 'metadata', 'tabella', 'table'],
  legend: ['legenda', 'legend', 'legende', 'gruppi', 'groups'],
  video: ['video', 'timeline', 'filmato', 'animazione', 'animation'],
  zooms: ['zoom', 'zooms', 'cluster', 'reportree'],
  'zooms-filtered': ['zoom', 'zooms', 'cluster', 'reportree', 'filtrato', 'filtered'],
  layout: ['pannello', 'panel', 'vista', 'view', 'finestra', 'panneau'],
  macro: ['macro']
};

// When two options fit equally, the more common panel wins instead of asking.
const AREA_PRIORITY = { tree: 0, 'settings/node-style': 1, 'settings/node-size': 1, layout: 2, legend: 2, 'settings/branch-style': 3, 'settings/branch-cutoffs': 3, 'settings/rendering': 3, metadata: 4, 'metadata-card': 5, map: 4, 'map-view': 4, video: 4, zooms: 6, 'zooms-filtered': 7, macro: 8 };
const priority = (entry) => AREA_PRIORITY[entry.area] ?? AREA_PRIORITY[entry.area.split('/')[0]] ?? 5;
const PANEL_WORDS = new Set(['tabella', 'table', 'tableau', 'griglia', 'grid', 'mappa', 'map', 'carte', 'legenda', 'legend', 'legende', 'video', 'timeline', 'metadati', 'metadata', 'metadonnees']);
const POLARITY_WORDS = new Set([...POSITIVE, ...NEGATIVE].filter((word) => !word.includes(' ')));
const POLARITY_PHRASES = new RegExp(` (?:${[...POSITIVE, ...NEGATIVE].filter((word) => word.includes(' ')).join('|')})(?= )`, 'g');

/**
 * Action for a catalog entry with the value the request gives it: the option
 * it names (on/off for a switch, positive when unsaid), the number in it, or
 * the quoted word for a search box; with `single`, the only option when the
 * request names none, or the option preselected in the menu of a button with
 * options (`defaultValue`, e.g. the .tsv of "Download table").
 * @param {object} entry catalog entry
 * @param {string} text the request
 * @param {object} [options] { single: use the only (or the preselected) option of the entry when unsaid }
 * @returns {object|null} { id, value? }, or null when a required value is missing
 */
export function valueFor(entry, text, { single = false } = {}) {
  const action = { id: entry.id };
  if (entry.options && entry.options.length) {
    let value = chooseOption(entry, text);
    // a single possible value (e.g. the only format of a download) needs no naming
    if (value === undefined && single && entry.options.length === 1) value = entry.options[0].value;
    // a button with options runs with the one preselected in its menu, as a click on it
    if (value === undefined && single && entry.defaultValue !== undefined) value = entry.defaultValue;
    if (value === undefined) return null;
    action.value = value;
  } else if (['number', 'slider'].includes(entry.type)) {
    const value = numberIn(text);
    if (value === undefined) return null;
    action.value = value;
  } else if (['search', 'text'].includes(entry.type)) {
    const quoted = String(text).match(/["“«']([^"”»']+)["”»']/);
    const value = quoted ? quoted[1] : String(text).split(/\s+/).slice(-1)[0];
    if (!value) return null;
    action.value = value;
  } else if (entry.valueRequired) return null;
  return action;
}

export function resolveCatalog(ctx, text, options = {}) {
  // Multi-word on/off verbs ("fammi vedere", "get rid of") name no option.
  const verbless = ` ${norm(text)} `.replace(POLARITY_PHRASES, ' ');
  const allWords = tokens(text).filter((token) => !STOP.has(token));
  const contentWords = tokens(verbless).filter((token) => !STOP.has(token) && !POLARITY_WORDS.has(token));
  const words = contentWords.length ? contentWords : allWords;
  if (!words.length) return null;
  const core = words.join(' ');
  const sign = polarity(text);
  // Inverse document frequency across the catalog: rare words identify an item.
  const vocabularies = ctx.catalog.map((entry) => {
    const area = entry.area.split('/')[0];
    const areaWords = AREA_WORDS[area] || AREA_WORDS[entry.area] || [];
    const optionTerms = (entry.options || []).flatMap((option) => option.terms);
    return { entry, vocab: vocabulary(entry.terms), optionVocab: vocabulary(optionTerms), areaVocab: new Set(areaWords) };
  });
  const documentFrequency = new Map();
  for (const { vocab, optionVocab } of vocabularies) for (const token of new Set([...vocab, ...optionVocab])) documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  const idf = (token) => Math.log(1 + ctx.catalog.length / (documentFrequency.get(token) || 0.5));
  // A word that is itself in the vocabulary is matched exactly; typo
  // tolerance applies only to unknown words ("torta" must not match "torna").
  const known = new Set(documentFrequency.keys());
  const tokenMatch = (token, vocab) => (known.has(token) ? (vocab.has(token) ? 1 : 0) : matchToken(token, vocab));
  const content = (value) => tokens(value).filter((token) => !STOP.has(token)).join(' ');
  const haystack = ` ${content(text)} `;
  const results = vocabularies.map(({ entry, vocab, optionVocab, areaVocab }) => {
    let score = 0;
    for (const token of words) {
      const hit = tokenMatch(token, vocab);
      if (hit) score += hit * idf(token);
      else {
        const optionHit = tokenMatch(token, optionVocab);
        if (optionHit) score += optionHit * idf(token) * 0.8;
      }
      // Naming a panel ("nella tabella", "on the map") is a strong hint.
      if (areaVocab.has(token)) score += PANEL_WORDS.has(token) ? 2 : 0.6;
    }
    // Whole multi-word terms present verbatim weigh more ("dimensione nodi").
    let phrase = 0;
    for (const term of entry.terms) {
      const key = content(term);
      if (key.includes(' ') && haystack.includes(` ${key} `)) phrase = Math.max(phrase, key.split(' ').length);
    }
    score += phrase * 1.5;
    // A number alone ("2x") must not pick an option: something must name it.
    const named = words.some((token) => tokenMatch(token, vocab) || areaVocab.has(token)) || (entry.options || []).some((option) => option.terms.some((term) => content(term) === core && /[a-z]/.test(core)));
    const namedByOption = words.some((token) => /[a-z]{3}/.test(token) && tokenMatch(token, optionVocab));
    if (!named && !namedByOption) return { entry, score: 0 };
    // An on/off verb points at a switch rather than a list. Not the panels of the
    // top bar: they are on/off only in the code, people find them by their name
    // ("cerca" alone is the highlight of the labels, not the search panel).
    const options = entry.options || [];
    if (sign && entry.area !== 'topbar' && options.length === 2 && options.some((option) => POSITIVE_VALUES.test(String(option.value))) && options.some((option) => NEGATIVE_VALUES.test(String(option.value)))) score += 1;
    // The whole request (minus verbs) is exactly one of this item's names.
    if (entry.terms.some((term) => norm(term) === core)) score += 4;
    else if ((entry.options || []).some((option) => option.terms.some((term) => norm(term) === core))) score += 2;
    return { entry, score };
  }).filter((result) => result.score > 0).sort((a, b) => b.score - a.score);
  if (ctx.debug) ctx.debug(results.slice(0, 5).map((result) => [result.entry.id, result.score.toFixed(2)]));
  if (!results.length) return null;
  const top = results[0];
  if (top.score < 1.5) return null;
  // Same-label items in different panels (e.g. "Select all"): prefer tree.
  let close = results.filter((result) => result.score >= top.score * 0.9);
  let chosen = top;
  const tied = results.filter((result) => result.score >= top.score * 0.97);
  if (tied.length > 1) {
    close = tied;
    const best = Math.min(...close.map((result) => priority(result.entry)));
    const preferred = close.filter((result) => priority(result.entry) === best);
    if (preferred.length < close.length) {
      close = preferred;
      chosen = preferred[0];
    }
  }
  if (close.length > 1) {
    const sameLabel = close.every((result) => norm(result.entry.terms[0]) === norm(top.entry.terms[0]));
    if (!sameLabel && close[1].score > chosen.score * 0.97) {
      const labels = [...new Set(close.slice(0, 3).map((result) => result.entry.label || result.entry.terms[0]))];
      return labels.length > 1 ? { error: msg(ctx).ambiguousAction(labels) } : null;
    }
    if (sameLabel) chosen = close.find((result) => result.entry.area === 'tree') || close.find((result) => result.entry.area === 'legend') || top;
  }
  // Orientation questions only need the option, not a value.
  if (options.locate) return { actions: [{ id: chosen.entry.id }], score: chosen.score };
  // If the best item cannot take a value from the request ("rendering
  // dinamico" names a radio of a sibling item), try the next good candidates;
  // only then an item with a single option, or a button with a preselected one,
  // takes it without naming it ("esporta i metadati": the .tsv of the menu), so
  // it does not win over the others.
  const candidates = [chosen, ...results.filter((result) => result !== chosen && result.score >= chosen.score * 0.6)];
  for (const single of [false, true]) {
    for (const candidate of candidates) {
      const action = valueFor(candidate.entry, text, { single });
      if (action) return { actions: [action], score: candidate.score };
    }
  }
  return null;
}

// Zoom in/out of the tree (default) or the map.
const ZOOM_OUT = /^(?:dezoom\w*|de-zoom\w*|unzoom\w*|rimpicciol\w*|allontan\w*|zoom\s*(?:out|indietro|meno|-)|riduci(?:\s+(?:lo|la))?\s*(?:zoom|vista|ingrandimento)?|diminuisci(?:\s+lo)?\s*zoom|reduce\s+zoom|dezoome\w*|eloigne\w*|zoom\s+arriere|reduis\w*)\b/;
const ZOOM_IN = /^(?:zoom\w*|ingrand\w*|avvicin\w*|aumenta(?:\s+lo)?\s*zoom|enlarge|magnify|agrandi\w*|rapproche\w*|zoom\s*(?:in|avanti|piu|\+))\b/;

function parseZoom(ctx, text, folded) {
  const out = ZOOM_OUT.test(folded);
  if (!out && !ZOOM_IN.test(folded)) return null;
  const onMap = /\b(?:mappa|map|carte|cartina)\b/.test(folded) && !/\b(?:albero|tree|mst|arbre)\b/.test(folded);
  const id = onMap ? 'map-view:zoom' : 'assistant:tree-zoom';
  if (!ctx.has(id)) return null;
  // Without "2x"/"3 volte" a single step of 1.5×.
  let factor = numberIn(text.replace(/%/g, ''));
  if (factor === undefined || factor <= 0) factor = 1.5;
  if (/%/.test(text)) factor /= 100;
  else if (factor > 10 && !/x\b|volte|times|fois/i.test(text)) return null;
  const value = out && factor > 1 ? 1 / factor : factor;
  return { actions: [{ id, value: Math.round(value * 1000) / 1000 }] };
}

const SELECTION_VERBS = [
  [/^(?:mostra(?:mi)?|visualizza|fammi vedere|show(?: me)?|display|affiche(?:z)?|montre(?:z)?)\s+(?:solo|soltanto|solamente|only|just|seulement|uniquement)\s+/, ['Show selected subtrees']],
  [/^(?:isola|isolate|filtra|filter|filtre)\s+/, ['Show selected subtrees']],
  [/^(?:nascondi|hide|masque(?:z|r)?|cache(?:z|r)?)\s+/, ['Hide selected nodes']],
  [/^(?:collassa|comprimi|collapse|replie(?:z)?)\s+/, ['Collapse selected nodes']],
  [/^(?:espandi|expand|deplie(?:z)?|developpe(?:z)?)\s+/, ['Expand selected nodes']]
];

function selectionShortcut(ctx, text, folded) {
  for (const [regex, labels] of SELECTION_VERBS) {
    const match = folded.match(regex);
    if (!match) continue;
    const rest = text.slice(match[0].length).trim();
    const entry = ctx.catalog.find((candidate) => labels.some((label) => candidate.terms.includes(label)));
    if (!rest || !entry) return null;
    // "nascondi i selezionati", "hide selected", "masque-les": the action alone.
    if (/^(?:(?:i|gli|le|the|les)\s+)?(?:nodi\s+|campioni\s+|nodes\s+|samples\s+|noeuds\s+)?(?:selezionat\w*|selected|selection|selectionne\w*)(?:\s+(?:nodi|campioni|nodes|samples|noeuds))?$/.test(fold(rest))) return { actions: [{ id: entry.id }] };
    if (/selezionat|selected|selection/.test(fold(rest))) return null;
    const selected = parseSelect(ctx, `seleziona ${rest}`);
    // "mostra solo X" always means a filter: report a bad X instead of guessing.
    if (selected?.error && labels[0] === 'Show selected subtrees') return selected;
    if (!selected?.actions || selected.actions[0].value.mode !== 'replace') return null;
    return { actions: [...selected.actions, { id: entry.id }] };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Orientation: "dove trovo le impostazioni per…", "where is…", "come faccio a…"

const WHERE = /^(?:dove|dov e|dov'e|dov’e|in (?:che|quale) (?:menu|pannello|parte)|mostrami dove|fammi vedere dove|where|show me where|in which (?:menu|panel)|ou|ou se trouve|montre(?:-moi)? ou|dans quel menu)\b/;
const HOWTO = /^(?:come (?:faccio|posso|si fa|si puo|devo)|how (?:do|can) (?:i|you|we)|how to|comment (?:faire|puis-je|je peux|on))\b/;

function parseWhere(ctx, text, folded) {
  const where = folded.match(WHERE);
  const howto = !where && folded.match(HOWTO);
  if (!where && !howto) return null;
  let rest = text.slice((where || howto)[0].length);
  rest = stripFolded(rest.trim(), /^(?:(?:si |posso |devo |can i |do i |i can |je |on )?(?:trovo|trovano|trova|trovare|sono|e|stanno|sta|imposta|impostano|impostare|imposto|cambia|cambiare|cambio|modifica|modificare|regola|regolare|attiva|attivare|is|are|find|set|change|adjust|enable|turn on|se trouve|se trouvent|trouver|trouve|change|regle|modifie)\s+)*/i);
  rest = stripFolded(rest.trim(), /^(?:(?:le|la|il|lo|i|gli|l'|the|les|un|una|a)\s*)?(?:impostazion[ei]|opzion[ei]|comand[oi]|controll[oi]|funzion[ei]|settings?|options?|controls?|commands?|functions?|reglages?|parametres?)?\s*(?:(?:per|di|del|della|dei|delle|for|to|of|pour|de|du|des)\b)?\s*(?:(?:le|la|il|lo|i|gli|l'|the|les)\s*)?/i).replace(/\?+\s*$/, '').trim();
  if (!rest) return null;
  if (howto) {
    // "come faccio a colorare per regione?": just prepare the plan.
    const verbish = rest.replace(/^(?:a|ad|to|a |pour)\s+/i, '');
    const parsed = parseClause(verbish, ctx);
    if (parsed?.actions?.length) return { ...parsed, howto: true };
  }
  // Header tools are not menu options: name them directly.
  const tool = [['macros', /\bmacro/], ['search', /\b(?:cerca|ricerca|search|recherche|trova campioni)\b/], ['notes', /\b(?:note|nota|notes|annotazion[ei]|annotations?)\b/], ['language', /\b(?:lingua|language|langue)\b/], ['info', /\b(?:info|informazioni|about|credits|crediti|documentazione|documentation|guida|guide)\b/]]
    .find(([, pattern]) => pattern.test(fold(rest)));
  if (tool) return { locate: { id: `#tool-${tool[0]}`, query: rest } };
  const generic = resolveCatalog(ctx, rest, { locate: true });
  const id = generic?.actions?.[0]?.id;
  if (!id) return { error: msg(ctx).notFound(rest) };
  return { locate: { id, query: rest } };
}

// ---------------------------------------------------------------------------
// Statistics: read-only questions answered from the loaded metadata

const QUESTION = /^(?:quant[ie]|qual[ie]?|qual e|cosa|che|come|dove|chi|dimmi|elenca|lista|conta|calcola|how many|how much|what|which|who|where|list|count|tell me|combien|quel(?:le)?s?|qu est-ce|liste|compte|donne)\b|\?\s*$/;
export function isQuestion(text) { return QUESTION.test(fold(String(text).trim())); }

function statsColumn(ctx, text) {
  const phrase = findColumnPhrase(text);
  const fromPhrase = phrase ? columnFromPhrase(ctx, phrase) : undefined;
  if (fromPhrase) return fromPhrase;
  const folded = fold(text);
  const after = folded.match(/\b(?:di|della|del|dello|dei|delle|degli|per|in|nella|nel|of|for|by|in|de|du|des|par|pour)\s+(?:la\s+|il\s+|lo\s+|the\s+|le\s+|l')?(?:colonna\s+|column\s+|colonne\s+|campo\s+)?([a-z0-9_ .-]+?)(?:\s+(?:dove|where|ou|con|with|avec|quando|when|ci sono|sono|ha|has|have|\?)|\s*\?|$)/g);
  for (const chunk of after || []) {
    const name = chunk.replace(/^\S+\s+/, '').replace(/^(?:la|il|lo|the|le|l')\s*/, '').replace(/^(?:colonna|column|colonne|campo)\s+/, '').replace(/\s+(?:dove|where|ou|con|with|avec|quando|when|ci sono|sono|ha|has|have)\b.*$/, '').replace(/\?$/, '').trim();
    const column = resolveColumn(ctx, name) || resolveColumn(ctx, name.replace(/\s+/g, '_'));
    if (column) return column;
  }
  return columnsInText(ctx, text).find((column) => column !== 'ID');
}

function statsWhere(ctx, text) {
  const match = fold(text).match(/\s(?:dove|where|ou|tra i campioni con|among samples with|per i campioni con|for samples with|considerando solo|only for|solo per|tra quelli con)\s+(.+?)\s*\??$/);
  if (!match) return { where: null, text };
  const where = parseConditions(ctx, text.slice(text.length - match[1].length - (text.trim().endsWith('?') ? 1 : 0)).replace(/\?\s*$/, ''));
  return where && !where.error ? { where, text: text.slice(0, match.index) } : { error: where?.error || msg(ctx).badCondition };
}

function parseStats(ctx, text, folded) {
  if (!isQuestion(text) && !/^(?:distribuzione|frequenz|distribution|frequenc|statistich|statistic|riepilogo|summary|resume)/.test(folded)) return null;
  const scoped = statsWhere(ctx, text);
  if (scoped.error) return scoped;
  const where = scoped.where;
  const body = fold(scoped.text);
  const stats = (kind, column) => ({ stats: { kind, column, where } });
  if (/\b(?:colonne|columns|colonnes|campi|fields)\b/.test(body) && /^(?:quali|quante|elenca|lista|list|which|what|how many|quelles|combien|liste)/.test(body) && !statsColumn(ctx, scoped.text.replace(/colonn[ae]|columns?|colonnes?/gi, ''))) return stats('columns');
  const column = statsColumn(ctx, scoped.text);
  if (/\b(?:distint\w*|divers\w*|unic\w*|unique\w*|distinct\w*|differen\w*|tipi di|kinds of|types of|categorie|categories)\b/.test(body) || /^(?:quali|elenca|lista|list|which|what|quels|quelles|liste)\b.*\b(?:valori|values|valeurs)\b/.test(body)) {
    return column ? stats('distinct', column) : { error: msg(ctx).missingColumn };
  }
  if (/\b(?:piu frequent\w*|piu comun\w*|piu diffus\w*|most (?:common|frequent)|plus frequent\w*|plus courant\w*|prevalent\w*)\b/.test(body)) return column ? stats('mode', column) : { error: msg(ctx).missingColumn };
  if (/\b(?:mancant\w*|vuot\w*|missing|empty|blank|manquant\w*|vides?)\b/.test(body) && /^(?:quant|how many|combien|ci sono|are there)/.test(body)) return column ? stats('missing', column) : { error: msg(ctx).missingColumn };
  const max = /\b(?:piu recent\w*|ultim[ao]|massim\w*|max|maximum|maggiore|piu alt\w*|latest|newest|most recent|highest|largest|plus recent\w*|dernier\w*|plus grand\w*)\b/.test(body);
  const min = /\b(?:meno recent\w*|piu vecch\w*|prim[ao]|minim\w*|min|minimum|minore|piu bass\w*|earliest|oldest|lowest|smallest|plus ancien\w*|premier\w*|plus petit\w*)\b/.test(body);
  const range = /\b(?:range|intervallo|periodo|span|etendue|da quando a quando)\b/.test(body);
  if (max || min || range) {
    const target = column || (/\b(?:data|date|quando|when|quand)\b/.test(body) ? ctx.columns.find((name) => ctx.values(name).length && ctx.values(name).every(looksLikeDate)) : undefined);
    if (target) return stats(range || (max && min) ? 'range' : max ? 'max' : 'min', target);
  }
  // "quanti campioni per regione", "distribuzione di serovar", "count by source".
  if (/^(?:distribuzione|frequenz|distribution|frequenc|riepilogo|summary|conta|count|compte)/.test(body) || (/^(?:quant|how many|combien)/.test(body) && /\b(?:per|by|par|for each|per ogni|pour chaque)\s+(?:ogni\s+|each\s+|chaque\s+)?\S/.test(body))) {
    if (column) return stats('groups', column);
  }
  // "quanti campioni ci sono?" (no condition): the total.
  if (/^(?:quant[ie]|how many|combien)\b/.test(body) && !column && !where && /\b(?:campioni|samples|echantillons|righe|rows|isolati|ceppi|nodi|nodes|in totale|in total|au total)\b/.test(body)) {
    const rest = body.replace(/^(?:quant[ie]|how many|combien(?: de| d)?)\s+/, '').replace(/\b(?:campioni|samples|echantillons|righe|rows|isolati|ceppi|nodi|nodes|ci sono|sono|there are|are there|il y a|y a-t-il|in totale|in total|au total|abbiamo|do we have)\b/g, '').replace(/[?\s]+/g, '');
    if (!rest) return stats('total');
  }
  if (where && /^(?:quant[ie]|how many|combien)\b/.test(body)) return { query: { where, kind: 'count' }, actions: [] };
  return null;
}

// ---------------------------------------------------------------------------
// Filters and questions on the metadata

const FILTER_VERB = /^(?:dammi|dimmi|mostrami|mostra|fammi vedere|visualizza|filtra|elenca|lista|trova|cerca|estrai|tira fuori|give me|show me|show|list|find|filter|display|get|extract|donne-moi|donne moi|montre-moi|montre moi|montre|affiche|filtre|trouve|liste|cherche)\b/;
const RECORDS = /^(?:(?:tutt[ie]\s+)?(?:i|gli|le|la|il|lo|the|all|les|tous les|toutes les|des|un|una)\s+)?(?:metadati|metadata|metadonnees|campioni|righe|record|records|isolati|ceppi|elementi|dati|samples|rows|isolates|strains|items|data|echantillons|lignes|donnees|tabella|table|tableau)\b\s*/;
const CONDITION_INTRO = /^(?:(?:che|which|that|qui)\s+(?:verificano|soddisfano|rispettano|hanno|sono|matchano|match|satisfy|meet|have|are|verifient|satisfont|ont|sont)(?:\s+(?:la|le|the|les))?(?:\s+(?:condizion[ei]|conditions?))?(?:\s*:)?|dove|in cui|per cui|con|where|with|matching|having|for which|ou|avec|dont|pour lesquels)(?:\s+|$)/;

function filterAction(ctx) {
  const toggle = ctx.catalog.find((entry) => entry.iid === 'metadata-selected-only');
  const panel = ctx.catalog.find((entry) => entry.area === 'layout' && entry.type === 'metadata');
  return { toggle, panel };
}

function parseFilter(ctx, text, folded) {
  // "togli il filtro", "mostra tutte le righe".
  if (/\b(?:togli|rimuovi|leva|azzera|resetta|annulla|clear|remove|reset|cancel|enleve|supprime|reinitialise)\b.*\bfilt(?:r|er)|\b(?:mostra|show|affiche)\s+(?:tutte|tutti|all|toutes|tous)\s+(?:le |i |the |les )?(?:righe|campioni|metadati|rows|samples|lignes)\b/.test(folded)) {
    const { toggle } = filterAction(ctx);
    return toggle ? { actions: [{ id: toggle.id, value: 'show_all' }] } : null;
  }
  const question = folded.match(/^(?:quant[ie]|how many|combien(?: de| d)?)\b\s*/);
  const which = folded.match(/^(?:qual[ie]|which|quels?|quelles?)\b\s*/);
  const verb = question || which || folded.match(FILTER_VERB);
  if (!verb) return null;
  // "mostra solo i campioni X" filters the tree (subtrees); only the table
  // words ("metadati", "righe", "tabella") make it a table filter.
  if (/^(?:mostra|mostrami|show|visualizza|affiche|montre)\s+(?:solo|soltanto|only|just|seulement|uniquement)\b/.test(folded) &&
      !/\b(?:metadati|metadata|metadonnees|righe|rows|lignes|tabella|table|tableau)\b/.test(folded)) return null;
  let rest = text.slice(verb[0].length).trim();
  rest = stripFolded(rest, /^(?:per favore|please|s'il te plait|solo|soltanto|only|seulement)\s+/);
  const hadRecords = RECORDS.test(fold(rest));
  rest = stripFolded(rest, RECORDS);
  rest = stripFolded(rest, /^(?:ci sono|ce ne sono|sono|hanno|abbiamo|there are|are there|do we have|have|il y a|y a-t-il|sont|ont)(?:\s+|$)/);
  rest = rest.replace(/\s*\?+\s*$/, '').replace(/\s+(?:ci sono|ce ne sono|ci sono in tutto|abbiamo|are there|there are|do we have|il y a|y a-t-il)\s*$/i, '').trim();
  const intro = fold(rest).match(CONDITION_INTRO);
  if (!hadRecords && !intro && !question && !which) return null;
  rest = rest.slice(intro ? intro[0].length : 0).trim();
  if (!rest) return null;
  const where = parseConditions(ctx, rest);
  if (!where || where.error) return (hadRecords || intro) ? (where || { error: msg(ctx).badCondition }) : null;
  if (question) return { query: { where, kind: 'count' }, actions: [] };
  if (which) return { query: { where, kind: 'list' }, actions: [] };
  const { toggle, panel } = filterAction(ctx);
  const actions = [{ id: 'assistant:select', value: { mode: 'replace', where } }];
  if (panel) actions.push({ id: panel.id, value: 'on' });
  if (toggle) actions.push({ id: toggle.id, value: 'show_selected' });
  return { query: { where, kind: 'filter' }, actions };
}

// ---------------------------------------------------------------------------
// Table sorting and interface language

const DESC = /\b(?:desc|discendente|decrescente|decrescenti|descending|descendant|decroissant|decroissante|dal piu grande|dal piu recente|piu recenti prima|newest first|largest first|z-a|z a)\b/;
const ASC = /\b(?:asc|ascendente|crescente|crescenti|ascending|croissant|croissante|dal piu piccolo|dal piu vecchio|piu vecchi prima|oldest first|smallest first|a-z)\b/;

// Legend group order: chronological, alphabetical or by size.
function parseLegendOrder(ctx, text, folded) {
  const sortVerb = /^(?:ordina|riordina|ordinami|metti in ordine|sort|order|reorder|arrange|trie|trier|tri|classe)\b/.test(folded) || /\b(?:in ordine|ordine|order|ordre|chronolog\w*|cronologic\w*|temporal\w*)\b/.test(folded);
  if (!sortVerb || !/\b(?:legenda|legend|legende|gruppi|groups|groupes|categorie|categories)\b/.test(folded)) return null;
  const entry = ctx.catalog.find((candidate) => candidate.iid === 'legend-menu-group-order');
  if (!entry) return null;
  const newest = /\b(?:piu recent\w*|newest|latest|most recent|plus recent\w*|dal piu recente)\b/.test(folded);
  const temporal = newest || /\b(?:temporal\w*|cronologic\w*|chronolog\w*|per data|by date|par date|nel tempo|over time|dans le temps|piu vecch\w*|oldest|plus ancien\w*)\b/.test(folded);
  const descending = /\b(?:desc|decrescent\w*|discendent\w*|descending|decroissant\w*|inverso|reverse|inverse|z-a)\b/.test(folded);
  let value;
  if (temporal) value = newest || descending ? 'alphabetic-desc' : 'alphabetic-asc';
  else if (/\b(?:alfabetic\w*|alphabetic\w*|alphabetique\w*|per nome|by name|par nom|a-z|z-a)\b/.test(folded)) value = descending ? 'alphabetic-desc' : 'alphabetic-asc';
  else if (/\b(?:dimension\w*|grandezz\w*|numerosit\w*|size|taille|piu grandi|largest|biggest|piu numeros\w*)\b/.test(folded)) value = /\b(?:crescent\w*|ascending|croissant\w*|piu piccol\w*|smallest)\b/.test(folded) ? 'size-asc' : 'size-desc';
  else return null;
  if (!entry.options.some((option) => option.value === value)) return null;
  const actions = [];
  // A chronological legend only makes sense on a date column.
  if (temporal) {
    const dated = ctx.columns.filter((column) => column !== 'ID' && ctx.values(column).length && ctx.values(column).every(looksLikeDate));
    const colourBy = colourByEntry(ctx);
    if (!dated.includes(ctx.displayCategory) && dated.length === 1 && colourBy) actions.push({ id: colourBy.id, value: dated[0] });
  }
  actions.push({ id: entry.id, value });
  return { actions };
}

function parseSort(ctx, text, folded) {
  if (!/^(?:ordina|riordina|ordinami|sort|order|reorder|trie|trier|tri|classe)\b/.test(folded)) return null;
  if (/\b(?:gruppi|groups|groupes|legenda|legend|legende)\b/.test(folded)) return null;
  if (!ctx.has('assistant:metadata-sort')) return null;
  const direction = DESC.test(folded) ? 'desc' : 'asc';
  let body = text.replace(/^\S+\s*/, '');
  const cleaned = fold(body).replace(DESC, ' ').replace(ASC, ' ').replace(/\b(?:in ordine|ordine|order|ordre|i metadati|la tabella|le righe|the table|the metadata|the rows|le tableau|les metadonnees|les lignes|metadati|tabella|table|tableau)\b/g, ' ');
  const phrase = findColumnPhrase(body);
  let column = phrase ? columnFromPhrase(ctx, phrase) : undefined;
  if (!column) {
    const by = cleaned.match(/\b(?:per|by|secondo|in base a|par|selon|su|on)\s+(?:la |il |the |le |l')?(.+?)\s*$/);
    const candidate = (by ? by[1] : cleaned).trim();
    column = resolveColumn(ctx, candidate) || resolveColumn(ctx, candidate.replace(/\s+/g, '_')) || columnsInText(ctx, cleaned)[0];
  }
  if (!column) return { error: msg(ctx).missingColumn };
  return { actions: [{ id: 'assistant:metadata-sort', value: { column, direction } }] };
}

const LANGUAGES = { it: ['italiano', 'italiana', 'italian', 'italien', 'it'], en: ['inglese', 'english', 'anglais', 'en'], fr: ['francese', 'french', 'francais', 'fr'] };

function parseLanguage(ctx, text, folded) {
  if (!/\b(?:lingua|language|langue|lang)\b/.test(folded) && !/^(?:passa|passiamo|metti|usa|switch|change|use|passe|mets|parla|speak|parle)\b.*\b(?:italiano|inglese|francese|english|italian|french|anglais|francais|italien)\b/.test(folded)) return null;
  const code = Object.entries(LANGUAGES).find(([, words]) => words.some((word) => new RegExp(`\\b${word}\\b`).test(folded.replace(/\b(?:lingua|language|langue|lang)\b/g, ' '))))?.[0];
  if (!code || !ctx.has('assistant:language')) return null;
  return { actions: [{ id: 'assistant:language', value: code }] };
}

// ---------------------------------------------------------------------------
// Macros: recorded sequences of assistant actions

const NUMBERS = { uno: 1, una: 1, un: 1, one: 1, due: 2, two: 2, deux: 2, tre: 3, three: 3, trois: 3, quattro: 4, four: 4, quatre: 4, cinque: 5, five: 5, cinq: 5,
  sei: 6, six: 6, sette: 7, seven: 7, sept: 7, otto: 8, eight: 8, huit: 8, nove: 9, nine: 9, neuf: 9, dieci: 10, ten: 10, dix: 10 };

function macroName(raw) {
  return unquote(String(raw || '').replace(/^(?:chiamata|chiamala|di nome|col nome|con nome|nome|named|called|name|as|come|nommee|appelee|nom)\s+/i, '').trim());
}

function parseMacro(ctx, text, folded) {
  if (!/\bmacros?\b/.test(folded)) return null;
  // the list in the chat: "elenca le macro", "quali macro ci sono"; "mostra le macro"
  // and "apri le macro" open the macros panel (topbar:macros)
  if (/^(?:dammi|elenca|lista|quali|che|list|which|what|liste|quelles)\b.*\bmacros?\b/.test(folded)) {
    return { macro: { op: 'list' } };
  }
  // One-line definition: "crea una macro [Nome]: passo, passo e passo".
  const definition = MACRO_DEFINITION.test(folded) && text.match(/\bmacro\b\s*(.*?)\s*(?::|=|->|→|\s(?:come|che fa|che|con|with|that does|that|as|qui fait|qui|comme|avec|per|for|pour)\s)\s*(.+)$/i);
  if (definition) {
    const steps = [];
    for (const clause of definition[2].split(/\s*[,;]\s*/).filter(Boolean).flatMap(splitClausesInner)) {
      const result = interpret(clause, ctx);
      if (!result?.actions?.length) return { error: `${msg(ctx).macroStep(clause)}${result?.error ? ` ${result.error}` : ''}` };
      steps.push(...result.actions.map(({ id, value }) => (value === undefined ? { id } : { id, value })));
    }
    return { macro: { op: 'define', name: macroName(definition[1]), steps } };
  }
  // "registra una macro", "apri registra macro", "avvia la registrazione della macro":
  // the recorder of the macros panel (its Rec button). Saving the steps of the
  // assistant as a macro needs a saving verb, the last steps or "as macro".
  const savesPlan = /\b(?:salva|memorizza|save|store|sauvegarde)\b/.test(folded) || /\b(?:ultim[ieoa]|last|derni\w*)\b/.test(folded) || /\b(?:come|as|comme)\s+(?:una\s+|a\s+|une\s+)?macro\b/.test(folded);
  const recorder = ctx.catalog.find((entry) => entry.id === 'topbar:macro-record');
  // the recorder word opens the request, at most after a verb of opening or starting
  // ("esegui la macro Registrazione" runs that macro)
  const startsRecorder = /^(?:(?:apri|avvia|inizia|attiva|fai partire|open|start|begin|ouvre|demarre|commence)\s+(?:a\s+|il\s+|la\s+|le\s+|the\s+|l\s+)?)?(?:registr\w*|record\w*|enregistr\w*|crea|create|cree|rec)\b/.test(folded);
  if (recorder && !savesPlan && startsRecorder) {
    return { actions: [{ id: recorder.id }] };
  }
  const record = folded.match(/^(?:registra|salva|memorizza|crea|record|save|store|create|enregistre|sauvegarde|cree)\b/);
  if (record) {
    const count = folded.match(/\b(?:ultim[ieao]|last|derni[ee]re?s?)\s+(\d+|[a-z]+)/);
    let steps = count ? (Number(count[1]) || NUMBERS[count[1]]) : undefined;
    if (count && !steps) return null;
    if (!count && /\b(?:ultim[ieoa]|last|dernier)\b/.test(folded)) steps = 1;
    const name = text.match(/\bmacro\b\s*(.*)$/i)?.[1];
    return { macro: { op: 'record', steps: steps || 'last-plan', name: macroName(name) } };
  }
  // "rinomina la macro Panoramica in Vista completa"; without a name: the last one.
  const rename = text.match(/^\s*(?:rinomina|rename|renomme|cambia (?:il )?nome (?:alla|della)|change the name of)\s+(?:la\s+|the\s+|ultima\s+|last\s+)?macro\s*(.*?)\s+(?:in|to|en|come|as|into)\s+(.+)$/i);
  if (rename) {
    const from = macroName(rename[1].replace(/\b(?:in questo modo|cosi|questa|this|that|ultima|last|appena creata|just created)\b/gi, '').trim());
    const to = macroName(rename[2]);
    return to ? { macro: { op: 'rename', name: from, to } } : null;
  }
  const run = folded.match(/^(?:esegui|lancia|avvia|applica|usa|rilancia|ripeti|fai partire|run|execute|apply|play|launch|replay|use|lance|execute|applique|rejoue)\b/);
  if (run) return { macro: { op: 'run', name: macroName(text.match(/\bmacro\b\s*(.*)$/i)?.[1]) } };
  const remove = folded.match(/^(?:elimina|cancella|rimuovi|togli|delete|remove|drop|supprime|efface)\b/);
  if (remove) return { macro: { op: 'delete', name: macroName(text.match(/\bmacro\b\s*(.*)$/i)?.[1]) } };
  return null;
}

// ---------------------------------------------------------------------------
// Entry point

export function parseClause(rawText, ctx) {
  const text = expandClitics(String(rawText).trim());
  if (!text) return null;
  const folded = fold(text);
  const first = norm(text).split(' ')[0] || '';
  const firstIs = (list) => list.some((word) => (word.length >= 6 ? similar(first, word) : first === word));
  const phrase = findColumnPhrase(text);
  const anyWord = (list) => hasWord(text, list);

  // "nella colonna X sostituisci A con B": move the leading column phrase last.
  if (phrase && phrase.start === 0 && !phrase.suffix && phrase.nameWords && phrase.end < text.length - 1 && /^(?:nella|nelle|nel|in|dans|per|for|sulla|on)\s/.test(folded)) {
    const moved = `${text.slice(phrase.end).trim()} ${text.slice(0, phrase.end).trim()}`;
    if (moved !== text) return parseClause(moved, ctx);
  }
  const legendOrder = parseLegendOrder(ctx, text, folded);
  if (legendOrder) return legendOrder;
  const sorted = parseSort(ctx, text, folded);
  if (sorted) return sorted;
  const language = parseLanguage(ctx, text, folded);
  if (language) return language;

  // Macros and metadata filters/questions come before the generic verbs.
  const macro = parseMacro(ctx, text, folded);
  if (macro) return macro;
  const orientation = parseWhere(ctx, text, folded);
  if (orientation) return orientation;
  const statistics = parseStats(ctx, text, folded);
  if (statistics) return statistics;
  const filter = parseFilter(ctx, text, folded);
  if (filter) return filter;
  // A question never becomes a menu action: answer it or say it was not understood.
  if (isQuestion(text) && !/^(?:apri|chiudi|mostra|open|show|close)\b/.test(folded)) return { error: msg(ctx).question, source: 'question' };

  // "selezionali nella mappa", "show them on the map": the selection is shared
  // by tree, map and table, so this means opening that panel.
  const onPanel = folded.match(/^(?:seleziona|mostra|visualizza|evidenzia|fammi vedere|vedi|select|show|highlight|display|see|selectionne|affiche|montre)\s+(?:(?:i|gli|le|the|les)\s+)?(?:selezionat\w*|selected|selectionne\w*)\s*(?:(?:anche|also|aussi)\s+)?(?:(?:nella|sulla|nel|sul|in|on|into|the|sur|dans|la|le|l)\s+)*(mappa|map|carte|tabella|table|tableau|metadati|metadata|metadonnees|albero|tree|arbre)?\s*$/);
  if (onPanel) {
    const view = !onPanel[1] ? '' : /mapp|map|cart/.test(onPanel[1]) ? 'map' : /alber|tree|arbre/.test(onPanel[1]) ? 'tree' : 'metadata';
    const layout = view && view !== 'tree' ? ctx.catalog.find((entry) => entry.area === 'layout' && entry.type === view) : null;
    if (layout) return { actions: [{ id: layout.id, value: 'on' }] };
    return { error: msg(ctx).alreadySelected };
  }

  // Column operations.
  if (phrase && (firstIs(W.add) || /\b(?:aggiungi|add|crea|create|ajoute|inserisci)\b/.test(folded)) && !/\b(?:alla selezione|to (?:the )?selection)\b/.test(folded)) {
    return parseAddColumn(ctx, text, phrase);
  }
  if ((firstIs(W.rename) || /\b(?:cambia|change|modifica|modifie)\s+(?:il\s+|the\s+|le\s+)?(?:nome|name|nom)\b/.test(folded)) && (phrase || firstIs(W.rename))) {
    const renamed = parseRenameColumn(ctx, text);
    // with the word "colonna" (phrase) the request is surely about a column: its error is final
    if (renamed?.error && phrase) return { ...renamed, definite: true };
    if (renamed && !(renamed.error && !renamed.definite)) return renamed;
  }
  if (phrase && firstIs(W.remove) && !/\b(?:valor[ei]|values?|valeurs?|selezione|selection)\b/.test(folded)) {
    return parseDeleteColumns(ctx, text, phrase);
  }

  // Selection.
  const noun = ['selezione', 'selection', 'selezioni', 'selections'].includes(first);
  if ((!noun && (firstIs(W.select) || firstIs(W.deselect))) || /\b(?:alla selezione|dalla selezione|to (?:the )?selection|from (?:the )?selection)\b/.test(folded)) {
    if (!/\b(?:colonn|column)/.test(folded) || /\b(?:dove|where|con|with)\b/.test(folded)) {
      const selected = parseSelect(ctx, text);
      if (selected) return selected;
    }
  }

  // Colour.
  if (firstIs(W.colour) || /\b(?:colore|colou?r|couleur)\b/.test(folded) && (firstIs(W.set) || firstIs(W.replace))) {
    const coloured = parseColour(ctx, text);
    if (coloured) return coloured;
  }

  // "make Toscana green", "rendi verde la Toscana".
  if (/^(?:make|turn|paint|rendi|fai|fais|rends)\b/.test(folded) && colourIn(text) && valuesInText(ctx, text).length) {
    const coloured = parseColour(ctx, text.replace(/^\S+\s*/, 'colora '));
    if (coloured) return coloured;
  }

  const zoom = parseZoom(ctx, text, folded);
  if (zoom) return zoom;

  // "nascondi i campioni di Teramo", "mostra solo i confermati", "collassa il Lazio".
  const shortcut = selectionShortcut(ctx, text, folded);
  if (shortcut) return shortcut;

  // Value edits.
  if (firstIs(W.replace) || /\b(?:diventa|becomes|devient|->|→)\b/.test(folded)) {
    const replaced = parseReplace(ctx, text);
    if (replaced) return replaced;
  }
  if (firstIs(W.set) || (phrase && firstIs(W.replace))) {
    const set = parseSet(ctx, text);
    if (set) return set;
  }
  if (phrase && firstIs(W.add)) return parseAddColumn(ctx, text, phrase);
  if (anyWord(['undo', 'annulla', 'annuler'])) return null;
  return null;
}

// "Select the triangles", "seleziona i nodi con bordo a spine": selection by a
// node shape or border name (catalog entry settings/node-shape:select), which
// the selection parser looks for in the metadata and does not find there. A
// metadata value with the same name keeps its usual meaning.
const STYLE_SELECTION = /^(?:seleziona|selezionami|select|selectionne|selectionnez|selectionner)\s+(?:(?:tutti i|tutti|i|gli|the|all the|all|les|tous les)\s+)?(?:(?:nodi|nodes|noeuds)\s+)?(?:(?:con|with|avec|che hanno|that have|qui ont)\s+)?(?:(?:il|la|un|una|the|a|le|forma|bordo|shape|border|forme|bordure|de|di|en)\s+)*(.+)$/;

function styleSelection(clause, ctx) {
  const entry = ctx.catalog.find((candidate) => candidate.id === 'settings/node-shape:select');
  if (!entry) return null;
  const match = norm(String(clause).replace(/œ/gi, 'oe')).match(STYLE_SELECTION);
  if (!match) return null;
  const wanted = match[1].trim();
  const option = (entry.options || []).find((candidate) => candidate.terms.some((term) => norm(term) === wanted));
  if (!option) return null;
  if (ctx.columns.some((column) => ctx.values(column).some((value) => norm(value) === wanted))) return null;
  return { actions: [{ id: entry.id, value: option.value }] };
}

// Full deterministic interpretation of one clause: intent parser first, then
// the selection by node shape or border, an optional caller hook (legacy fixed commands), then the menu catalog.
// A parser error (e.g. "value not found") yields to a confident catalog hit,
// because "Selezione visiva" is a menu option, not a selection of samples.
export function interpret(clause, ctx, hook) {
  const parsed = parseClause(clause, ctx);
  if (parsed?.actions?.length || parsed?.macro || parsed?.query || parsed?.stats || parsed?.locate) return parsed;
  if (parsed?.error && (parsed.definite || isQuestion(clause))) return parsed;
  const style = styleSelection(clause, ctx);
  if (style) return style;
  const hooked = hook ? hook(clause) : null;
  if (hooked?.length) return { actions: hooked };
  const generic = tagCatalog(ctx, resolveCatalog(ctx, expandClitics(clause)));
  if (parsed?.error) return generic?.actions && generic.score >= 6 ? generic : parsed;
  return generic;
}

// Marks an answer of the generic resolver, so the caller can weigh it against
// the example bank: "slot" says it also filled a value (a list item or a number).
function tagCatalog(ctx, result) {
  if (!result) return result;
  const action = result.actions?.[0];
  const entry = action && ctx.catalog.find((candidate) => candidate.id === action.id);
  // A list value or a number taken from the request: the option and its value both matched.
  const listValue = entry?.type === 'select' && action.value !== undefined && (entry.options || []).some((option) => String(option.value) === String(action.value));
  const numberValue = ['number', 'slider'].includes(entry?.type) && typeof action.value === 'number';
  const slot = Boolean(listValue || numberValue);
  return { ...result, source: 'catalog', slot };
}
