// Finds which optional asset files actually exist, so the loader only requests
// real files (missing files would otherwise log 404 errors in the console).
//
// First choice is assets/files.json, the list of files that exist. On GitHub
// Pages it is the static file written by tools/list_assets.py; `python
// serve.py` builds it fresh from disk on every request, so it is never stale
// while you work. If there is no list (e.g. plain `python -m http.server` on
// a copy without files.json), we read folder listings instead. If neither is
// available, we return null and the loader simply tries every manifest path.

export async function discoverAssets(folders) {
  return (await fileList()) ?? (await folderListings(folders));
}

async function fileList() {
  try {
    const res = await fetch('assets/files.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const list = await res.json();
    return Array.isArray(list) ? new Set(list) : null;
  } catch {
    return null;
  }
}

// Static servers such as `python -m http.server` return an HTML listing for a
// folder URL. We read the links from that listing.
async function folderListings(folders) {
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

  return anyListing ? found : null;
}
