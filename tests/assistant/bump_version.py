"""Bump the assistant build: cache keys in index.html and js/assistant-version.json.
Open pages poll the JSON and ask users to reload when the build changes."""
import json, os, re
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
index = os.path.join(root, 'index.html')
html = open(index).read()
build = int(re.search(r'js/assistant\.js\?v=(\d+)', html).group(1)) + 1
html = re.sub(r'js/assistant\.js\?v=\d+', f'js/assistant.js?v={build}', html)
html = re.sub(r'css/assistant\.css\?v=\d+', f'css/assistant.css?v={build}', html)
open(index, 'w').write(html)
# The parser module is imported by assistant.js: bump its cache key too, or
# browsers keep running a stale parser.
bridge = os.path.join(root, 'js', 'assistant.js')
code = open(bridge).read()
code = re.sub(r'assistant-(intents|examples)\.js\?v=\d+', lambda m: f'assistant-{m.group(1)}.js?v={build}', code)
open(bridge, 'w').write(code)
json.dump({'build': str(build)}, open(os.path.join(root, 'js', 'assistant-version.json'), 'w'))
print('build', build)
