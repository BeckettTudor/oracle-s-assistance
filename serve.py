"""Serve the game locally: python serve.py [port]   (default port 8123)

The same as `python -m http.server`, except it tells the browser not to
reuse old copies of files. Plain http.server sends no cache headers, so
after the code changes a browser can mix old and new script files and the
game fails to start.
"""

import functools
import http.server
import json
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from list_assets import asset_files  # noqa: E402


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
    }

    # The list of asset files is built from disk on every request, so newly
    # added art is picked up without re-running tools/list_assets.py.
    def do_GET(self):
        if self.path.split('?')[0] == '/assets/files.json':
            body = json.dumps(asset_files(ROOT)).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the terminal quiet


if __name__ == '__main__':
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(('', PORT), handler) as server:
        print(f"Oracle's Assistance is running at http://localhost:{PORT}/")
        print('Press Ctrl+C to stop.')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
