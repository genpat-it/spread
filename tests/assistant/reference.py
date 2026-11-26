"""Generate docs/ASSISTANT_REFERENCE.md: every SPREAD option, where it is in the
interface, what it does (SPREAD's own help) and what to type to the assistant.
Inputs: tests/assistant/context.en.json (dump_context.py) and
reference-examples.json (node tests/assistant/reference_examples.mjs)."""
import json, os
from collections import OrderedDict
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(os.path.dirname(here))
ctx = json.load(open(os.path.join(here, 'context.en.json')))
examples = json.load(open(os.path.join(here, 'reference-examples.json')))

SECTIONS = OrderedDict([('Settings', lambda a: a.startswith('settings/')), ('Tree', lambda a: a == 'tree'), ('Legend', lambda a: a == 'legend'),
    ('Metadata table', lambda a: a.startswith('metadata')), ('Map', lambda a: a in ('map', 'map-view')), ('Panels', lambda a: a in ('layout', 'topbar')),
    ('Timeline video', lambda a: a == 'video'), ('ReporTree zooms', lambda a: a.startswith('zooms')), ('SPREAD macros', lambda a: a == 'macro'),
    ('Import and export areas', lambda a: a == 'tools'), ('Save and export', lambda a: a == 'file')])

def cell(text):
    return str(text or '').replace('|', '\\|').replace('\n', ' ').strip()

lines = ['# SPREAD assistant reference', '',
         'Generated from the live SPREAD catalog by `tests/assistant/reference.py`; do not edit by hand.', '',
         'For every option: where it is in the interface, what it does, and what to type to the assistant.',
         'Ask the assistant *"where is …?"* and it opens the panel and highlights the control.', '',
         'Data operations (filters, statistics, column edits, macros) are documented in the [assistant guide](assistant.md#what-it-understands).', '']
seen = set()
for title, match in SECTIONS.items():
    entries = [e for e in ctx['catalog'] if match(e['area']) and e['id'] not in seen]
    entries = [e for e in entries if not (e['valueRequired'] and not e['options'] and e['type'] not in ('number', 'slider', 'search', 'text'))]
    if not entries:
        continue
    lines += [f'## {title}', '', '| Option | Where | What it does | Ask the assistant |', '| --- | --- | --- | --- |']
    for e in entries:
        seen.add(e['id'])
        loc = ctx['locations'].get(e['id']) or {}
        path = ' › '.join(loc.get('path') or [])
        name = (loc.get('path') or [e['label']])[-1]
        asks = examples.get(e['id'], [])
        lines.append(f"| {cell(name)} | {cell(path)} | {cell(loc.get('help'))} | {cell(' · '.join(f'`{x}`' for x in asks))} |")
    lines.append('')
open(os.path.join(root, 'docs', 'ASSISTANT_REFERENCE.md'), 'w').write('\n'.join(lines))
print('options documented:', len(seen))
