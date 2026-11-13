#!/usr/bin/env python3
"""Prosty serwer przekaźnikowy dla gier (LAN/internet). Uruchom na jednym komputerze:
    python3 relay.py [port]
Domyślny port: 8766. Klienci łączą się z http://IP:PORT.
"""
import http.server, json, threading, time, urllib.parse, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
rooms = {}  # code -> {"messages": [(seq,msg)], "seq": int, "players": [clientIds], "lock": Lock}
lock = threading.Lock()

def get_room(code):
    with lock:
        if code not in rooms:
            rooms[code] = {"messages": [], "seq": 0, "players": [], "lock": threading.Lock()}
        return rooms[code]

class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if parsed.path == "/":
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"relay ok")
            return
        if parsed.path == "/poll":
            room = qs.get("room", [""])[0]
            since = int(qs.get("since", ["0"])[0])
            r = get_room(room)
            with r["lock"]:
                msgs = [m for m in r["messages"] if m[0] > since]
            out = {"messages": [{"seq": s, "msg": m} for s, m in msgs]}
            body = json.dumps(out).encode()
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self._cors()
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            msg = json.loads(raw.decode())
        except Exception:
            msg = {}
        if parsed.path == "/send":
            room = qs.get("room", [""])[0]
            r = get_room(room)
            # player assignment on join
            if msg.get("type") == "join":
                cid = msg.get("from")
                with r["lock"]:
                    if cid not in r["players"]:
                        r["players"].append(cid)
                    idx = r["players"].index(cid)
                    color = "w" if idx == 0 else "b"
                # broadcast role to all (clients filter by clientId)
                role_msg = {"type": "role", "clientId": cid, "color": color}
                with r["lock"]:
                    r["seq"] += 1
                    r["messages"].append((r["seq"], role_msg))
                    # keep last 200
                    if len(r["messages"]) > 200:
                        r["messages"] = r["messages"][-200:]
            else:
                with r["lock"]:
                    r["seq"] += 1
                    r["messages"].append((r["seq"], msg))
                    if len(r["messages"]) > 200:
                        r["messages"] = r["messages"][-200:]
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        self.send_response(404)
        self._cors()
        self.end_headers()

    def log_message(self, *args):
        pass

if __name__ == "__main__":
    httpd = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Relay server listening on 0.0.0.0:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Stopped")
