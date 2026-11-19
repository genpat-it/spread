"""Build the assistant capability map (what is covered, what is not) as one HTML page.
Input: coverage-results.json from `node tests/assistant/coverage.mjs --json`.
Usage: python tests/assistant/capability_map.py OUTPUT.html"""
import html, json, os, sys
from collections import OrderedDict
here = os.path.dirname(os.path.abspath(__file__))
records = json.load(open(os.path.join(here, 'coverage-results.json')))

AREA = OrderedDict([('tree', 'Tree'), ('settings', 'Settings: node and branch style, size, cut-offs, rendering'), ('legend', 'Legend'),
    ('metadata', 'Metadata table'), ('metadata-card', 'Metadata table'), ('map', 'Map'), ('layout', 'Panels'), ('video', 'Timeline video'),
    ('zooms', 'ReporTree zooms'), ('zooms-filtered', 'ReporTree zooms'), ('macro', 'SPREAD macros')])

options = OrderedDict()
for r in records:
    key = r['id']
    o = options.setdefault(key, {'area': AREA.get(r['area'].split('/')[0], r['area']), 'labels': {}, 'langs': {}, 'example': {}})
    o['labels'].setdefault(r['lang'], r['label'])
    o['langs'][r['lang']] = o['langs'].get(r['lang'], True) and r['ok']
    o['example'].setdefault(r['lang'], r['phrase'])

DATA = [
    ('Filter the table', 'dammi i metadati che verificano regione è Abruzzo e source è food', True),
    ('Count or list matching samples', 'quanti campioni ci sono in Toscana? · quali campioni hanno outcome negative?', True),
    ('Distinct values, groups, most frequent', 'quanti valori distinti ci sono nella colonna ST? · quanti campioni per regione?', True),
    ('Minimum, maximum, range, missing values', 'qual è la data più recente? · quanti valori mancanti in cluster?', True),
    ('Select by condition (and / or / ≠ / dates / years)', 'seleziona i campioni con data dopo il 2026-01-10 · seleziona Lazio o Toscana', True),
    ('Select and act', 'nascondi i campioni di Teramo · collassa quelli del cluster A · mostra solo i confermati', True),
    ('Colour by column / one group / selection', 'colora per sierotipo · colora di rosso la Toscana · seleziona Teramo e colorali di blu', True),
    ('Add, rename, delete columns', 'aggiungi la colonna focolaio con valore sì per i selezionati · rinomina matrix in matrice', True),
    ('Replace and set values', 'sostituisci Roma con Rieti nella colonna provincia · imposta outcome a confirmed dove cluster è A', True),
    ('Sort the table', 'ordina la tabella per data decrescente', True),
    ('Export the (filtered) table', 'esporta la tabella in csv', True),
    ('Zoom tree or map', 'dezooma 2x · ingrandisci la mappa 3x', True),
    ('Macros: define, record, list, run, rename, delete', 'crea la macro Vista: apri la mappa, chiudi la legenda · registra gli ultimi 3 passaggi come macro', True),
    ('Change interface language', 'cambia lingua in inglese', True),
    ('Compound requests', 'colora per regione e apri la mappa e poi ordina la tabella per data', True),
]
MISSING = [
    ('Load files (tree, metadata, SPREAD JSON)', 'needs the browser file dialog; the assistant can only open it'),
    ('Lasso / rectangle selection on the map', 'a drawing gesture, not a command'),
    ('Clicking single legend items', 'covered indirectly by “seleziona i campioni di X”'),
    ('Per-column filters inside the table (ag-grid)', 'filters go through selection + “selected only”'),
    ('Undo / redo', 'not exposed by SPREAD to the assistant yet'),
    ('Relative dates (“ieri”, “ultime due settimane”)', 'only ISO dates and years; candidate: chrono-node'),
    ('ReporTree zooms without zoom files', 'options appear only when zoom data is loaded'),
    ('Free paraphrases outside the grammar', 'reported as not understood; candidate: multilingual embeddings'),
]

def tick(ok):
    return '<span class="ok" aria-label="covered">✓</span>' if ok else '<span class="no" aria-label="not covered">✗</span>'

groups = OrderedDict()
for key, o in options.items():
    groups.setdefault(o['area'], []).append((key, o))
total = len(options); ok_all = sum(all(o['langs'].values()) and len(o['langs']) == 3 for o in options.values())
phrases = len(records); phrases_ok = sum(r['ok'] for r in records)

rows = []
for area, items in groups.items():
    rows.append(f'<tr class="group"><th colspan="5" scope="rowgroup">{html.escape(area)} <span class="count">{len(items)}</span></th></tr>')
    for key, o in items:
        label = o['labels'].get('en') or o['labels'].get('it') or key
        rows.append('<tr><td class="label">{}</td>{}<td class="ex">{}</td></tr>'.format(
            html.escape(label), ''.join(f'<td class="c">{tick(o["langs"].get(l, False))}</td>' for l in ('it', 'en', 'fr')), html.escape(o['example'].get('it', ''))))
data_rows = ''.join(f'<tr><td class="label">{html.escape(n)}</td><td class="c">{tick(ok)}</td><td class="ex">{html.escape(e)}</td></tr>' for n, e, ok in DATA)
miss_rows = ''.join(f'<tr><td class="label">{html.escape(n)}</td><td class="c">{tick(False)}</td><td class="ex">{html.escape(why)}</td></tr>' for n, why in MISSING)

page = f'''<title>SPREAD Assistant Coverage</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@400;600;700&display=swap">
<style>
/* Layout: one reading column; summary tiles, then three tables (menus, data, gaps). SPREAD's own palette. */
:root {{
  --bg: #f2f5ff; --surface: #ffffff; --text: #17324d; --muted: #555659; --line: #e6e9f2;
  --main: #0066cc; --ok: #1f8a86; --no: #d63a52; --chip: #dbe7ed;
  --font: 'Titillium Web', 'Segoe UI', system-ui, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ color-scheme: dark; --bg: #0e1724; --surface: #15212f; --text: #e6edf5; --muted: #9aa8b8; --line: #243346; --main: #5ea8ff; --ok: #45c7c2; --no: #ff6b81; --chip: #1d2d40; }} }}
:root[data-theme="dark"] {{ color-scheme: dark; --bg: #0e1724; --surface: #15212f; --text: #e6edf5; --muted: #9aa8b8; --line: #243346; --main: #5ea8ff; --ok: #45c7c2; --no: #ff6b81; --chip: #1d2d40; }}
body {{ background: var(--bg); color: var(--text); font: 15px/1.5 var(--font); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }}
.wrap {{ margin: 0 auto; max-width: 1040px; padding-block: 32px 48px; display: flex; flex-direction: column; gap: 24px; }}
h1 {{ font-size: 30px; font-weight: 700; margin: 0; text-wrap: balance; }}
h2 {{ font-size: 19px; font-weight: 700; margin: 0 0 4px; }}
p {{ margin: 0; max-width: 68ch; color: var(--muted); }}
.tiles {{ display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }}
.tile {{ background: var(--surface); border-radius: 18px; padding: 16px 18px; }}
.tile b {{ display: block; font-size: 28px; font-variant-numeric: tabular-nums; line-height: 1.1; }}
.tile span {{ color: var(--muted); font-size: 13px; }}
.card {{ background: var(--surface); border-radius: 24px; padding: 20px 20px 8px; }}
.scroll {{ overflow-x: auto; }}
table {{ border-collapse: collapse; width: 100%; min-width: 620px; font-size: 14px; }}
th, td {{ border-bottom: 1px solid var(--line); padding: 7px 8px; text-align: left; vertical-align: top; }}
thead th {{ color: var(--muted); font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }}
tr.group th {{ background: var(--chip); color: var(--text); font-size: 13px; font-weight: 600; padding: 6px 10px; }}
.count {{ color: var(--muted); font-weight: 400; margin-left: 6px; }}
td.c, th.c {{ text-align: center; width: 44px; }}
td.ex {{ color: var(--muted); font-size: 13px; }}
.ok {{ color: var(--ok); font-weight: 700; }}
.no {{ color: var(--no); font-weight: 700; }}
.legend {{ font-size: 13px; color: var(--muted); }}
</style>
<div class="wrap">
  <header>
    <h1>SPREAD Assistant Coverage</h1>
    <p>What the local assistant can do on branch <code>feat/local-browser-assistant</code>. Menu rows come from the automated coverage test: for every option and every interface language, the phrase a user would form from the visible label must resolve to that option with the right value.</p>
  </header>
  <section class="tiles" aria-label="Summary">
    <div class="tile"><b>{ok_all}/{total}</b><span>menu options covered in all three languages</span></div>
    <div class="tile"><b>{phrases_ok}/{phrases}</b><span>test phrases resolved correctly</span></div>
    <div class="tile"><b>{len(DATA)}</b><span>data operations and questions</span></div>
    <div class="tile"><b>{len(MISSING)}</b><span>known gaps</span></div>
  </section>
  <section class="card">
    <h2>Data operations and questions</h2>
    <p class="legend">Tested end to end in the browser (type, apply, check SPREAD's state).</p>
    <div class="scroll"><table><thead><tr><th>Capability</th><th class="c">✓</th><th>Example</th></tr></thead><tbody>{data_rows}</tbody></table></div>
  </section>
  <section class="card">
    <h2>Every SPREAD menu option</h2>
    <p class="legend">IT / EN / FR: the option is reached with that language's wording. Example: the Italian test phrase.</p>
    <div class="scroll"><table><thead><tr><th>Option</th><th class="c">IT</th><th class="c">EN</th><th class="c">FR</th><th>Example</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div>
  </section>
  <section class="card">
    <h2>Not covered yet</h2>
    <div class="scroll"><table><thead><tr><th>Gap</th><th class="c">✓</th><th>Why / next step</th></tr></thead><tbody>{miss_rows}</tbody></table></div>
  </section>
</div>
'''
open(sys.argv[1], 'w').write(page)
print('options', total, 'covered in all languages', ok_all)
