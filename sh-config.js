/* ============================================================
   sh-config.js — Magasin d'identifiants Sentinel Hub PARTAGÉ
   ------------------------------------------------------------
   But : l'utilisateur saisit son Client ID + Client Secret UNE
   SEULE FOIS ; ils sont valables sur TOUS les écrans qui appellent
   l'API Sentinel Hub (localStorage partagé par origine).

   - Mode par défaut : Direct OAuth Keys (fonctionne dans le
     navigateur — l'endpoint OAuth renvoie les en-têtes CORS).
   - Ne dépend d'aucun proxy PHP/serveur pour fonctionner en ligne
     (GitHub Pages, Render, fichier local). Proxy = repli optionnel.
   - Aucun secret n'est écrit dans le code : tout vit dans le
     navigateur de l'utilisateur (localStorage).

   Clés localStorage standard (identiques sur toutes les pages) :
     sh_auth_mode      : 'direct_keys' | 'direct_token' | 'proxy'
     sh_client_id      : Client ID Sentinel Hub
     sh_client_secret  : Client Secret Sentinel Hub
     sh_direct_token   : jeton Bearer collé manuellement (optionnel)
     sh_proxy_url      : URL du proxy de repli (sh_token.php ou /api/sh_token)

   API exposée :
     window.SHConfig.getToken()   -> Promise<access_token>
     window.SHConfig.reset()      -> invalide le token en cache
     window.SHConfig.creds()      -> config courante
     window.SHConfig.isReady()    -> bool (identifiants présents ?)
     window.SHConfig.openModal()  -> ouvre la modale de saisie
   ============================================================ */
(function () {
  "use strict";

  var LS = {
    mode: "sh_auth_mode",
    proxy: "sh_proxy_url",
    cid: "sh_client_id",
    csec: "sh_client_secret",
    token: "sh_direct_token"
  };
  var OAUTH = "https://services.sentinel-hub.com/oauth/token";

  function lget(k, d) { try { var v = localStorage.getItem(k); return (v === null || v === "") ? d : v; } catch (e) { return d; } }
  function lset(k, v) { try { localStorage.setItem(k, v == null ? "" : v); } catch (e) {} }

  /* Import unique depuis le portail plateforme (blob JSON "agri_creds")
     vers les clés plates, si celles-ci sont vides. Rend la saisie du
     portail valable aussi pour les pages carto autonomes. */
  (function importFromPortal() {
    try {
      if (lget(LS.cid, "")) return;
      var raw = localStorage.getItem("agri_creds");
      if (!raw) return;
      var c = JSON.parse(raw);
      if (c && c.sh_client_id) {
        lset(LS.cid, c.sh_client_id);
        if (c.sh_client_secret) lset(LS.csec, c.sh_client_secret);
        lset(LS.mode, "direct_keys");
      }
    } catch (e) {}
  })();

  function creds() {
    return {
      mode: lget(LS.mode, "direct_keys"),
      proxy: lget(LS.proxy, "/api/sh_token"),
      cid: lget(LS.cid, ""),
      csec: lget(LS.csec, ""),
      token: lget(LS.token, "")
    };
  }

  var _tok = null, _exp = 0;
  function reset() { _tok = null; _exp = 0; }
  function isReady() { var c = creds(); return !!((c.cid && c.csec) || c.token); }

  async function getToken() {
    if (_tok && Date.now() < _exp - 60000) return _tok;
    var c = creds();
    var errors = [];

    // 1) Jeton Bearer collé manuellement
    if (c.mode === "direct_token" && c.token) {
      _tok = c.token.trim(); _exp = Date.now() + 3600000; return _tok;
    }

    // 2) Proxy CÔTÉ SERVEUR (OAuth fait par le serveur → aucun blocage CORS).
    //    On essaie plusieurs points d'entrée : le proxy configuré, celui de la
    //    plateforme Flask (/api/sh_token), puis le proxy PHP (sh_token.php).
    //    Le Client ID/Secret saisis sont transmis en paramètres (HTTPS).
    if (c.cid && c.csec) {
      var candidates = [];
      if (c.proxy) candidates.push(c.proxy);
      ["/api/sh_token", "sh_token.php"].forEach(function (p) { if (candidates.indexOf(p) < 0) candidates.push(p); });
      for (var i = 0; i < candidates.length; i++) {
        var url = candidates[i];
        var sep = url.indexOf("?") >= 0 ? "&" : "?";
        url += sep + "client_id=" + encodeURIComponent(c.cid) + "&client_secret=" + encodeURIComponent(c.csec);
        try {
          var rp = await fetch(url, { cache: "no-store" });
          if (!rp.ok) { errors.push("proxy " + candidates[i] + " → HTTP " + rp.status); continue; }
          var jp = await rp.json(); // peut jeter si la réponse n'est pas du JSON
          if (jp && jp.access_token) { _tok = jp.access_token; _exp = Date.now() + (jp.expires_in || 3500) * 1000; return _tok; }
          errors.push("proxy " + candidates[i] + " → " + ((jp && (jp.error || jp.detail)) || "réponse sans token"));
        } catch (e) { errors.push("proxy " + candidates[i] + " injoignable"); }
      }
    }

    // 3) OAuth DIRECT navigateur — dernier recours (souvent bloqué par CORS en
    //    production, mais utile en local ou si un proxy CORS est en place).
    if (c.cid && c.csec) {
      try {
        var body = new URLSearchParams({ grant_type: "client_credentials", client_id: c.cid, client_secret: c.csec });
        var r = await fetch(OAUTH, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body });
        if (r.ok) {
          var j = await r.json();
          if (j && j.access_token) { _tok = j.access_token; _exp = Date.now() + (j.expires_in || 3500) * 1000; return _tok; }
          errors.push("OAuth navigateur → réponse sans token");
        } else {
          errors.push("OAuth navigateur → HTTP " + r.status + (r.status === 401 ? " (clés invalides ?)" : ""));
        }
      } catch (e) { errors.push("OAuth navigateur bloqué (CORS/réseau)"); }
    }

    if (!c.cid && !c.csec && !c.token) throw new Error("Aucun identifiant Sentinel Hub configuré — cliquez ⚙️ et saisissez Client ID + Secret.");
    throw new Error("Impossible d'obtenir un jeton Sentinel Hub. " + errors.join(" · "));
  }

  /* ---------- Modale de saisie (injectée seulement si la page
                n'a pas déjà son propre bouton #btnConfig) ---------- */
  function injectModal() {
    if (document.getElementById("shxModal")) return;
    var css = document.createElement("style");
    css.textContent =
      "#shxModal{position:fixed;inset:0;z-index:2147482000;background:rgba(20,30,15,.55);display:none;align-items:center;justify-content:center;padding:16px}" +
      "#shxModal.on{display:flex}" +
      "#shxModal .bx{background:#fff;color:#243018;border-radius:14px;max-width:440px;width:100%;padding:22px 22px 18px;box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:system-ui,'Segoe UI',sans-serif}" +
      "#shxModal h3{margin:0 0 14px;font-size:1.05rem}" +
      "#shxModal label{display:block;font-size:.78rem;font-weight:700;margin:10px 0 4px;color:#3c5224}" +
      "#shxModal select,#shxModal input{width:100%;padding:9px 10px;border:1px solid #cfe0bd;border-radius:8px;font-size:.9rem;box-sizing:border-box}" +
      "#shxModal .row{display:none}#shxModal .row.on{display:block}" +
      "#shxModal .st{font-size:12px;margin-top:10px;min-height:16px}" +
      "#shxModal .ac{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}" +
      "#shxModal button{border:0;border-radius:8px;padding:9px 14px;font-weight:700;cursor:pointer;font-size:.85rem}" +
      "#shxModal .g{background:#7cb342;color:#fff}#shxModal .s{background:#eef3e6;color:#3c5224}" +
      "#shxBtn{position:fixed;left:12px;bottom:12px;z-index:2147481000;background:#5a8f2c;color:#fff;border:0;border-radius:9px;padding:9px 12px;font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.25);font-family:system-ui,sans-serif;font-size:.82rem}";
    document.head.appendChild(css);

    var m = document.createElement("div");
    m.id = "shxModal";
    m.innerHTML =
      '<div class="bx">' +
      '<h3>⚙️ Sentinel Hub API Configuration</h3>' +
      '<label>Mode</label>' +
      '<select id="shxMode">' +
      '<option value="direct_keys">Direct OAuth Keys (Client ID + Secret)</option>' +
      '<option value="direct_token">Direct Bearer Token</option>' +
      '<option value="proxy">Local/Server Proxy</option>' +
      "</select>" +
      '<div class="row" id="shxRowKeys">' +
      '<label>Client ID</label><input type="text" id="shxCid" placeholder="Votre Sentinel Hub Client ID">' +
      '<label>Client Secret</label><input type="password" id="shxCsec" placeholder="Votre Sentinel Hub Client Secret">' +
      "</div>" +
      '<div class="row" id="shxRowToken"><label>Access Token</label><input type="text" id="shxTok" placeholder="Jeton Bearer"></div>' +
      '<div class="row" id="shxRowProxy"><label>Proxy URL</label><input type="text" id="shxProxy" placeholder="sh_token.php"></div>' +
      '<div class="st" id="shxStatus"></div>' +
      '<div class="ac">' +
      '<button class="s" id="shxTest">🔌 Test Connection</button>' +
      '<button class="s" id="shxClose">Close</button>' +
      '<button class="g" id="shxSave">Save</button>' +
      "</div></div>";
    document.body.appendChild(m);

    var btn = document.createElement("button");
    btn.id = "shxBtn"; btn.type = "button"; btn.textContent = "⚙️ Clés Sentinel";
    document.body.appendChild(btn);

    var sel = document.getElementById("shxMode");
    function vis() {
      document.getElementById("shxRowKeys").classList.toggle("on", sel.value === "direct_keys");
      document.getElementById("shxRowToken").classList.toggle("on", sel.value === "direct_token");
      document.getElementById("shxRowProxy").classList.toggle("on", sel.value === "proxy");
    }
    sel.onchange = vis;

    function fill() {
      var c = creds();
      sel.value = c.mode;
      document.getElementById("shxCid").value = c.cid;
      document.getElementById("shxCsec").value = c.csec;
      document.getElementById("shxTok").value = c.token;
      document.getElementById("shxProxy").value = c.proxy;
      document.getElementById("shxStatus").textContent = "";
      vis();
    }
    function persist() {
      lset(LS.mode, sel.value);
      lset(LS.cid, document.getElementById("shxCid").value.trim());
      lset(LS.csec, document.getElementById("shxCsec").value.trim());
      lset(LS.token, document.getElementById("shxTok").value.trim());
      lset(LS.proxy, document.getElementById("shxProxy").value.trim() || "sh_token.php");
      reset();
    }
    btn.onclick = function () { fill(); m.classList.add("on"); };
    document.getElementById("shxClose").onclick = function () { m.classList.remove("on"); };
    document.getElementById("shxSave").onclick = function () {
      persist();
      var s = document.getElementById("shxStatus");
      s.style.color = "#5a8f2c"; s.textContent = "✓ Identifiants enregistrés (valables sur toutes les pages).";
      setTimeout(function () { m.classList.remove("on"); }, 800);
    };
    document.getElementById("shxTest").onclick = async function () {
      persist();
      var s = document.getElementById("shxStatus");
      s.style.color = "#8a6d1f"; s.textContent = "Test en cours…";
      try { var tk = await getToken(); s.style.color = "#5a8f2c"; s.textContent = "✓ Succès — jeton reçu (" + tk.slice(0, 14) + "…)"; }
      catch (err) { s.style.color = "#c0392b"; s.textContent = "✗ Échec : " + err.message; }
    };
    m.addEventListener("click", function (e) { if (e.target === m) m.classList.remove("on"); });

    window.SHConfig.openModal = function () { fill(); m.classList.add("on"); };
  }

  window.SHConfig = { getToken: getToken, reset: reset, creds: creds, isReady: isReady, openModal: function () {} };

  /* La page a-t-elle déjà son propre bouton de config ? Si oui, on ne
     duplique pas l'UI — on fournit seulement getToken(). Sinon on injecte
     bouton + modale pour permettre la saisie centralisée ici aussi. */
  function boot() {
    if (!document.getElementById("btnConfig")) injectModal();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
