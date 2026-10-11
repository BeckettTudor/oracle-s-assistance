// Finds which optional asset files actually exist, so the loader only requests
// real files (missing files would otherwise log 404 errors in the console).
//
// Static servers such as `python serve.py` return an HTML listing for a
// folder URL. We read the links from that listing. Hosts that give no
// listings (GitHub Pages, for one) get assets/files.json instead, written by
// tools/list_assets.py. If neither is available, we return null and the
// loader simply tries every manifest path.

export async function discoverAssets(folders) {
  const found = new Set();
  let anyListing = false;

  await Promise.all(folders.map(async (folder) => {
    try {
      const res = await fetch(folder, { cache: 'no-store' });
      if (!res.ok) return;
      const type = res.headers.get('content-type') || '';
      if (!type.includes('text/html')) return;
      const html = await res.text();
      anyListing = true;
      const hrefs = html.matchAll(/href\s*=\s*"([^"]+)"/gi);
      for (const [, href] of hrefs) {
        if (href.startsWith('?') || href.startsWith('/') || href.includes('://')) continue;
        const name = decodeURIComponent(href.split('?')[0]);
        if (name && !name.endsWith('/')) found.add(folder + name);
      }
    } catch {
      // Network or parse failure: treat this folder as unknown.
    }
  }));

  if (anyListing) return found;
  return fileList();
}

async function fileList() {
  try {
    const res = await fetch('assets/files.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return new Set(await res.json());
  } catch {
    return null;
  }
}
