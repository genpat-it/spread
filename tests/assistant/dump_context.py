"""Dump the live assistant context (catalog + data) per language as JSON fixtures."""
import json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import ROOT, PORT, open_page
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--directory', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        for lang in ['it', 'en', 'fr']:
            b, pg, errs = open_page(p, lang)
            ctx = pg.evaluate('''() => { const c = SPREAD_ASSISTANT.context(); const rows = Object.entries(gtiz_tree.tree.metadata).filter(([k, r]) => k !== 'ID' && k !== 'CMP' && r && r.ID && !String(r.ID).includes('_hypo')).map(([, r]) => r);
              return { ...c, rows, displayCategory: gtiz_tree.tree.display_category, protectedColumns: ['ID','CMP','nothing','__Node', gtiz_file_handler.samples_column] } }''')
            json.dump(ctx, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f'context.{lang}.json'), 'w'), indent=1, ensure_ascii=False)
            print(lang, len(ctx['catalog']), 'entries', errs)
            b.close()
finally:
    srv.kill()
