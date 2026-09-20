# Servidor de desenvolvimento sem cache. Uso: python server.py [porta]
import http.server, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
print('Ilha em http://localhost:%d' % port)
http.server.ThreadingHTTPServer(('', port), H).serve_forever()
