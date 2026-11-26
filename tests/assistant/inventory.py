"""Does the assistant know every SPREAD function? Lists the menus of SPREAD
(every array of menu items reachable from the gtiz_* objects) and the tools of
the top bar, and fails when one of them is neither in the assistant catalog nor
in KNOWN_GAPS below, with its reason. Run after a new menu item or tool:

    python tests/assistant/inventory.py

A new item either gets registered in js/assistant.js (refreshRegistry) or, if
the assistant cannot or should not run it, an entry in KNOWN_GAPS.
"""
import os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smoke import ROOT, PORT, open_page  # noqa: E402

# Menus registered under another name, and menus that are not user options.
SKIP_MENUS = {
    'gtiz_search': 'index of the same menus for the search panel',
    'gtiz_metadata.modal_form': 'fields of the add, edit and remove column modals: the assistant runs these as typed operations (assistant:metadata-*)',
    'gtiz_file_handler.load_options': 'needs the file dialog of the browser: the assistant opens the load modal (tree menu)',
    'gtiz_macros.macros': 'built-in macros, registered one by one as macro:*',
}
# Items with an id that the assistant does not run, with the reason.
KNOWN_GAPS = {
    'file-handler-save-package-with-zooms': 'shown only with ReporTree zooms on the full tree (registered then)',
    'file-handler-export-notes-md': 'shown only when there are notes (registered then)',
    'file-handler-export-notes-docx': 'shown only when there are notes (registered then)',
}
# Tools of the top bar: the catalog area that covers each, or the reason.
TOOLS = {
    'tool-search': 'topbar', 'tool-macros': 'topbar', 'tool-notes': 'topbar', 'tool-lang': 'topbar',
    'tool-fullscreen': 'topbar', 'tool-theme': 'topbar',
    '': 'topbar',  # the information button has no tool class
}

names = sorted(set(re.findall(r'^let (gtiz_[a-z_]+)', '\n'.join(open(os.path.join(dp, f)).read() for dp, _, fs in os.walk(os.path.join(ROOT, 'js')) for f in fs if f.endswith('.js')), re.M)))
GLOBALS = '{' + ','.join(f'{n}: typeof {n} !== "undefined" ? {n} : undefined' for n in names) + '}'
JS = '''() => {
  const G = %s;
  const catalog = SPREAD_ASSISTANT.context().catalog;
  const label = (o) => { try { const l = typeof o.label === 'function' ? o.label() : o.label; return typeof l === 'string' ? l.replace(/<[^>]+>/g, '') : ''; } catch (e) { return ''; } };
  const isItem = (o) => o && typeof o === 'object' && !(o instanceof Node) && 'label' in o && (typeof o.function === 'function' || 'type' in o);
  const menus = []; const seen = new WeakSet();
  const walk = (obj, path, depth) => {
    if (!obj || typeof obj !== 'object' || obj instanceof Node || obj === window || depth > 4 || seen.has(obj)) return;
    seen.add(obj);
    if (Array.isArray(obj)) {
      if (obj.some(isItem)) menus.push({ path, items: obj.map((o, index) => isItem(o) && o.type !== 'separator' && o.type !== 'label' ? { index, id: o.id || null, type: o.type || null, label: label(o), runs: typeof o.function === 'function' } : null).filter(Boolean) });
      obj.forEach((x, i) => walk(x, path + '[' + i + ']', depth + 1));
      return;
    }
    let keys = []; try { keys = Object.keys(obj); } catch (e) { return; }
    for (const k of keys) { let v; try { v = obj[k]; } catch (e) { continue; } if (v && typeof v === 'object') walk(v, path + '.' + k, depth + 1); }
  };
  for (const [k, v] of Object.entries(G)) walk(v, k, 0);
  const tools = [...document.querySelectorAll('.toolbar .tool')].map((node) => [...node.classList].find((c) => c.startsWith('tool-')) || '');
  return { catalog: catalog.map((e) => ({ id: e.id, iid: e.iid, label: e.label })), menus, tools };
}''' % GLOBALS

srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--directory', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        browser, page, errors = open_page(p, 'en')
        data = page.evaluate(JS)
        browser.close()
finally:
    srv.kill()

ids = {e['iid'] for e in data['catalog'] if e['iid']}
labels = {e['label'].strip().lower() for e in data['catalog'] if e['label']}
areas = {e['id'].split(':')[0] for e in data['catalog']}
missing, checked = [], 0
for menu in data['menus']:
    if any(menu['path'] == skip or menu['path'].startswith(skip + '.') or menu['path'].startswith(skip + '[') for skip in SKIP_MENUS):
        continue
    for item in menu['items']:
        if not item['runs']:
            continue
        checked += 1
        if (item['id'] and item['id'] in ids) or item['label'].strip().lower() in labels or item['id'] in KNOWN_GAPS:
            continue
        missing.append(f"{menu['path']}[{item['index']}] {item['id'] or '(no id)'} “{item['label']}”")
for tool in data['tools']:
    checked += 1
    covered = TOOLS.get(tool)
    if covered is None or covered not in areas:
        missing.append(f"top bar tool .{tool or '(no class)'}")
print(f'inventory: {checked - len(missing)}/{checked} SPREAD functions known to the assistant; page errors: {errors}')
for line in missing:
    print('  MISSING', line)
sys.exit(1 if missing or errors else 0)
