"""End-to-end: type requests in the assistant panel, click Apply, check SPREAD's state.
Run: python tests/assistant/e2e.py   (needs playwright + chromium headless shell)"""
import os, subprocess, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import ROOT, PORT, open_page

PLAN = ['']
REPLIES = [[]]
ROWS = '''() => Object.entries(gtiz_tree.tree.metadata).filter(([k, r]) => k !== 'ID' && k !== 'CMP' && r && r.ID && !String(r.ID).includes('_hypo')).map(([, r]) => ({...r}))'''

def ask(pg, message):
    if pg.evaluate("document.querySelector('.spread-assistant').hidden"):
        pg.click('.spread-assistant-launcher')
        time.sleep(0.3)
    count = pg.evaluate("document.querySelectorAll('.spread-assistant__message--assistant').length")
    pg.fill('.spread-assistant__form textarea', message)
    pg.click('.spread-assistant__form button[type=submit]')
    time.sleep(0.3)
    plan_visible = pg.evaluate("!document.querySelector('.spread-assistant__plan').hidden")
    plan = pg.evaluate("[...document.querySelectorAll('.spread-assistant__plan li')].map(n => n.textContent).join(' ; ')") if plan_visible else ''
    if plan_visible:
        pg.click('[data-assistant-confirm]')
        time.sleep(1.2)
    messages = pg.evaluate("[...document.querySelectorAll('.spread-assistant__message--assistant')].map(n => n.textContent)")
    return plan, messages[count:]

CASES = [
    ('it', 'aggiungi una colonna nei metadati di nome Pippo',
     lambda rows, pg: all('Pippo' in r and r['Pippo'] == '' for r in rows)),
    ('it', 'imposta la colonna Pippo a ciao dove regione è Lazio',
     lambda rows, pg: sorted(r['ID'] for r in rows if r['Pippo'] == 'ciao') == ['IT-001', 'IT-002']),
    ('it', 'sovrascrivi i valori di Roma nelal colonna province con il valore Rieti',
     lambda rows, pg: sorted(r['ID'] for r in rows if r['province'] == 'Rieti') == ['IT-001', 'IT-002'] and not any(r['province'] == 'Roma' for r in rows)),
    ('it', 'rinomina region in regione',
     lambda rows, pg: all('regione' in r and 'region' not in r for r in rows) and rows[0]['regione'] in ('Lazio', 'Lombardia', 'Toscana', 'Veneto', 'Emilia-Romagna')),
    ('it', 'colora per regione',
     lambda rows, pg: pg.evaluate('gtiz_tree.tree.display_category') == 'regione'),
    ('it', 'seleziona dove esito è positive e regione è Lombardia',
     lambda rows, pg: sorted(pg.evaluate('gtiz_tree.tree.getAllSelectedNodesIDs()')) == ['IT-004']),
    ('it', 'aggiungi la colonna stato con valore sì per i selezionati e no per gli altri',
     lambda rows, pg: {r['ID']: r['stato'] for r in rows}['IT-004'] == 'sì' and all(r['stato'] == 'no' for r in rows if r['ID'] != 'IT-004')),
    ('it', 'seleziona i campioni della Toscana',
     lambda rows, pg: sorted(pg.evaluate('gtiz_tree.tree.getAllSelectedNodesIDs()')) == ['IT-007', 'IT-008']),
    ('it', 'deseleziona tutto',
     lambda rows, pg: pg.evaluate('gtiz_tree.tree.getAllSelectedNodesIDs()') == []),
    ('it', 'elimina la colonna Pippo',
     lambda rows, pg: all('Pippo' not in r for r in rows)),
    ('it', 'aggiungi la colonna tmp con valore x e poi colora per tmp',
     lambda rows, pg: pg.evaluate('gtiz_tree.tree.display_category') == 'tmp'),
    ('it', 'colora di nero il campione IT-003', lambda rows, pg: True),
    ('it', 'seleziona i campioni della Lombardia e colorali di rosso',
     lambda rows, pg: pg.evaluate('gtiz_tree.tree.display_category') == 'evidenziati' and sorted(r['ID'] for r in rows if r.get('evidenziati') == 'rosso') == ['IT-003', 'IT-004']),
    ('it', 'nascondi i campioni della Toscana', lambda rows, pg: 'Nascondi' in PLAN[0]),
    ('it', 'mostra solo i campioni positive', lambda rows, pg: 'sottoalberi' in PLAN[0]),
    ('it', 'cambia Milano in Monza', lambda rows, pg: sorted(r['ID'] for r in rows if r['province'] == 'Monza') == ['IT-003', 'IT-004']),
    ('it', 'imposta outcome a negative per IT-001 e IT-002', lambda rows, pg: all(r['outcome'] == 'negative' for r in rows if r['ID'] in ('IT-001', 'IT-002'))),
    ('it', 'seleziona i campioni con data dopo il 2026-01-20 e collassali', lambda rows, pg: True),
    ('it', 'mostra le etichette dei nodi e imposta la dimensione dei nodi a 200', lambda rows, pg: True),
    ('it', 'dammi i metadati che verificano regione è Lombardia e outcome è positive',
     lambda rows, pg: sorted(pg.evaluate('gtiz_tree.tree.getAllSelectedNodesIDs()')) == ['IT-004'] and pg.evaluate('gtiz_metadata.show_nodes') == 'show_selected' and pg.evaluate('gtiz_metadata.options.api.getDisplayedRowCount()') == 1 and any('1 campioni' in r for r in REPLIES[0])),
    ('it', 'quanti campioni ci sono in Toscana', lambda rows, pg: any(r.startswith('2 campioni') for r in REPLIES[0]) and not PLAN[0]),
    ('it', 'quali campioni hanno outcome negative', lambda rows, pg: any('IT-001' in r and 'IT-006' in r for r in REPLIES[0])),
    ('it', 'togli il filtro', lambda rows, pg: pg.evaluate('gtiz_metadata.show_nodes') == 'show_all'),
    ('it', 'colora per province', lambda rows, pg: pg.evaluate('gtiz_tree.tree.display_category') == 'province'),
    ('it', 'zooma 2x', lambda rows, pg: True),
    ('it', 'registra gli ultimi 2 passaggi come macro prova', lambda rows, pg: any('salvata con 2' in r for r in REPLIES[0]) and pg.evaluate('SPREAD_ASSISTANT.macros().length') == 1),
    ('it', 'colora per cluster', lambda rows, pg: pg.evaluate('gtiz_tree.tree.display_category') == 'cluster'),
    ('it', 'esegui la macro prova', lambda rows, pg: pg.evaluate('gtiz_tree.tree.display_category') == 'province'),
    ('it', 'dammi la lista delle macro', lambda rows, pg: any('prova' in r and 'Scala logaritmica' in r for r in REPLIES[0])),
    ('it', 'elimina la macro prova', lambda rows, pg: pg.evaluate('SPREAD_ASSISTANT.macros().length') == 0),
    ('it', 'ordina i metadati desc per la colonna sampling_date',
     lambda rows, pg: pg.evaluate("gtiz_metadata.options.columnApi.getColumnState().filter(c => c.sort).map(c => c.colId + ':' + c.sort).join()") == 'sampling_date:desc'),
    ('it', 'aiuto', lambda rows, pg: any('Filtri e domande' in r for r in REPLIES[0])),
    ('it', '#auto', None),
    ('it', 'colora per cluster', lambda rows, pg: pg.evaluate('gtiz_tree.tree.display_category') == 'cluster' and pg.evaluate("document.querySelector('.spread-assistant__plan').hidden")),
    ('it', 'cambia lingua in inglese', lambda rows, pg: 'en' in PLAN[0] and 'lang=en' not in pg.url),
    ('it', '#cancel', None),
    ('it', '#manual', None),
    ('it', 'crea la macro Panoramica: apri la mappa, apri i metadati e chiudi la legenda', lambda rows, pg: any('salvata con 3' in r for r in REPLIES[0])),
    ('it', 'crea la macro Prova: apri la mappa, fai una danza', lambda rows, pg: any('fai una danza' in r and 'non l’ho salvata' in r for r in REPLIES[0])),
    ('it', 'crea una macro come apri mappa, apri metadati, nascondi legenda', lambda rows, pg: True),
    ('it', 'rinomina macro in questo modo in "custom macro"', lambda rows, pg: any('custom macro' in r for r in REPLIES[0]) and 'custom macro' in pg.evaluate('SPREAD_ASSISTANT.macros().map(m => m.name).join()')),
    ('it', 'rinomina la macro custom macro in Vista base', lambda rows, pg: 'Vista base' in pg.evaluate('SPREAD_ASSISTANT.macros().map(m => m.name).join()')),
    ('it', 'esegui la macro Panoramica', lambda rows, pg: pg.evaluate("document.querySelector('.quick-actions .toggle-box[data-view=legend]').dataset.selection") == 'off'),
    ('it', 'metti il carattere a 20', lambda rows, pg: pg.evaluate("[document.getElementById('tree-node-label-font-size-slider').value, document.getElementById('tree-node-label-font-size').value, String(gtiz_tree.node_label_font_size)].join()") == '20,20,20'),
    ('it', 'dimensione nodi 250', lambda rows, pg: pg.evaluate("document.getElementById('tree-node-radius-size-slider').value") == '250'),
    ('it', 'scala logaritmica', lambda rows, pg: pg.evaluate("document.getElementById('tree-branch-toggle-log-scale').getAttribute('data-selection')") == 'active'),
    ('it', 'rendering statico', lambda rows, pg: pg.evaluate("document.querySelector('#tree-rendering-toggle').getAttribute('data-selection')") == 'static'),
    ('it', 'quanti valori distinti ci sono nella colonna cluster?', lambda rows, pg: any('cluster' in r and 'A' in r for r in REPLIES[0]) and not PLAN[0]),
    ('it', 'quanti campioni per regione?', lambda rows, pg: any('Toscana' in r for r in REPLIES[0])),
    ('it', '#history', None),
    ('it', 'apri la mappa e mostrala come heatmap', lambda rows, pg: 'heatmap' in PLAN[0].lower() and 'legenda' not in PLAN[0].lower()),
    ('en', 'show only the selected rows in the table', lambda rows, pg: 'show_selected' in PLAN[0] or 'selezionati' in PLAN[0].lower()),
    ('it', 'imposta la dimensione dei nodi a 150', lambda rows, pg: '150' in PLAN[0] and ('raggio' in PLAN[0].lower() or 'radius' in PLAN[0].lower())),
]

def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--directory', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    failures = 0
    try:
        with sync_playwright() as p:
            b, pg, errs = open_page(p, 'it')
            for lang, message, check in CASES:
                if message == '#auto':
                    pg.check('[data-assistant-auto]'); continue
                if message == '#history':
                    pg.fill('.spread-assistant__form textarea', 'bozza')
                    pg.focus('.spread-assistant__form textarea'); pg.keyboard.press('ArrowUp'); last = pg.input_value('.spread-assistant__form textarea')
                    pg.keyboard.press('ArrowUp'); prev = pg.input_value('.spread-assistant__form textarea')
                    pg.keyboard.press('ArrowDown'); pg.keyboard.press('ArrowDown'); draft = pg.input_value('.spread-assistant__form textarea')
                    ok = last == 'quanti campioni per regione?' and prev == 'quanti valori distinti ci sono nella colonna cluster?' and draft == 'bozza'
                    failures += not ok; print('PASS' if ok else 'FAIL', '| history ↑↑↓↓ |', last, '|', prev, '|', draft)
                    pg.fill('.spread-assistant__form textarea', ''); continue
                if message == '#manual':
                    pg.uncheck('[data-assistant-auto]'); continue
                if message == '#cancel':
                    if pg.evaluate("!document.querySelector('.spread-assistant__plan').hidden"): pg.click('[data-assistant-cancel]')
                    continue
                if message.startswith('cambia lingua'):
                    pg.fill('.spread-assistant__form textarea', message); pg.click('.spread-assistant__form button[type=submit]'); time.sleep(0.4)
                    PLAN[0] = pg.evaluate("[...document.querySelectorAll('.spread-assistant__plan li')].map(n => n.textContent).join(' ; ')")
                    ok = check([], pg); failures += not ok
                    print('PASS' if ok else 'FAIL', '|', message, '|', PLAN[0]); continue
                plan, replies = ask(pg, message)
                PLAN[0] = plan
                rows = pg.evaluate(ROWS)
                REPLIES[0] = replies
                applied = (not plan or any(r.startswith('Fatto') or r.startswith('Done') for r in replies)) and not any('Non ho applicato' in r or 'not applied' in r.lower() for r in replies)
                try: ok = applied and check(rows, pg)
                except Exception as e: ok = False; replies.append(f'check error: {e}')
                failures += not ok
                print('PASS' if ok else 'FAIL', '|', message, '|', plan.replace('\n', ' ; '), '|', ' / '.join(replies)[:200])
            print('page errors:', errs)
            failures += bool(errs)
            b.close()
    finally:
        srv.kill()
    real = [c for c in CASES if not c[1].startswith('#') or c[1] == '#history']
    print(f'e2e: {len(real) - failures}/{len(real)} passed')
    sys.exit(1 if failures else 0)

if __name__ == '__main__':
    main()
