/* =====================================================================
   AgriTech Libya — Base de cultures partagée (FAO-56), Tunisie & Libye
   Standard plateforme : toute page avec « choix de culture » lit CROPS_DB.

   Chaque entrée :
     id      identifiant stable
     fr/en/ar nom trilingue
     g       groupe (key: cereal|legume|veget|fruit|indus|forage)
     L       [init, dev, mid, late] durées de stades (jours) — FAO-56
     Kc      [ini, mid, end] coefficients culturaux — FAO-56
     Zr      profondeur racinaire max (m)
     p       fraction d'épuisement admissible (MAD)

   Accès : window.CROPS_DB (array), CROPS_GROUPS (labels trilingues),
           CROPS.byId(id), CROPS.kcMid(id) (Kc mi-saison), CROPS.cycle(id).
   Valeurs indicatives d'après FAO-56 (Allen et al., Tables 11 & 22),
   adaptées au contexte méditerranéen aride (Tunisie/Libye).
   ===================================================================== */
(function (global) {
  const G = {
    cereal:{fr:"Céréales",en:"Cereals",ar:"الحبوب"},
    legume:{fr:"Légumineuses",en:"Legumes",ar:"البقوليات"},
    veget:{fr:"Maraîchage / légumes",en:"Vegetables",ar:"الخضروات"},
    fruit:{fr:"Arboriculture / pérennes",en:"Fruit / perennial",ar:"الأشجار والدائمة"},
    indus:{fr:"Cultures industrielles",en:"Industrial crops",ar:"محاصيل صناعية"},
    forage:{fr:"Fourrages",en:"Forage",ar:"الأعلاف"}
  };

  const DB = [
    // ---- Céréales ----
    {id:'durum',  g:'cereal', fr:"Blé dur",           en:"Durum wheat",     ar:"قمح صلب",       L:[20,50,60,30], Kc:[0.40,1.15,0.35], Zr:1.5, p:0.55},
    {id:'wheat',  g:'cereal', fr:"Blé tendre",        en:"Bread wheat",     ar:"قمح طري",       L:[30,40,50,30], Kc:[0.40,1.15,0.40], Zr:1.5, p:0.55},
    {id:'barley', g:'cereal', fr:"Orge",              en:"Barley",          ar:"شعير",          L:[20,35,45,25], Kc:[0.35,1.15,0.25], Zr:1.3, p:0.55},
    {id:'maize',  g:'cereal', fr:"Maïs (grain)",      en:"Maize (grain)",   ar:"ذرة (حبوب)",    L:[25,40,45,30], Kc:[0.30,1.20,0.60], Zr:1.2, p:0.55},
    {id:'sweetcorn',g:'cereal',fr:"Maïs doux",        en:"Sweet corn",      ar:"ذرة سكرية",     L:[20,25,25,10], Kc:[0.30,1.15,1.05], Zr:0.9, p:0.50},
    {id:'sorghum',g:'cereal', fr:"Sorgho",            en:"Sorghum",         ar:"ذرة رفيعة",     L:[20,35,40,30], Kc:[0.30,1.05,0.55], Zr:1.5, p:0.55},
    {id:'oat',    g:'cereal', fr:"Avoine",            en:"Oat",             ar:"شوفان",         L:[20,40,45,25], Kc:[0.35,1.15,0.40], Zr:1.3, p:0.55},

    // ---- Légumineuses ----
    {id:'faba',   g:'legume', fr:"Fève",              en:"Faba bean",       ar:"فول",           L:[20,30,35,15], Kc:[0.50,1.15,0.50], Zr:0.7, p:0.45},
    {id:'chickpea',g:'legume',fr:"Pois chiche",       en:"Chickpea",        ar:"حمّص",          L:[20,30,40,20], Kc:[0.40,1.00,0.35], Zr:0.8, p:0.50},
    {id:'lentil', g:'legume', fr:"Lentille",          en:"Lentil",          ar:"عدس",           L:[20,30,40,20], Kc:[0.40,1.10,0.30], Zr:0.8, p:0.50},
    {id:'greenbean',g:'legume',fr:"Haricot vert",     en:"Green bean",      ar:"فاصوليا خضراء", L:[20,30,30,10], Kc:[0.50,1.05,0.90], Zr:0.7, p:0.45},
    {id:'pea',    g:'legume', fr:"Petit pois",        en:"Pea",             ar:"بازلاء",        L:[20,30,35,15], Kc:[0.50,1.15,1.10], Zr:0.8, p:0.40},

    // ---- Maraîchage / légumes ----
    {id:'tomato', g:'veget',  fr:"Tomate",            en:"Tomato",          ar:"طماطم",         L:[30,40,45,30], Kc:[0.60,1.15,0.80], Zr:1.0, p:0.40},
    {id:'potato', g:'veget',  fr:"Pomme de terre",    en:"Potato",          ar:"بطاطا",         L:[25,30,45,30], Kc:[0.50,1.15,0.75], Zr:0.6, p:0.35},
    {id:'onion',  g:'veget',  fr:"Oignon (sec)",      en:"Onion (dry)",     ar:"بصل (جاف)",     L:[15,25,70,40], Kc:[0.70,1.05,0.75], Zr:0.4, p:0.30},
    {id:'garlic', g:'veget',  fr:"Ail",               en:"Garlic",          ar:"ثوم",           L:[20,30,40,20], Kc:[0.70,1.00,0.70], Zr:0.4, p:0.30},
    {id:'pepper', g:'veget',  fr:"Piment / Poivron",  en:"Pepper",          ar:"فلفل",          L:[30,35,40,20], Kc:[0.60,1.05,0.90], Zr:0.6, p:0.30},
    {id:'eggplant',g:'veget', fr:"Aubergine",         en:"Eggplant",        ar:"باذنجان",       L:[30,40,40,20], Kc:[0.60,1.05,0.90], Zr:0.7, p:0.45},
    {id:'zucchini',g:'veget', fr:"Courgette",         en:"Zucchini",        ar:"كوسة",          L:[25,35,25,15], Kc:[0.50,0.95,0.75], Zr:0.6, p:0.50},
    {id:'cucumber',g:'veget', fr:"Concombre",         en:"Cucumber",        ar:"خيار",          L:[20,30,40,15], Kc:[0.60,1.00,0.75], Zr:0.7, p:0.50},
    {id:'watermelon',g:'veget',fr:"Pastèque",         en:"Watermelon",      ar:"بطيخ",          L:[20,30,30,30], Kc:[0.40,1.00,0.75], Zr:0.8, p:0.40},
    {id:'melon',  g:'veget',  fr:"Melon",             en:"Melon",           ar:"شمّام",         L:[25,35,40,20], Kc:[0.50,1.05,0.75], Zr:0.8, p:0.40},
    {id:'carrot', g:'veget',  fr:"Carotte",           en:"Carrot",          ar:"جزر",           L:[20,30,50,20], Kc:[0.70,1.05,0.95], Zr:0.5, p:0.35},
    {id:'cabbage',g:'veget',  fr:"Chou",              en:"Cabbage",         ar:"ملفوف",         L:[40,60,50,15], Kc:[0.70,1.05,0.95], Zr:0.5, p:0.45},
    {id:'lettuce',g:'veget',  fr:"Laitue",            en:"Lettuce",         ar:"خس",            L:[20,30,15,10], Kc:[0.70,1.00,0.95], Zr:0.3, p:0.30},
    {id:'artichoke',g:'veget',fr:"Artichaut",         en:"Artichoke",       ar:"خرشوف",         L:[40,40,220,30], Kc:[0.50,1.00,0.95], Zr:0.7, p:0.45},
    {id:'okra',   g:'veget',  fr:"Gombo",             en:"Okra",            ar:"بامية",         L:[25,35,40,20], Kc:[0.50,1.05,0.75], Zr:0.6, p:0.45},

    // ---- Arboriculture / pérennes ----
    {id:'olive',  g:'fruit',  fr:"Olivier",           en:"Olive",           ar:"زيتون",         L:[30,90,60,90], Kc:[0.65,0.70,0.70], Zr:1.5, p:0.65},
    {id:'date',   g:'fruit',  fr:"Palmier-dattier",   en:"Date palm",       ar:"نخيل التمر",    L:[40,60,120,40], Kc:[0.90,0.95,0.95], Zr:1.5, p:0.50},
    {id:'citrus', g:'fruit',  fr:"Agrumes / Oranger", en:"Citrus / Orange", ar:"حمضيات / برتقال",L:[60,90,120,95], Kc:[0.70,0.65,0.70], Zr:1.2, p:0.50},
    {id:'lemon',  g:'fruit',  fr:"Citronnier",        en:"Lemon",           ar:"ليمون",         L:[60,90,120,95], Kc:[0.70,0.65,0.70], Zr:1.2, p:0.50},
    {id:'almond', g:'fruit',  fr:"Amandier",          en:"Almond",          ar:"لوز",           L:[30,50,90,60], Kc:[0.40,0.90,0.65], Zr:1.5, p:0.60},
    {id:'grape',  g:'fruit',  fr:"Vigne (raisin)",    en:"Grapevine",       ar:"عنب",           L:[20,50,75,60], Kc:[0.30,0.85,0.45], Zr:1.5, p:0.45},
    {id:'fig',    g:'fruit',  fr:"Figuier",           en:"Fig",             ar:"تين",           L:[30,60,90,60], Kc:[0.50,0.90,0.70], Zr:1.2, p:0.55},
    {id:'pomegranate',g:'fruit',fr:"Grenadier",       en:"Pomegranate",     ar:"رمان",          L:[30,60,90,60], Kc:[0.40,0.85,0.70], Zr:1.2, p:0.55},
    {id:'apricot',g:'fruit',  fr:"Abricotier",        en:"Apricot",         ar:"مشمش",          L:[30,50,90,60], Kc:[0.45,0.90,0.65], Zr:1.5, p:0.50},
    {id:'peach',  g:'fruit',  fr:"Pêcher",            en:"Peach",           ar:"خوخ",           L:[30,50,90,60], Kc:[0.45,0.90,0.65], Zr:1.5, p:0.50},
    {id:'apple',  g:'fruit',  fr:"Pommier",           en:"Apple",           ar:"تفاح",          L:[30,50,110,60], Kc:[0.45,0.95,0.70], Zr:1.5, p:0.50},
    {id:'pear',   g:'fruit',  fr:"Poirier",           en:"Pear",            ar:"كمثرى",         L:[30,50,110,60], Kc:[0.45,0.95,0.70], Zr:1.5, p:0.50},
    {id:'pistachio',g:'fruit',fr:"Pistachier",        en:"Pistachio",       ar:"فستق",          L:[30,50,90,60], Kc:[0.40,1.10,0.45], Zr:1.5, p:0.60},

    // ---- Cultures industrielles ----
    {id:'sunflower',g:'indus',fr:"Tournesol",         en:"Sunflower",       ar:"عبّاد الشمس",   L:[25,35,45,25], Kc:[0.35,1.15,0.35], Zr:1.5, p:0.45},
    {id:'groundnut',g:'indus',fr:"Arachide",          en:"Groundnut",       ar:"فول سوداني",    L:[25,35,45,25], Kc:[0.40,1.15,0.60], Zr:0.7, p:0.50},
    {id:'sesame', g:'indus',  fr:"Sésame",            en:"Sesame",          ar:"سمسم",          L:[20,30,40,20], Kc:[0.35,1.10,0.25], Zr:1.2, p:0.60},
    {id:'cotton', g:'indus',  fr:"Coton",             en:"Cotton",          ar:"قطن",           L:[30,50,60,55], Kc:[0.35,1.15,0.60], Zr:1.4, p:0.65},
    {id:'sugarbeet',g:'indus',fr:"Betterave sucrière",en:"Sugar beet",      ar:"بنجر سكري",     L:[30,45,80,30], Kc:[0.35,1.20,0.70], Zr:1.0, p:0.55},

    // ---- Fourrages ----
    {id:'alfalfa',g:'forage', fr:"Luzerne",           en:"Alfalfa",         ar:"برسيم حجازي",   L:[10,30,25,10], Kc:[0.40,0.95,0.90], Zr:1.5, p:0.55},
    {id:'clover', g:'forage', fr:"Bersim / Trèfle",   en:"Berseem clover",  ar:"برسيم",         L:[10,20,20,10], Kc:[0.40,1.00,0.85], Zr:0.6, p:0.50},
    {id:'ryegrass',g:'forage',fr:"Ray-grass",         en:"Ryegrass",        ar:"عشب الجاودار",  L:[10,20,180,10], Kc:[0.40,1.00,0.90], Zr:0.6, p:0.55},
    {id:'foddersorghum',g:'forage',fr:"Sorgho fourrager",en:"Fodder sorghum",ar:"ذرة علفية",   L:[20,30,30,20], Kc:[0.30,1.10,0.90], Zr:1.2, p:0.55}
  ];

  /* Seuil de tolérance à la salinité CEe (dS/m, extrait saturé — Maas & Hoffman / FAO 29) */
  const CEE = {
    durum:5.7, wheat:6.0, barley:8.0, maize:1.7, sweetcorn:1.7, sorghum:6.8, oat:4.5,
    faba:1.5, chickpea:1.3, lentil:1.5, greenbean:1.0, pea:1.5,
    tomato:2.5, potato:1.7, onion:1.2, garlic:1.7, pepper:1.5, eggplant:1.1, zucchini:2.5,
    cucumber:2.5, watermelon:2.5, melon:2.2, carrot:1.0, cabbage:1.8, lettuce:1.3, artichoke:3.0, okra:1.2,
    olive:2.7, date:4.0, citrus:1.7, lemon:1.7, almond:1.5, grape:1.5, fig:2.7, pomegranate:3.0,
    apricot:1.6, peach:1.7, apple:1.7, pear:1.7, pistachio:3.0,
    sunflower:4.8, groundnut:3.2, sesame:1.5, cotton:7.7, sugarbeet:7.0,
    alfalfa:2.0, clover:1.5, ryegrass:5.6, foddersorghum:6.8
  };
  DB.forEach(c => { c.CEe = (CEE[c.id] != null ? CEE[c.id] : 2.0); });

  const byId = id => DB.find(c => c.id === id) || null;
  const kcMid = id => { const c = byId(id); return c ? c.Kc[1] : null; };
  const cycle = id => { const c = byId(id); return c ? c.L.reduce((a,b)=>a+b,0) : null; };
  function name(id, lang){ const c = byId(id); return c ? (c[lang]||c.fr) : id; }
  /* Remplit un <select> groupé par famille. opt = {lang, value(pré-sél.), suffix(c=>string)} */
  function fillSelect(sel, opt){
    opt = opt || {}; const lang = opt.lang || 'fr';
    const cur = opt.value || sel.value;
    sel.innerHTML = '';
    Object.keys(G).forEach(gk => {
      const list = DB.filter(c => c.g === gk); if(!list.length) return;
      const og = document.createElement('optgroup');
      og.label = G[gk][lang] || G[gk].fr;
      list.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = (c[lang]||c.fr) + (opt.suffix ? ' · ' + opt.suffix(c) : '');
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    if(cur && byId(cur)) sel.value = cur;
  }

  global.CROPS_DB = DB;
  global.CROPS_GROUPS = G;
  global.CROPS = { DB, GROUPS:G, byId, kcMid, cycle, name, fillSelect };
})(window);
