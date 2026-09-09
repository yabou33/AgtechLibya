/* =====================================================================
   AgriTech Libya — Recherche géographique partagée (localités + coordonnées)
   Standard plateforme : toute carte Leaflet doit offrir une recherche
   par NOM de localité (FR/EN/AR) ET par COORDONNÉES (lat, lon).

   Usage :
     <script src=".../assets/js/geo-search.js"></script>   (après Leaflet)
     GeoSearch.add(map, { lang:'fr', showLocalities:true });

   API :
     GeoSearch.add(map, opts) -> control      // ajoute le champ de recherche + couche localités
     GeoSearch.find(name)      -> {lat,lon,name} | null   // recherche par nom (sans carte)
     GeoSearch.parseCoords(str)-> [lat,lon] | null
     GeoSearch.LOCALITIES                     // le jeu de données
   ===================================================================== */
(function (global) {

  /* ---- Localités de Libye (+ Gabès, station météo J4) — lon/lat décimaux ---- */
  const LOCALITIES = [
    {fr:"Tripoli",en:"Tripoli",ar:"طرابلس",lat:32.8872,lon:13.1913,k:"city"},
    {fr:"Benghazi",en:"Benghazi",ar:"بنغازي",lat:32.1194,lon:20.0687,k:"city"},
    {fr:"Misrata",en:"Misrata",ar:"مصراتة",lat:32.3775,lon:15.0925,k:"city"},
    {fr:"Sebha",en:"Sabha",ar:"سبها",lat:27.0377,lon:14.4283,k:"city"},
    {fr:"Syrte",en:"Sirte",ar:"سرت",lat:31.2051,lon:16.5885,k:"city"},
    {fr:"Tobrouk",en:"Tobruk",ar:"طبرق",lat:32.0836,lon:23.9764,k:"city"},
    {fr:"Al Bayda",en:"Al Bayda",ar:"البيضاء",lat:32.7627,lon:21.7551,k:"city"},
    {fr:"Ajdabiya",en:"Ajdabiya",ar:"أجدابيا",lat:30.7554,lon:20.2263,k:"city"},
    {fr:"Derna",en:"Derna",ar:"درنة",lat:32.7674,lon:22.6367,k:"city"},
    {fr:"Zaouïa",en:"Zawiya",ar:"الزاوية",lat:32.7522,lon:12.7278,k:"city"},
    {fr:"Zliten",en:"Zliten",ar:"زليتن",lat:32.4674,lon:14.5687,k:"city"},
    {fr:"Al Khoms",en:"Khoms",ar:"الخمس",lat:32.6486,lon:14.2619,k:"city"},
    {fr:"Gharyan",en:"Gharyan",ar:"غريان",lat:32.1722,lon:13.0203,k:"city"},
    {fr:"Sabratha",en:"Sabratha",ar:"صبراتة",lat:32.7934,lon:12.4885,k:"city"},
    {fr:"Zouara",en:"Zuwara",ar:"زوارة",lat:32.9312,lon:12.0820,k:"city"},
    {fr:"Nalout",en:"Nalut",ar:"نالوت",lat:31.8690,lon:10.9800,k:"town"},
    {fr:"Ghadamès",en:"Ghadames",ar:"غدامس",lat:30.1333,lon:9.5000,k:"oasis"},
    {fr:"Mourzouk",en:"Murzuq",ar:"مرزق",lat:25.9180,lon:13.9200,k:"town"},
    {fr:"Ghat",en:"Ghat",ar:"غات",lat:24.9640,lon:10.1800,k:"town"},
    {fr:"Oubari",en:"Ubari",ar:"أوباري",lat:26.5900,lon:12.7770,k:"town"},
    {fr:"Brak",en:"Brak",ar:"براك",lat:27.5390,lon:14.2720,k:"town"},
    {fr:"Houn",en:"Hun",ar:"هون",lat:29.1270,lon:15.9470,k:"town"},
    {fr:"Waddan",en:"Waddan",ar:"ودان",lat:29.1610,lon:16.1390,k:"town"},
    {fr:"Koufra (Al Jawf)",en:"Kufra (Al Jawf)",ar:"الكفرة",lat:24.1830,lon:23.3110,k:"oasis"},
    {fr:"Tazerbo",en:"Tazerbo",ar:"تازربو",lat:25.7000,lon:21.0500,k:"oasis"},
    {fr:"Jalu",en:"Jalu",ar:"جالو",lat:29.0330,lon:21.5500,k:"oasis"},
    {fr:"Awjila",en:"Awjila",ar:"أوجلة",lat:29.1080,lon:21.2880,k:"oasis"},
    {fr:"Sarir (champ captant)",en:"Sarir (wellfield)",ar:"السرير (حقل آبار)",lat:27.6000,lon:22.5000,k:"wellfield"},
    {fr:"Marada",en:"Marada",ar:"مرادة",lat:29.2300,lon:19.2130,k:"oasis"},
    {fr:"Bani Walid",en:"Bani Walid",ar:"بني وليد",lat:31.7460,lon:13.9840,k:"town"},
    {fr:"Tarhouna",en:"Tarhuna",ar:"ترهونة",lat:32.4350,lon:13.6330,k:"town"},
    {fr:"Yafran",en:"Yafran",ar:"يفرن",lat:32.0630,lon:12.5240,k:"town"},
    {fr:"Ras Lanouf",en:"Ras Lanuf",ar:"رأس لانوف",lat:30.5000,lon:18.5500,k:"town"},
    {fr:"Brega",en:"Brega",ar:"البريقة",lat:30.4160,lon:19.5750,k:"town"},
    {fr:"Jaghboub",en:"Jaghbub",ar:"الجغبوب",lat:29.7500,lon:24.5170,k:"oasis"},
    {fr:"Gabès (station J4)",en:"Gabes (J4 station)",ar:"قابس (محطة J4)",lat:33.8810,lon:10.0980,k:"station"}
  ];

  const norm = s => (s||"").toString().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")           // enlève accents latins
    .replace(/[ً-ْٰ]/g,"")                       // enlève diacritiques arabes
    .replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي")  // normalise arabe
    .trim();

  function find(q){
    const n = norm(q); if(!n) return null;
    let best=null, exact=null;
    for(const L of LOCALITIES){
      const cands=[L.fr,L.en,L.ar].map(norm);
      if(cands.some(c=>c===n)){ exact=L; break; }
      if(!best && cands.some(c=>c.includes(n))) best=L;
    }
    return exact||best||null;
  }
  function search(q,limit){
    const n=norm(q); if(!n) return [];
    return LOCALITIES.filter(L=>[L.fr,L.en,L.ar].map(norm).some(c=>c.includes(n))).slice(0,limit||8);
  }

  /* "27.6, 22.5" | "27.6 22.5" | "32°53'N 13°11'E" (decimal ou DMS simple) */
  function parseCoords(str){
    if(!str) return null;
    let s=str.trim().replace(/[;|]/g," ").replace(/,/g," , ");
    // DMS -> decimal
    const dms=/(\d{1,3})[°:\s]+(\d{1,2})[′'\s]+(\d{1,2}(?:\.\d+)?)?[″"\s]*([NSEWnsew])/g;
    let m,parts=[];
    while((m=dms.exec(s))){ let v=(+m[1])+(+m[2])/60+((+m[3]||0)/3600); const h=m[4].toUpperCase(); if(h==='S'||h==='W')v=-v; parts.push(v); }
    if(parts.length>=2) return okLL(parts[0],parts[1]) || okLL(parts[1],parts[0]);
    // decimal pair
    const nums=(s.match(/-?\d{1,3}(?:\.\d+)?/g)||[]).map(Number);
    if(nums.length>=2) return okLL(nums[0],nums[1]) || okLL(nums[1],nums[0]);
    return null;
  }
  function okLL(a,b){ return (a>=-90&&a<=90&&b>=-180&&b<=180)?[a,b]:null; }

  /* ---- Contrôle Leaflet ---- */
  const T={
    ph:{fr:"Lieu ou lat, lon…",en:"Place or lat, lon…",ar:"مكان أو إحداثيات…"},
    go:{fr:"Aller",en:"Go",ar:"إذهب"},
    loc:{fr:"Localités",en:"Localities",ar:"المواقع"},
    names:{fr:"Noms des lieux",en:"Place names",ar:"أسماء الأماكن"},
    roads:{fr:"Routes & pistes",en:"Roads & tracks",ar:"طرق ومسالك"},
    none:{fr:"Aucun résultat",en:"No match",ar:"لا نتيجة"}
  };
  const ESRI_NAMES="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
  const ESRI_ROADS="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";
  function add(map, opts){
    opts=opts||{}; let lang=opts.lang||'fr';
    if(typeof L==='undefined'||!map){ console.warn('GeoSearch: Leaflet/map manquant'); return null; }

    // couche localités
    const layer=L.layerGroup();
    LOCALITIES.forEach(loc=>{
      const mk=L.circleMarker([loc.lat,loc.lon],{radius:4,color:'#5a8f2c',weight:1.5,fillColor:'#a5d16e',fillOpacity:.9});
      mk.bindTooltip(()=>loc[lang]||loc.fr,{direction:'top',opacity:.9,className:'gs-tip'});
      mk.bindPopup(()=>`<b>${loc[lang]||loc.fr}</b><br>${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`);
      layer.addLayer(mk);
    });
    if(opts.showLocalities!==false) layer.addTo(map);

    // calques de référence Esri (noms de lieux / routes) — au-dessus du fond, sous les marqueurs
    const wantOv = opts.overlays!==false;
    let ovNames=null, ovRoads=null;
    if(wantOv){
      if(!map.getPane('gsRef')){ map.createPane('gsRef'); const pn=map.getPane('gsRef'); pn.style.zIndex=350; pn.style.pointerEvents='none'; }
      ovNames=L.tileLayer(ESRI_NAMES,{pane:'gsRef',opacity:.95});
      ovRoads=L.tileLayer(ESRI_ROADS,{pane:'gsRef',opacity:.9});
      if(opts.names!==false) ovNames.addTo(map);
      if(opts.roads!==false) ovRoads.addTo(map);
    }

    let tmp=null;
    function goTo(lat,lon,label){
      map.setView([lat,lon], Math.max(map.getZoom(),9), {animate:true});
      if(tmp) map.removeLayer(tmp);
      tmp=L.marker([lat,lon]).addTo(map).bindPopup(`<b>${label||''}</b><br>${lat.toFixed(4)}, ${lon.toFixed(4)}`).openPopup();
    }

    const Ctl=L.Control.extend({
      options:{position:'topright'},
      onAdd:function(){
        const c=L.DomUtil.create('div','gs-box');
        c.innerHTML=`<div class="gs-row">
            <input class="gs-in" type="text" placeholder="${T.ph[lang]}" aria-label="${T.ph[lang]}">
            <button class="gs-go" title="${T.go[lang]}">🔍</button>
          </div>
          <div class="gs-list" hidden></div>
          <label class="gs-toggle"><input type="checkbox" class="gs-lay" ${opts.showLocalities!==false?'checked':''}> ${T.loc[lang]}</label>`
          + (wantOv?`<label class="gs-toggle"><input type="checkbox" class="gs-names" ${opts.names!==false?'checked':''}> ${T.names[lang]}</label>
          <label class="gs-toggle"><input type="checkbox" class="gs-roads" ${opts.roads!==false?'checked':''}> ${T.roads[lang]}</label>`:'');
        const inp=c.querySelector('.gs-in'), go=c.querySelector('.gs-go'),
              list=c.querySelector('.gs-list'), lay=c.querySelector('.gs-lay');
        L.DomEvent.disableClickPropagation(c); L.DomEvent.disableScrollPropagation(c);
        if(wantOv){
          const nm=c.querySelector('.gs-names'), rd=c.querySelector('.gs-roads');
          nm.addEventListener('change',()=>{ nm.checked?ovNames.addTo(map):map.removeLayer(ovNames); });
          rd.addEventListener('change',()=>{ rd.checked?ovRoads.addTo(map):map.removeLayer(ovRoads); });
        }
        function submit(){
          const v=inp.value.trim(); if(!v) return;
          const ll=parseCoords(v);
          if(ll){ goTo(ll[0],ll[1],v); list.hidden=true; return; }
          const hit=find(v);
          if(hit){ goTo(hit.lat,hit.lon,hit[lang]||hit.fr); list.hidden=true; }
          else { list.innerHTML=`<div class="gs-empty">${T.none[lang]}</div>`; list.hidden=false; }
        }
        function suggest(){
          const v=inp.value.trim();
          if(parseCoords(v)){ list.hidden=true; return; }
          const r=search(v,7);
          if(!v||!r.length){ list.hidden=true; return; }
          list.innerHTML=r.map(loc=>`<div class="gs-item" data-lat="${loc.lat}" data-lon="${loc.lon}">${loc[lang]||loc.fr} <span>${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}</span></div>`).join('');
          list.hidden=false;
        }
        inp.addEventListener('input',suggest);
        inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();submit();} });
        go.addEventListener('click',submit);
        list.addEventListener('click',e=>{ const it=e.target.closest('.gs-item'); if(!it)return;
          goTo(+it.dataset.lat,+it.dataset.lon,it.textContent); inp.value=''; list.hidden=true; });
        lay.addEventListener('change',()=>{ lay.checked?layer.addTo(map):map.removeLayer(layer); });
        return c;
      }
    });
    const ctl=new Ctl(); map.addControl(ctl);
    ctl._layer=layer; ctl.setLang=l=>{lang=l;}; return ctl;
  }

  // styles injectés une seule fois
  if(!document.getElementById('gs-style')){
    const st=document.createElement('style'); st.id='gs-style';
    st.textContent=`
    .gs-box{background:#fff;border:1px solid #d8e4c8;border-radius:10px;box-shadow:0 4px 14px rgba(60,80,40,.16);padding:7px;font:13px/1.3 "Inter","Segoe UI",system-ui,sans-serif;min-width:210px}
    .gs-row{display:flex;gap:5px}
    .gs-in{flex:1;min-width:0;border:1px solid #d8e4c8;border-radius:7px;padding:6px 9px;font:inherit;color:#2c3a24}
    .gs-in:focus{outline:none;border-color:#7cb342}
    .gs-go{border:0;background:#7cb342;color:#fff;border-radius:7px;padding:0 10px;cursor:pointer;font-size:14px}
    .gs-go:hover{background:#5a8f2c}
    .gs-list{margin-top:5px;max-height:190px;overflow:auto;border:1px solid #eef3e5;border-radius:7px}
    .gs-item{padding:6px 9px;cursor:pointer;color:#2c3a24;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
    .gs-item:hover{background:#f1f7e9}
    .gs-item span{color:#9aa890;font-size:11px;font-family:"JetBrains Mono",monospace}
    .gs-empty{padding:7px 9px;color:#9aa890}
    .gs-toggle{display:flex;align-items:center;gap:6px;margin-top:6px;color:#6f7d64;font-size:12px;cursor:pointer}
    .gs-tip{font-size:11px}
    [dir="rtl"] .gs-box,body[data-lang="ar"] .gs-box{font-family:"IBM Plex Sans Arabic","Segoe UI",sans-serif}`;
    document.head.appendChild(st);
  }

  global.GeoSearch={ add, find, search, parseCoords, LOCALITIES };
})(window);
