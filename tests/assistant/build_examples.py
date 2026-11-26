"""Build js/assistant-examples.json, the example bank of the assistant.

Passages per catalog entry, keyed by the entry's stable key (see entryKey in
js/assistant.js): menu path, help text, labels and terms in it/en/fr (from the
dumped fixtures), the plain descriptions in semantic_descriptions.json and the
generated requests in semantic/gen_*.json, both keyed by the same keys.

Run after dump_context.py: python tests/assistant/build_examples.py
"""
import glob, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))


def fixture(lang):
    return json.loads(open(os.path.join(HERE, f'context.{lang}.json')).read().replace('-Infinity', 'null').replace('Infinity', 'null'))


def main():
    bank = {}
    for lang in ('it', 'en', 'fr'):
        raw = fixture(lang)
        for entry in raw['catalog']:
            if entry['type'] == 'macro':
                continue
            texts = bank.setdefault(entry['key'], [])
            loc = raw['locations'].get(entry['id']) or {}
            if loc.get('path'):
                texts.append(' › '.join(loc['path']))
            if loc.get('help'):
                texts.append(loc['help'])
            if entry.get('label'):
                texts.append(entry['label'])
            texts.extend(entry['terms'])
            texts.extend(option['label'] for option in entry['options'])
    sources = [os.path.join(HERE, 'semantic_descriptions.json')] + sorted(glob.glob(os.path.join(HERE, 'semantic', 'gen_*.json')))
    missing = set()
    for path in sources:
        for key, texts in json.load(open(path)).items():
            if key not in bank:
                missing.add(key)
                continue
            bank[key].extend(texts)
    out = {key: sorted({text.strip() for text in texts if text and text.strip()}) for key, texts in bank.items()}
    target = os.path.join(ROOT, 'js', 'assistant-examples.json')
    with open(target, 'w') as handle:
        json.dump(out, handle, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(out)} entries, {sum(map(len, out.values()))} passages, {os.path.getsize(target)} bytes; keys no longer in the catalog: {sorted(missing)}')


if __name__ == '__main__':
    main()
