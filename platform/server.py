#!/usr/bin/env python3
# =====================================================================
#  AgriTech Libya — Serveur Flask (backend mode serveur)
#  Sert le frontend + API JSON + proxy Sentinel Hub par utilisateur.
#  Lancer :  pip install flask requests
#            python server.py         ->  http://localhost:8000
#  La base SQLite et le compte admin sont créés automatiquement au 1er lancement.
# =====================================================================
import os, sqlite3, json, urllib.request, urllib.parse, ssl
from flask import Flask, request, session, jsonify, send_from_directory, redirect
from werkzeug.security import generate_password_hash, check_password_hash

BASE   = os.path.dirname(os.path.abspath(__file__))       # .../platform
REPO   = os.path.dirname(BASE)                            # .../AgTechLybia
PUBLIC = os.path.join(BASE, "public")
DB     = os.path.join(BASE, "db", "agritech.db")
SCHEMA = os.path.join(BASE, "db", "schema.sql")
ADMIN_EMAIL = "admin@agritech.ly"
ADMIN_PASS  = "ChangeMe!2026"                              # à changer !

# Le frontend et les apps existantes vivent sous REPO ; on sert tout REPO en statique.
app = Flask(__name__, static_folder=REPO, static_url_path="")
app.secret_key = os.environ.get("AGRI_SECRET", "dev-secret-change-me")


# ------------------------------- DB --------------------------------
def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con

def init_db():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    fresh = not os.path.exists(DB)
    con = db()
    if fresh:
        with open(SCHEMA, encoding="utf-8") as f:
            con.executescript(f.read())
        print("- Base creee depuis schema.sql")
    # Toujours garantir un admin avec un hash werkzeug valide
    row = con.execute("SELECT id, password_hash FROM users WHERE email=?", (ADMIN_EMAIL,)).fetchone()
    h = generate_password_hash(ADMIN_PASS)
    if row is None:
        con.execute("INSERT INTO users(email,password_hash,full_name,role,lang,organisation) "
                    "VALUES(?,?,?,?,?,?)", (ADMIN_EMAIL, h, "Administrateur", "admin", "fr", "EU4Skills"))
        print(f"- Admin cree : {ADMIN_EMAIL} / {ADMIN_PASS}")
    elif not (row["password_hash"] or "").startswith(("pbkdf2:", "scrypt:")):
        # remplace le hash-placeholder du schéma par un hash werkzeug
        con.execute("UPDATE users SET password_hash=? WHERE id=?", (h, row["id"]))
        print(f"- Admin pret : {ADMIN_EMAIL} / {ADMIN_PASS}  (changez le mot de passe)")
    con.commit(); con.close()


def me():
    if not session.get("uid"):
        return None
    con = db()
    u = con.execute("SELECT id,email,full_name,role,lang,organisation FROM users WHERE id=? AND active=1",
                    (session["uid"],)).fetchone()
    con.close()
    return dict(u) if u else None

def need_user():
    u = me()
    if not u:
        return None
    return u


# ----------------------------- Routes ------------------------------
@app.route("/")
def home():
    return redirect("/platform/public/index.html")

@app.route("/api/ping")
def ping():
    return jsonify(ok=True, server="flask", db=os.path.exists(DB))

@app.route("/api/me")
def api_me():
    return jsonify(ok=True, user=me())

@app.route("/api/login", methods=["POST"])
def login():
    b = request.get_json(force=True, silent=True) or {}
    con = db()
    u = con.execute("SELECT * FROM users WHERE email=? AND active=1", (b.get("email","").strip(),)).fetchone()
    if not u or not check_password_hash(u["password_hash"], b.get("pass","")):
        con.close(); return jsonify(ok=False, error="Identifiants invalides"), 401
    session["uid"] = u["id"]
    con.execute("UPDATE users SET last_login=datetime('now') WHERE id=?", (u["id"],))
    con.execute("INSERT INTO audit_log(user_id,action) VALUES(?,?)", (u["id"], "login"))
    con.commit(); con.close()
    return jsonify(ok=True, user={k: u[k] for k in ("id","email","full_name","role","lang","organisation")})

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear(); return jsonify(ok=True)

@app.route("/api/projects", methods=["GET","POST","DELETE"])
def projects():
    u = need_user()
    if not u: return jsonify(ok=False, error="Non connecté"), 401
    con = db()
    if request.method == "GET":
        pid = request.args.get("id")
        if pid:
            p = con.execute("SELECT * FROM projects WHERE id=? AND (owner_id=? OR visibility!='private')",
                            (pid, u["id"])).fetchone()
            con.close()
            if not p: return jsonify(ok=False), 404
            d = dict(p); d["data"] = json.loads(d.get("data_json") or "{}")
            return jsonify(ok=True, project=d)
        rows = con.execute("SELECT id,name,module_code,center_lat,center_lng,zoom,visibility,updated_at "
                           "FROM projects WHERE owner_id=? OR visibility='public' ORDER BY updated_at DESC",
                           (u["id"],)).fetchall()
        con.close(); return jsonify(ok=True, projects=[dict(r) for r in rows])
    if request.method == "POST":
        b = request.get_json(force=True, silent=True) or {}
        data = json.dumps(b, ensure_ascii=False)
        c = b.get("center", [None, None])
        if str(b.get("id","")).isdigit():
            con.execute("UPDATE projects SET name=?,data_json=?,center_lat=?,center_lng=?,zoom=?,"
                        "updated_at=datetime('now') WHERE id=? AND owner_id=?",
                        (b.get("name","Projet"), data, c[0], c[1], b.get("zoom"), b["id"], u["id"]))
            con.commit(); pid = b["id"]
        else:
            cur = con.execute("INSERT INTO projects(owner_id,module_code,name,center_lat,center_lng,zoom,data_json) "
                              "VALUES(?,?,?,?,?,?,?)",
                              (u["id"], b.get("module_code"), b.get("name","Projet"), c[0], c[1], b.get("zoom"), data))
            con.commit(); pid = cur.lastrowid
        con.close(); return jsonify(ok=True, id=pid)
    # DELETE
    con.execute("DELETE FROM projects WHERE id=? AND owner_id=?", (request.args.get("id"), u["id"]))
    con.commit(); con.close(); return jsonify(ok=True)

@app.route("/api/credentials", methods=["GET","POST"])
def credentials():
    u = need_user()
    if not u: return jsonify(ok=False, error="Non connecté"), 401
    con = db()
    if request.method == "GET":
        r = con.execute("SELECT sh_client_id, sh_instance_id, weather_provider, "
                        "(sh_client_secret IS NOT NULL AND sh_client_secret!='') AS has_secret, "
                        "(weather_api_key IS NOT NULL AND weather_api_key!='') AS has_wxkey "
                        "FROM user_credentials WHERE user_id=?", (u["id"],)).fetchone()
        con.close(); return jsonify(ok=True, credentials=dict(r) if r else {})
    b = request.get_json(force=True, silent=True) or {}
    con.execute("""INSERT INTO user_credentials(user_id,sh_client_id,sh_client_secret,sh_instance_id,
                   weather_provider,weather_api_key,updated_at)
                   VALUES(:u,:id,:sec,:inst,:prov,:key,datetime('now'))
                   ON CONFLICT(user_id) DO UPDATE SET
                     sh_client_id=:id, sh_instance_id=:inst, weather_provider=:prov,
                     sh_client_secret=CASE WHEN :sec!='' THEN :sec ELSE sh_client_secret END,
                     weather_api_key =CASE WHEN :key!='' THEN :key ELSE weather_api_key  END,
                     updated_at=datetime('now')""",
                {"u": u["id"], "id": b.get("sh_client_id",""), "sec": b.get("sh_client_secret",""),
                 "inst": b.get("sh_instance_id",""), "prov": b.get("weather_provider","open-meteo"),
                 "key": b.get("weather_api_key","")})
    con.commit(); con.close(); return jsonify(ok=True)

@app.route("/api/sh_token")
def sh_token():
    """Proxy OAuth Sentinel Hub par utilisateur — ne renvoie qu'un access_token temporaire."""
    u = need_user()
    if not u: return jsonify(ok=False, error="Non connecté"), 401
    con = db()
    c = con.execute("SELECT sh_client_id, sh_client_secret FROM user_credentials WHERE user_id=?",
                    (u["id"],)).fetchone()
    con.close()
    if not c or not c["sh_client_id"] or not c["sh_client_secret"]:
        return jsonify(ok=False, error="Identifiants Sentinel Hub absents (profil)."), 400
    data = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": c["sh_client_id"],
        "client_secret": c["sh_client_secret"],
    }).encode()
    try:
        ctx = ssl.create_default_context()
        req = urllib.request.Request("https://services.sentinel-hub.com/oauth/token", data=data)
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            return app.response_class(resp.read(), mimetype="application/json")
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 502


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 8000))
    print(f"AgriTech Libya running -> http://localhost:{port}")
    app.run(host="0.0.0.0", port=port,
            debug=os.environ.get("AGRI_DEBUG") == "1", use_reloader=False)
