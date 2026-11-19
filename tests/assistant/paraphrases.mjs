// Free phrasings (typos, synonyms, word order, it/en/fr) → expected plan.
// Run: node tests/assistant/paraphrases.mjs
import { context } from './harness.mjs';
import { interpret, splitClauses } from '../../js/assistant-intents.js';

const set = (column, value, where) => ({ id: 'assistant:metadata-set', value: where === undefined ? { column, value } : { column, value, where } });
const eq = (column, value) => ({ column, op: 'eq', value });
const CASES = [
  // add column
  ['it', 'aggiungi una colonna nei metadati di nome Pippo', [{ id: 'assistant:metadata-add-column', value: { column: 'Pippo', value: '' } }]],
  ['it', 'crea la colonna Pippo', [{ id: 'assistant:metadata-add-column', value: { column: 'Pippo', value: '' } }]],
  ['it', 'aggiungi colonna "Note di laboratorio" con valore da verificare', [{ id: 'assistant:metadata-add-column', value: { column: 'Note di laboratorio', value: 'da verificare' } }]],
  ['it', 'nuova colonna chiamata batch con valore B1', [{ id: 'assistant:metadata-add-column', value: { column: 'batch', value: 'B1' } }]],
  ['en', 'add a column named Pippo', [{ id: 'assistant:metadata-add-column', value: { column: 'Pippo', value: '' } }]],
  ['en', 'add a new metadata column called batch with value B1', [{ id: 'assistant:metadata-add-column', value: { column: 'batch', value: 'B1' } }]],
  ['fr', 'ajoute une colonne nommée lot avec la valeur L1', [{ id: 'assistant:metadata-add-column', value: { column: 'lot', value: 'L1' } }]],
  // replace values
  ['it', 'sovrascrivi i valori di Roma nelal colonna province con il valore Rieti', [set('province', 'Rieti', eq('province', 'Roma'))]],
  ['it', 'sostituisci Roma con Rieti nella colonna province', [set('province', 'Rieti', eq('province', 'Roma'))]],
  ['it', 'nella colonna province sostituisci Roma con Rieti', [set('province', 'Rieti', eq('province', 'Roma'))]],
  ['it', 'cambia Milano in Monza', [set('province', 'Monza', eq('province', 'Milano'))]],
  ['it', 'sostituisci roma con Rieti', [set('province', 'Rieti', eq('province', 'Roma'))]],
  ['it', 'Firenze diventa Prato', [set('province', 'Prato', eq('province', 'Firenze'))]],
  ['en', 'replace Roma with Rieti in the province column', [set('province', 'Rieti', eq('province', 'Roma'))]],
  ['en', 'change Milano to Monza', [set('province', 'Monza', eq('province', 'Milano'))]],
  ['fr', 'remplace Roma par Rieti dans la colonne province', [set('province', 'Rieti', eq('province', 'Roma'))]],
  // set values
  ['it', 'imposta outcome a negative per i selezionati', [set('outcome', 'negative', { selected: true })]],
  ['it', 'metti negative nella colonna outcome per i selezionati', [set('outcome', 'negative', { selected: true })]],
  ['it', 'imposta la colonna cluster a Z dove regione è Lazio', [set('cluster', 'Z', eq('region', 'Lazio'))]],
  ['it', 'imposta tutti i valori della colonna cluster a Z', [set('cluster', 'Z')]],
  ['it', 'imposta outcome a negative per IT-001 e IT-002', [set('outcome', 'negative', { ids: ['IT-001', 'IT-002'] })]],
  ['en', 'set outcome to negative for the selected samples', [set('outcome', 'negative', { selected: true })]],
  ['en', 'set all values in the region column to Teramo', [set('region', 'Teramo')]],
  ['en', 'set cluster to Z where region is Lazio', [set('cluster', 'Z', eq('region', 'Lazio'))]],
  // rename / delete
  ['it', 'rinomina region in pippo', [{ id: 'assistant:metadata-rename-column', value: { from: 'region', to: 'pippo' } }]],
  ['it', 'rinomina la colonna region in regione', [{ id: 'assistant:metadata-rename-column', value: { from: 'region', to: 'regione' } }]],
  ['it', 'cambia il nome della colonna cluster in gruppo', [{ id: 'assistant:metadata-rename-column', value: { from: 'cluster', to: 'gruppo' } }]],
  ['en', 'rename column cluster to group', [{ id: 'assistant:metadata-rename-column', value: { from: 'cluster', to: 'group' } }]],
  ['fr', 'renomme la colonne cluster en groupe', [{ id: 'assistant:metadata-rename-column', value: { from: 'cluster', to: 'groupe' } }]],
  ['it', 'elimina la colonna cluster', [{ id: 'assistant:metadata-delete-column', value: { column: 'cluster' } }]],
  ['it', 'cancella le colonne cluster e lineage', [{ id: 'assistant:metadata-delete-column', value: { column: 'cluster' } }, { id: 'assistant:metadata-delete-column', value: { column: 'lineage' } }]],
  ['en', 'delete the cluster column', [{ id: 'assistant:metadata-delete-column', value: { column: 'cluster' } }]],
  // selection
  ['it', 'seleziona i campioni del Lazio', [{ id: 'assistant:select', value: { mode: 'replace', where: eq('region', 'Lazio') } }]],
  ['it', 'seleziona i positivi', [{ id: 'assistant:select', value: { mode: 'replace', where: eq('outcome', 'positive') } }]],
  ['it', 'seleziona Lazio o Toscana', [{ id: 'assistant:select', value: { mode: 'replace', where: { column: 'region', op: 'in', value: ['Lazio', 'Toscana'] } } }]],
  ['it', 'selezionami i Lazio e Toscana', [{ id: 'assistant:select', value: { mode: 'replace', where: { column: 'region', op: 'in', value: ['Lazio', 'Toscana'] } } }]],
  ['it', 'seleziona i campioni di Lazio, Toscana e Veneto', [{ id: 'assistant:select', value: { mode: 'replace', where: { column: 'region', op: 'in', value: ['Lazio', 'Toscana', 'Veneto'] } } }]],
  ['it', 'seleziona dove regione è Lazio e outcome è positive', [{ id: 'assistant:select', value: { mode: 'replace', where: { all: [{ column: 'region', op: 'eq', value: 'Lazio' }, { column: 'outcome', op: 'eq', value: 'positive' }] } } }]],
  ['it', 'seleziona la Tosacna', [{ id: 'assistant:select', value: { mode: 'replace', where: { column: 'region', op: 'eq', value: 'Toscana' } } }]],
  ['it', 'seleziona la Lombadria e il Veento', [{ id: 'assistant:select', value: { mode: 'replace', where: { column: 'region', op: 'in', value: ['Lombardia', 'Veneto'] } } }]],
  ['it', 'colora di nero la Emilia Romanga', [{ id: 'assistant:node-colour', value: { category: 'region', id: 'Emilia-Romagna', colour: '#000000' } }]],
  ['it', 'seleziona dove regione è diverso da Lazio', [{ id: 'assistant:select', value: { mode: 'replace', where: { column: 'region', op: 'ne', value: 'Lazio' } } }]],
  ['it', 'seleziona i campioni con data prima del 2026-01-15', [{ id: 'assistant:select', value: { mode: 'replace', where: { column: 'sampling_date', op: 'lt', value: '2026-01-15' } } }]],
  ['it', 'seleziona IT-001, IT-003 e IT-005', [{ id: 'assistant:select', value: { mode: 'replace', where: { ids: ['IT-001', 'IT-003', 'IT-005'] } } }]],
  ['it', 'aggiungi alla selezione la Toscana', [{ id: 'assistant:select', value: { mode: 'add', where: eq('region', 'Toscana') } }]],
  ['it', 'deseleziona tutto', [{ id: 'assistant:select', value: { mode: 'clear' } }]],
  ['en', 'select samples from Lombardia', [{ id: 'assistant:select', value: { mode: 'replace', where: eq('region', 'Lombardia') } }]],
  ['en', 'select where cluster is A', [{ id: 'assistant:select', value: { mode: 'replace', where: eq('cluster', 'A') } }]],
  ['fr', 'sélectionne les échantillons de Toscana', [{ id: 'assistant:select', value: { mode: 'replace', where: eq('region', 'Toscana') } }]],
  // colour
  ['it', 'colora per regione', [{ id: 'settings/node-style:0', value: 'region' }]],
  ['it', 'colora l\'albero in base alla provincia', [{ id: 'settings/node-style:0', value: 'province' }]],
  ['it', 'colora di rosso la Toscana', [{ id: 'assistant:node-colour', value: { category: 'region', id: 'Toscana', colour: '#e41a1c' } }]],
  ['it', 'colora Lazio in blu', [{ id: 'assistant:node-colour', value: { category: 'region', id: 'Lazio', colour: '#377eb8' } }]],
  ['it', 'colora il campione IT-003 di nero', [{ id: 'assistant:node-colour', value: { category: 'ID', id: 'IT-003', colour: '#000000' } }]],
  ['en', 'colour by region', [{ id: 'settings/node-style:0', value: 'region' }]],
  ['en', 'set the colour of group ST-12 to black', [{ id: 'assistant:node-colour', value: { category: 'lineage', id: 'ST-12', colour: '#000000' } }]],
  ['en', 'make Toscana green', [{ id: 'assistant:node-colour', value: { category: 'region', id: 'Toscana', colour: '#4daf4a' } }]],
  ['it', 'rendi verde la Toscana', [{ id: 'assistant:node-colour', value: { category: 'region', id: 'Toscana', colour: '#4daf4a' } }]],
  ['fr', 'colorer par région', [{ id: 'settings/node-style:0', value: 'region' }]],
  // menus, free phrasing
  ['it', 'nascondi le etichette dei nodi', [{ id: 'settings/node-style:2', value: 'hidden' }]],
  ['it', 'fammi vedere le etichette sui rami', [{ id: 'settings/branch-style:0', value: 'shown' }]],
  ['it', 'metti la scala logaritmica', [{ id: 'settings/branch-style:9', value: 'active' }]],
  ['it', 'togli la scala logaritmica', [{ id: 'settings/branch-style:9', value: 'not-active' }]],
  ['it', 'nodi più grandi: 300', [{ id: 'settings/node-size:1', value: 300 }]],
  ['it', 'raggruppa i gruppi per nome', [{ id: 'legend:11', value: 'alphabetic-asc' }]],
  ['it', 'legenda a istogramma', [{ id: 'legend:15', value: 'histogram' }]],
  ['it', 'massimo 5 gruppi', [{ id: 'legend:7', value: 5 }]],
  ['it', 'palette arcobaleno', [{ id: 'legend:12', value: 'gradient_rainbow' }]],
  ['it', 'mappa di calore', [{ id: 'map:11', value: 'heatmap' }]],
  ['it', 'aggrega la mappa per metadati', [{ id: 'map:0', value: 'metadata' }]],
  ['it', 'scarica la tabella in csv', [{ id: 'metadata:18', value: 'csv' }]],
  ['it', 'esporta la figura in svg', [{ id: 'tree:22', value: 'svg' }]],
  ['it', 'rendering statico', [{ id: 'settings/rendering:0', value: 'static' }]],
  ['it', 'taglia i rami più lunghi di 50', [{ id: 'settings/branch-cutoffs:0', value: 50 }]],
  ['it', 'collassa i rami sotto 3', [{ id: 'settings/branch-style:7', value: 3 }]],
  ['it', 'apri le impostazioni', [{ id: 'layout:0', value: 'on' }]],
  ['it', 'chiudi la legenda', [{ id: 'layout:3', value: 'off' }]],
  ['it', 'schermo intero', [{ id: 'layout:5', value: 'on' }]],
  ['it', 'espandi tutto', [{ id: 'tree:13' }]],
  ['it', 'salva il progetto', [{ id: 'tree:19' }]],
  ['it', 'inverti la selezione', [{ id: 'legend:3' }]],
  ['it', 'evidenzia "IT-003"', [{ id: 'settings/node-style:6', value: 'IT-003' }]],
  ['en', 'hide the node labels', [{ id: 'settings/node-style:2', value: 'hidden' }]],
  ['en', 'turn on the log scale', [{ id: 'settings/branch-style:9', value: 'active' }]],
  ['en', 'show the legend as a histogram', [{ id: 'legend:15', value: 'histogram' }]],
  ['en', 'pie charts on the map', [{ id: 'map:11', value: 'piechart' }]],
  ['en', 'download the image as png', [{ id: 'tree:22', value: 'png' }]],
  ['en', 'sort groups alphabetically', [{ id: 'legend:11', value: 'alphabetic-asc' }]],
  ['en', 'node size 250', [{ id: 'settings/node-size:1', value: 250 }]],
  ['fr', 'masque les étiquettes des nœuds', [{ id: 'settings/node-style:2', value: 'hidden' }]],
  ['fr', 'affiche la carte', [{ id: 'layout:1', value: 'on' }]],
  ['fr', 'carte de chaleur', [{ id: 'map:11', value: 'heatmap' }]],
  // zoom
  ['it', 'dezooma 2x', [{ id: 'assistant:tree-zoom', value: 0.5 }]],
  ['it', 'zooma 3x', [{ id: 'assistant:tree-zoom', value: 3 }]],
  ['it', 'ingrandisci l\'albero 2 volte', [{ id: 'assistant:tree-zoom', value: 2 }]],
  ['it', 'rimpicciolisci', [{ id: 'assistant:tree-zoom', value: 0.667 }]],
  ['it', 'dezooma la mappa 2x', [{ id: 'map-view:zoom', value: 0.5 }]],
  ['en', 'zoom out 2x', [{ id: 'assistant:tree-zoom', value: 0.5 }]],
  ['en', 'zoom in on the map', [{ id: 'map-view:zoom', value: 1.5 }]],
  ['fr', 'dézoome 2x', [{ id: 'assistant:tree-zoom', value: 0.5 }]],
  ['it', 'velocità del video 2x', [{ id: 'video-player:speed', value: 2 }]],
  // legend order
  ['it', 'ordina la legenda temporalmente e metti gradiente', [{ id: 'settings/node-style:0', value: 'sampling_date' }, { id: 'legend:11', value: 'alphabetic-asc' }, { id: 'legend:12', value: 'gradient' }]],
  ['it', 'legenda in ordine cronologico', [{ id: 'settings/node-style:0', value: 'sampling_date' }, { id: 'legend:11', value: 'alphabetic-asc' }]],
  ['it', 'ordina la legenda dal più recente', [{ id: 'settings/node-style:0', value: 'sampling_date' }, { id: 'legend:11', value: 'alphabetic-desc' }]],
  ['en', 'sort the legend chronologically', [{ id: 'settings/node-style:0', value: 'sampling_date' }, { id: 'legend:11', value: 'alphabetic-asc' }]],
  ['en', 'sort the legend by size', [{ id: 'legend:11', value: 'size-desc' }]],
  ['fr', 'trie la légende par ordre chronologique', [{ id: 'settings/node-style:0', value: 'sampling_date' }, { id: 'legend:11', value: 'alphabetic-asc' }]],
  // compound
  ['it', 'seleziona i campioni del Lazio e nascondili', [{ id: 'assistant:select', value: { mode: 'replace', where: eq('region', 'Lazio') } }, { id: 'tree:15' }]],
  ['it', 'colora per regione e apri la mappa', [{ id: 'settings/node-style:0', value: 'region' }, { id: 'layout:1', value: 'on' }]],
  ['it', 'apri la mappa e mostrala come heatmap', [{ id: 'layout:1', value: 'on' }, { id: 'map:11', value: 'heatmap' }]],
  ['en', 'select Toscana, collapse them and then open the legend', [{ id: 'assistant:select', value: { mode: 'replace', where: eq('region', 'Toscana') } }, { id: 'tree:11' }, { id: 'layout:3', value: 'on' }]]
];

const strip = (actions) => actions.map(({ id, value }) => (value === undefined ? { id } : { id, value }));
let failures = 0;
for (const [lang, message, expected] of CASES) {
  const ctx = context(lang);
  const actions = [];
  let error = '';
  for (const clause of splitClauses(message)) {
    const result = interpret(clause, ctx);
    if (result?.actions) actions.push(...result.actions);
    else { error = result?.error || 'no match'; break; }
  }
  const got = error ? null : strip(actions);
  const ok = expected === null ? true : JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL [${lang}] ${message}\n   expected ${JSON.stringify(expected)}\n   got      ${error || JSON.stringify(got)}`); }
  else if (expected === null) console.log(`INFO [${lang}] ${message} → ${error || JSON.stringify(got)}`);
}
console.log(`paraphrases: ${CASES.length - failures}/${CASES.length}`);
process.exitCode = failures ? 1 : 0;
