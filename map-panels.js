/* ============================================================
   map-panels.js — Panneaux de carte déplaçables (drag & drop)
   ------------------------------------------------------------
   Rend déplaçables les panneaux flottants posés sur les cartes
   Leaflet (HUD, inspecteur, barre d'outils, recherche, légende…),
   pour que l'utilisateur les repositionne quand ils se chevauchent.

   - Poignée ⠿ discrète (haut-gauche du panneau), n'intercepte pas
     les clics du contenu.
   - Souris + tactile (Pointer Events).
   - Position mémorisée par page + panneau (localStorage).
   - Bouton « ⤢ Réorganiser » : réinitialise les positions de la page.
   - Contraint à la fenêtre (un panneau ne peut pas être perdu hors écran).

   Inclusion : <script src="map-panels.js"></script> (ou ../ selon la
   profondeur du fichier). Aucune configuration requise.
   ============================================================ */
(function () {
  "use strict";

  // Panneaux flottants ciblés (union de sélecteurs présents dans le projet).
  var SEL = [
    ".map-hud", "#mapHud", ".inspector", ".drawbar", ".dock",
    ".sim-panel", ".sim-bar", ".shbar", ".agri-stdbar", "#stdbar",
    ".gs-box", ".leaflet-control-layers"
  ].join(",");

  // Ne JAMAIS rendre déplaçables :
  var SKIP = [
    "agriHomeBar", "shxBtn", "shxModal", "mpResetBtn"
  ];
  function isSkipped(el) {
    if (!el || SKIP.indexOf(el.id) >= 0) return true;
    if (el.closest && el.closest(".leaflet-control-zoom, .leaflet-control-attribution")) return true;
    return false;
  }

  var KEY = "mp_pos::" + location.pathname + "::";
  function pget(k) { try { return JSON.parse(localStorage.getItem(KEY + k) || "null"); } catch (e) { return null; } }
  function pset(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) {} }
  function pdel(k) { try { localStorage.removeItem(KEY + k); } catch (e) {} }

  function panelKey(el, i) {
    if (el.id) return "id:" + el.id;
    var cls = (el.className && el.className.baseVal !== undefined) ? el.className.baseVal : (el.className || "");
    cls = String(cls).trim().split(/\s+/).slice(0, 2).join(".");
    return (cls || "el") + "#" + i;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Applique une position fixe (coordonnées écran) en restant dans la fenêtre.
  function place(el, left, top) {
    var w = el.offsetWidth || 120, h = el.offsetHeight || 40;
    left = clamp(left, 4, Math.max(4, window.innerWidth - w - 4));
    top = clamp(top, 4, Math.max(4, window.innerHeight - h - 4));
    el.style.position = "fixed";
    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
    el.style.margin = "0";
    el.style.transform = "none";
    return { left: left, top: top };
  }

  var idx = 0;
  function enhance(el) {
    if (!el || el.__mpDone || isSkipped(el)) return;
    // ignorer les éléments non visibles / trop grands (la carte elle-même)
    var r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 20) { return; } // pas encore rendu
    if (r.width > window.innerWidth * 0.92 && r.height > window.innerHeight * 0.92) return;
    el.__mpDone = true;
    var i = idx++;
    var key = panelKey(el, i);

    // poignée
    var grip = document.createElement("div");
    grip.className = "mp-grip";
    grip.title = "Déplacer ce panneau / Move panel";
    grip.setAttribute("aria-label", "Déplacer");
    grip.innerHTML = "⠿";
    if (getComputedStyle(el).position === "static") el.style.position = "absolute";
    el.appendChild(grip);
    el.classList.add("mp-draggable");

    // position mémorisée
    var saved = pget(key);
    if (saved && typeof saved.left === "number") place(el, saved.left, saved.top);

    var dragging = false, sx = 0, sy = 0, ol = 0, ot = 0;
    grip.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      var rect = el.getBoundingClientRect();
      // fige en fixed à sa position actuelle avant de bouger
      place(el, rect.left, rect.top);
      dragging = true; sx = e.clientX; sy = e.clientY; ol = rect.left; ot = rect.top;
      el.classList.add("mp-dragging");
      try { grip.setPointerCapture(e.pointerId); } catch (_) {}
    });
    grip.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      e.preventDefault();
      place(el, ol + (e.clientX - sx), ot + (e.clientY - sy));
    });
    function end(e) {
      if (!dragging) return;
      dragging = false; el.classList.remove("mp-dragging");
      var rect = el.getBoundingClientRect();
      pset(key, { left: Math.round(rect.left), top: Math.round(rect.top) });
      try { grip.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
  }

  function sweep() {
    var nodes = document.querySelectorAll(SEL);
    for (var i = 0; i < nodes.length; i++) enhance(nodes[i]);
  }

  // Bouton « Réorganiser » (réinitialise les positions de CETTE page).
  function addResetBtn() {
    if (document.getElementById("mpResetBtn")) return;
    var b = document.createElement("button");
    b.id = "mpResetBtn"; b.type = "button";
    b.textContent = "⤢ Réorganiser";
    b.title = "Réinitialiser la position des panneaux / Reset panels";
    b.onclick = function () {
      // purge toutes les clés mp_pos de la page puis recharge (retour au design d'origine)
      try {
        var rm = [];
        for (var k = 0; k < localStorage.length; k++) {
          var name = localStorage.key(k);
          if (name && name.indexOf(KEY) === 0) rm.push(name);
        }
        rm.forEach(function (n) { localStorage.removeItem(n); });
      } catch (e) {}
      location.reload();
    };
    document.body.appendChild(b);
  }

  // styles
  function addCSS() {
    if (document.getElementById("mpCSS")) return;
    var s = document.createElement("style");
    s.id = "mpCSS";
    s.textContent =
      ".mp-grip{position:absolute;top:2px;left:2px;width:20px;height:20px;line-height:18px;" +
      "text-align:center;font-size:15px;color:#3c5224;background:rgba(255,255,255,.82);" +
      "border:1px solid rgba(90,143,44,.55);border-radius:6px;cursor:grab;z-index:100000;" +
      "opacity:0;transition:opacity .15s;user-select:none;touch-action:none;box-shadow:0 1px 3px rgba(0,0,0,.2)}" +
      ".mp-draggable:hover>.mp-grip,.mp-grip:focus{opacity:1}" +
      ".mp-grip:active{cursor:grabbing}" +
      ".mp-dragging{opacity:.92;box-shadow:0 8px 26px rgba(0,0,0,.35)!important}" +
      "#mpResetBtn{position:fixed;right:12px;bottom:12px;z-index:2147481500;background:#5a8f2c;" +
      "color:#fff;border:0;border-radius:9px;padding:8px 12px;font:600 12px system-ui,'Segoe UI',sans-serif;" +
      "cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.25)}#mpResetBtn:hover{background:#4a7a24}" +
      "@media print{.mp-grip,#mpResetBtn{display:none!important}}";
    document.head.appendChild(s);
  }

  function boot() {
    addCSS();
    sweep();
    addResetBtn();
    // les contrôles Leaflet (recherche, barre d'outils) sont ajoutés APRÈS le
    // chargement : on rebalaie quelques fois + observe le DOM.
    [300, 900, 2000, 4000].forEach(function (d) { setTimeout(sweep, d); });
    try {
      var mo = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var a = muts[i].addedNodes;
          for (var j = 0; j < a.length; j++) {
            var n = a[j];
            if (n.nodeType !== 1) continue;
            if (n.matches && n.matches(SEL)) enhance(n);
            if (n.querySelectorAll) { var q = n.querySelectorAll(SEL); for (var k = 0; k < q.length; k++) enhance(q[k]); }
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 8000);
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
