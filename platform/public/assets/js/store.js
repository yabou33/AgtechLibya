/* =====================================================================
   AgriTech Libya — Couche de données double-mode
   - Mode SERVEUR : /api/* (Flask + SQLite)  (si /api/ping répond)
   - Mode LOCAL   : localStorage        (GitHub Pages, file://, hors-ligne)
   Détection automatique au chargement.  Même API pour les deux.
   ===================================================================== */
(function (global) {
  const API = "/api/";
  let serverMode = false;
  let user = null;

  async function detect(){
    try {
      const r = await fetch(API + "ping", { cache:"no-store" });
      serverMode = r.ok && (await r.json()).ok === true;
    } catch (e) { serverMode = false; }
    // Session en mode serveur
    if (serverMode) {
      try { const s = await fetch(API + "me"); if (s.ok) user = (await s.json()).user || null; } catch(e){}
    } else {
      try { user = JSON.parse(localStorage.getItem("agri_user")||"null"); } catch(e){}
    }
    return { serverMode, user };
  }

  // ---- Projets (format agrimanager-irrigation) ----
  const LKEY = "agri_projects";
  function localAll(){ try { return JSON.parse(localStorage.getItem(LKEY)||"[]"); } catch(e){ return []; } }
  function localWrite(a){ localStorage.setItem(LKEY, JSON.stringify(a)); }

  async function listProjects(){
    if (serverMode){ const r = await fetch(API+"projects"); return r.ok ? (await r.json()).projects : []; }
    return localAll();
  }
  async function saveProject(p){
    p.updatedAt = new Date().toISOString();
    if (serverMode){
      const r = await fetch(API+"projects", { method:"POST",
        headers:{ "Content-Type":"application/json" }, body: JSON.stringify(p) });
      return r.ok ? (await r.json()) : { ok:false };
    }
    const a = localAll(); const i = a.findIndex(x => x.id === p.id);
    if (!p.id) p.id = "loc-" + Date.now();
    if (i>=0) a[i] = p; else a.push(p);
    localWrite(a); return { ok:true, id:p.id, mode:"local" };
  }
  async function getProject(id){
    if (serverMode){ const r = await fetch(API+"projects?id="+encodeURIComponent(id)); return r.ok ? (await r.json()).project : null; }
    return localAll().find(x => x.id === id) || null;
  }
  async function deleteProject(id){
    if (serverMode){ await fetch(API+"projects?id="+encodeURIComponent(id), { method:"DELETE" }); return; }
    localWrite(localAll().filter(x => x.id !== id));
  }

  // ---- Auth ----
  async function loginGuest(role){
    user = { id:"guest", full_name:"Invité", role: role||"agriculteur", mode:"local" };
    localStorage.setItem("agri_user", JSON.stringify(user)); return user;
  }
  async function login(email, pass){
    if (!serverMode) throw new Error("Login serveur indisponible en mode local.");
    const r = await fetch(API+"login", { method:"POST",
      headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email, pass }) });
    if (!r.ok) throw new Error("Identifiants invalides");
    user = (await r.json()).user; return user;
  }
  async function logout(){
    if (serverMode) { try { await fetch(API+"logout", { method:"POST" }); } catch(e){} }
    user = null; localStorage.removeItem("agri_user");
  }

  // ---- Fichiers (import / export universel) ----
  function download(name, content, mime){
    const blob = new Blob([content], { type: mime || "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  }
  function pickFile(accept, cb){
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = accept || ".json,.geojson,.csv";
    inp.onchange = e => { const f = e.target.files[0]; if(!f) return;
      const rd = new FileReader(); rd.onload = () => cb(rd.result, f.name); rd.readAsText(f); };
    inp.click();
  }

  global.Store = {
    detect, get serverMode(){ return serverMode; }, get user(){ return user; },
    listProjects, saveProject, getProject, deleteProject,
    login, loginGuest, logout, download, pickFile
  };
})(window);
