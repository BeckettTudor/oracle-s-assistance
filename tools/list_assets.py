"""Write assets/files.json: the list of asset files that actually exist.

The game reads this list to request only files that exist (hosts like GitHub
Pages can't list folders, and missing files would log 404 errors).
`python serve.py` builds the same list fresh on every request, so locally it
is never stale; the written file is what GitHub Pages serves.

Run it after adding or removing files in assets/:  python tools/list_assets.py
"""

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDERS = ['characters', 'portraits', 'environment', 'background', 'ui', 'audio']


def asset_files(root=ROOT):
    files = []
    for folder in FOLDERS:
        path = os.path.join(root, 'assets', folder)
        if not os.path.isdir(path):
            continue
        for name in sorted(os.listdir(path)):
            if os.path.isfile(os.path.join(path, name)):
                files.append(f'assets/{folder}/{name}')
    return files


if __name__ == '__main__':
    files = asset_files()
    with open(os.path.join(ROOT, 'assets', 'files.json'), 'w', encoding='utf-8') as f:
        json.dump(files, f, indent=1)
        f.write('\n')
    print(f'Wrote {len(files)} entries to assets/files.json')
