"""Write assets/files.json: the list of asset files that actually exist.

The game normally finds asset files by reading the folder listings that
`python serve.py` provides. Hosts like GitHub Pages don't list folders, so
there the game reads this file instead, and only requests files that exist.

Run it after adding or removing files in assets/:  python tools/list_assets.py
"""

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDERS = ['characters', 'portraits', 'environment', 'background', 'ui', 'audio']

files = []
for folder in FOLDERS:
    path = os.path.join(ROOT, 'assets', folder)
    if not os.path.isdir(path):
        continue
    for name in sorted(os.listdir(path)):
        if os.path.isfile(os.path.join(path, name)):
            files.append(f'assets/{folder}/{name}')

out = os.path.join(ROOT, 'assets', 'files.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(files, f, indent=1)
    f.write('\n')
print(f'Wrote {len(files)} entries to assets/files.json')
