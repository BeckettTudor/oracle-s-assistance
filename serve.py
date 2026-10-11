"""Serve the game locally: python serve.py [port]   (default port 8123)

The same as `python -m http.server`, except it tells the browser not to
reuse old copies of files. Plain http.server sends no cache headers, so
after the code changes a browser can mix old and new script files and the
game fails to start.
"""

import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
ROOT = os.path.dirname(os.path.abspath(__file__))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
    }

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
