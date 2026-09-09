/* =====================================================================
   AgriTech Libya — i18n partagé (AR / EN / FR)
   Usage :  I18N.set('ar');  I18N.t('nav_home');  data-i18n="nav_home"
   ===================================================================== */
(function (global) {
  const DICT = {
    // Général
    app_title:   { fr:"Plateforme AgriTech Libye", ar:"منصة أجريتك ليبيا", en:"AgriTech Libya Platform" },
    tagline:     { fr:"Formation Agriculture Intelligente & Gestion de l'Eau · EU4Skills",
                   ar:"تكوين الزراعة الذكية وإدارة المياه · EU4Skills",
                   en:"Smart Agriculture & Water Management Training · EU4Skills" },
    login:       { fr:"Connexion", ar:"تسجيل الدخول", en:"Sign in" },
    logout:      { fr:"Déconnexion", ar:"تسجيل الخروج", en:"Sign out" },
    guest:       { fr:"Invité (mode local)", ar:"زائر (وضع محلي)", en:"Guest (local mode)" },
    import:      { fr:"Importer", ar:"استيراد", en:"Import" },
    export:      { fr:"Exporter", ar:"تصدير", en:"Export" },
    format_help: { fr:"Format ?", ar:"الصيغة؟", en:"Format?" },
    open:        { fr:"Ouvrir", ar:"فتح", en:"Open" },
    soon:        { fr:"Bientôt", ar:"قريباً", en:"Soon" },
    ready:       { fr:"Disponible", ar:"متاح", en:"Ready" },

    // Navigation / sections
    nav_home:    { fr:"Accueil", ar:"الرئيسية", en:"Home" },
    nav_modules: { fr:"Modules de formation", ar:"وحدات التكوين", en:"Training modules" },
    nav_data:    { fr:"Mes données", ar:"بياناتي", en:"My data" },
    nav_admin:   { fr:"Administration", ar:"الإدارة", en:"Administration" },

    // Profils
    role_admin:       { fr:"Administrateur", ar:"مدير النظام", en:"Administrator" },
    role_professeur:  { fr:"Professeur", ar:"أستاذ", en:"Teacher" },
    role_etudiant:    { fr:"Étudiant", ar:"طالب", en:"Student" },
    role_agriculteur: { fr:"Agriculteur", ar:"مزارع", en:"Farmer" },

    // Modules (titres courts — les détails viennent de la base)
    m1: { fr:"Introduction Smart Agriculture", ar:"مقدمة في الزراعة الذكية", en:"Intro to Smart Agriculture" },
    m2: { fr:"Télédétection & indices", ar:"الاستشعار عن بُعد والمؤشرات", en:"Remote Sensing & Indices" },
    m3: { fr:"IoT — Capteurs de sol", ar:"إنترنت الأشياء وأجهزة استشعار التربة", en:"IoT — Soil Sensors" },
    m4: { fr:"Météo, ET₀ & bilan hydrique", ar:"المناخ والميزان المائي", en:"Weather, ET₀ & Water Balance" },
    m5: { fr:"Irrigation & pilotage", ar:"الري والتحكم", en:"Irrigation & Control" },
    m6: { fr:"FMIS — Gestion de ferme", ar:"إدارة المزرعة", en:"FMIS — Farm Management" },
    m7: { fr:"IA en agriculture", ar:"الذكاء الاصطناعي", en:"AI for Agriculture" },
    m8: { fr:"Analyse des écarts", ar:"تحليل الفجوات", en:"Gap Analysis" },
    m9: { fr:"Plan d'action", ar:"خطة العمل", en:"Action Plan" },
    g0: { fr:"Géologie × Hydrogéologie", ar:"الجيولوجيا والهيدروجيولوجيا", en:"Geology × Hydrogeology" },

    // Descriptions modules
    m1d:{ fr:"Chaîne de valeur de la donnée, écosystème agri-tech libyen, économie de l'adoption.",
          ar:"سلسلة قيمة البيانات، منظومة الزراعة الذكية في ليبيا، اقتصاديات التبني.",
          en:"Data value chain, Libyan agri-tech ecosystem, economics of adoption." },
    m2d:{ fr:"16 indices Sentinel-2 (NDVI, NDRE, NDMI…), statistiques zonales, séries temporelles.",
          ar:"16 مؤشراً من Sentinel-2، إحصاءات المناطق، السلاسل الزمنية.",
          en:"16 Sentinel-2 indices (NDVI, NDRE, NDMI…), zonal stats, time-series." },
    m3d:{ fr:"Capteurs sol multi-profondeur, lecture de courbes, réseaux LoRaWAN/GSM, CAPEX/OPEX.",
          ar:"مجسات التربة متعددة الأعماق، قراءة المنحنيات، الشبكات، التكاليف.",
          en:"Multi-depth soil probes, curve reading, LoRaWAN/GSM networks, CAPEX/OPEX." },
    m4d:{ fr:"ET₀ FAO-56 Penman-Monteith pas à pas, bilan hydrique décadaire, GDD & TomCast.",
          ar:"حساب ET₀ خطوة بخطوة، الميزان المائي، درجات الحرارة المتراكمة.",
          en:"ET₀ FAO-56 step by step, ten-day water balance, GDD & TomCast." },
    m5d:{ fr:"Pilotage d'irrigation, seuils par culture, planning & re-planification sous contrainte.",
          ar:"التحكم في الري، العتبات حسب المحصول، الجدولة تحت القيود.",
          en:"Irrigation control, crop thresholds, scheduling under constraints." },
    m6d:{ fr:"Parcelles, opérations, coûts de production, traçabilité, AgriScore.",
          ar:"القطع الزراعية، العمليات، تكاليف الإنتاج، التتبّع.",
          en:"Parcels, operations, production costs, traceability, AgriScore." },
    m7d:{ fr:"Détection de maladies par vision, prédiction de rendement, classification satellite.",
          ar:"اكتشاف الأمراض بالرؤية، التنبؤ بالمحصول، التصنيف الفضائي.",
          en:"Disease detection by vision, yield prediction, satellite classification." },
    m8d:{ fr:"Carte des écarts de compétences priorisée par équipe universitaire.",
          ar:"خريطة الفجوات في الكفاءات حسب الأولوية.",
          en:"Prioritised competency-gap map per university team." },
    m9d:{ fr:"Pour chaque écart : cours/TP à créer, moyens, obstacles, calendrier d'accréditation.",
          ar:"لكل فجوة: المقرر، الوسائل، العوائق، الجدول الزمني.",
          en:"Per gap: course/TP to create, means, obstacles, accreditation timeline." },
    g0d:{ fr:"Aquifère de Nubie, GRACE, piézomètre ESP32, essais de pompage Theis, cas B-14.",
          ar:"الخزان الجوفي النوبي، GRACE، اختبارات الضخ، حالة B-14.",
          en:"Nubian aquifer, GRACE, ESP32 piezometer, Theis pumping tests, B-14 case." }
  };

  const RTL = ["ar"];
  let cur = localStorage.getItem("agri_lang") || "fr";

  function t(key){ const e = DICT[key]; return e ? (e[cur] || e.fr) : key; }

  function apply(root){
    (root || document).querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    (root || document).querySelectorAll("[data-i18n-ph]").forEach(el => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
  }

  function set(lang){
    cur = DICT.app_title[lang] ? lang : "fr";
    localStorage.setItem("agri_lang", cur);
    document.documentElement.lang = cur;
    document.body.setAttribute("dir", RTL.includes(cur) ? "rtl" : "ltr");
    document.querySelectorAll(".langbox button").forEach(b =>
      b.classList.toggle("on", b.dataset.lang === cur));
    apply();
    document.dispatchEvent(new CustomEvent("i18n:changed", { detail:{ lang:cur } }));
  }

  global.I18N = { t, set, apply, get lang(){ return cur; }, DICT };
})(window);
