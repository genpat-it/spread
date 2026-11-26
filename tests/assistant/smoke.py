import json, subprocess, sys, time, os, glob
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PORT = 8772
DATASET = os.environ.get('SPREAD_DATASET', 'assistant-demo')
GEO = os.environ.get('SPREAD_GEO', '&longitude=longitude&latitude=latitude')
URL = f'http://localhost:{PORT}/?tree=/datasets/{DATASET}/tree.nwk&metadata=/datasets/{DATASET}/metadata.tsv{GEO}'
def chrome():
    hits = sorted(glob.glob(os.path.expanduser('~/.cache/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell')))
    return hits[-1] if hits else None
def open_page(p, lang):
    b = p.chromium.launch(executable_path=chrome())
    pg = b.new_page(viewport={'width': 1600, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL + f'&lang={lang}')
    pg.wait_for_function('window.SPREAD_ASSISTANT && typeof gtiz_tree !== "undefined" && gtiz_tree.tree && gtiz_tree.tree.metadata_info', timeout=60000)
    time.sleep(2)
    return b, pg, errs
if __name__ == '__main__':
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--directory', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            b, pg, errs = open_page(p, sys.argv[1] if len(sys.argv) > 1 else 'it')
            for line in sys.stdin:
                line = line.strip()
                if not line: continue
                r = pg.evaluate('(m) => SPREAD_ASSISTANT.plan(m)', line)
                print('>>', line); print('   ', r['description'], [u['reply'][:110] for u in r['unresolved']])
            print('page errors:', errs)
            b.close()
    finally:
        srv.kill()
