/* =====================================================================
   AgriTech Libya — Moteur cartographique PARTAGÉ  (agrimap-draw.js)
   Standard de dessin de parcelles pour TOUTES les apps de la plateforme.
   Extrait/harmonisé depuis J3/pilotage-irrigation.html (AgriManager · Irrigation Control).

   Dépendances (à charger avant) :
     - Leaflet 1.9      (leaflet.js + leaflet.css)
     - Leaflet.draw 1.0 (leaflet.draw.js + leaflet.draw.css)
     - (optionnel) window.I18N pour la langue courante

   API :
     const carto = AgriMap.create(el, { lang, basemap:'sat', center:[lat,lng], zoom, tools:[...] });
     carto.on('change', state => Store.saveProject(carto.export()));
     carto.on('select', sel => {...});
     carto.load(projectJSON);            // hydrate parcelles + équipements
     carto.export();                     // -> {format:'agrimanager-irrigation',version:1,...}
     carto.exportGeoJSON();              // -> FeatureCollection (parcelles)
     carto.importGeoJSON(featureColl);   // ajoute des parcelles
     carto.setLang('ar');
   ===================================================================== */
(function (global) {
"use strict";

/* ------------------------- i18n local (fallback) ------------------------- */
const L10N = {
  tool_select:{fr:"Sélection",ar:"تحديد",en:"Select"},
  tool_parcel:{fr:"Parcelle (polygone)",ar:"قطعة (مضلّع)",en:"Parcel (polygon)"},
  tool_pivot:{fr:"Pivot (cercle)",ar:"محور ريّ (دائرة)",en:"Pivot (circle)"},
  tool_rect:{fr:"Rectangle",ar:"مستطيل",en:"Rectangle"},
  tool_well:{fr:"Forage / puits",ar:"بئر",en:"Well / borehole"},
  tool_pump:{fr:"Motopompe",ar:"مضخة",en:"Pump"},
  tool_valve:{fr:"Électrovanne",ar:"صمّام",en:"Valve"},
  tool_meter:{fr:"Compteur",ar:"عدّاد",en:"Meter"},
  tool_probe:{fr:"Sonde",ar:"مجس",en:"Probe"},
  tool_weather:{fr:"Station météo",ar:"محطة جوية",en:"Weather station"},
  tool_marker:{fr:"Repère",ar:"علامة",en:"Marker"},
  t_click_place:{fr:"Cliquez sur la carte pour placer :",ar:"انقر على الخريطة لوضع:",en:"Click the map to place:"},
  basemap_plan:{fr:"Plan",ar:"خريطة",en:"Plan"},
  basemap_sat:{fr:"Satellite",ar:"قمر صناعي",en:"Satellite"},
  tab_bilan:{fr:"Bilan",ar:"الحصيلة",en:"Summary"},
  tab_equip:{fr:"Équip.",ar:"معدات",en:"Equip."},
  tab_fiche:{fr:"Fiche",ar:"بطاقة",en:"Sheet"},
  p_name:{fr:"Nom",ar:"الاسم",en:"Name"},
  p_crop:{fr:"Culture",ar:"المحصول",en:"Crop"},
  p_soil:{fr:"Sol",ar:"التربة",en:"Soil"},
  p_area:{fr:"Surface",ar:"المساحة",en:"Area"},
  p_delete:{fr:"Supprimer",ar:"حذف",en:"Delete"},
  empty_sel:{fr:"Sélectionnez ou dessinez une parcelle.",ar:"اختر أو ارسم قطعة.",en:"Select or draw a parcel."},
  parcels:{fr:"parcelles",ar:"قطع",en:"parcels"},
  equipment:{fr:"équipements",ar:"معدات",en:"equipment"}
};
function lang(){ return (global.I18N && global.I18N.lang) || "fr"; }
function T(k){ const e=L10N[k]; return e ? (e[lang()]||e.fr) : k; }

/* ------------------------- icônes SVG ------------------------- */
const ICONS = {
  select:'<path d="M4 3l7 17 2-7 7-2z"/>',
  parcel:'<path d="M4 6l7-3 9 4-2 12-9 2-5-3z" fill="none"/>',
  pivot:'<circle cx="12" cy="12" r="8" fill="none" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="1.5"/>',
  rect:'<rect x="4" y="6" width="16" height="12" rx="1" fill="none"/>',
  well:'<path d="M8 21V8l4-4 4 4v13M8 12h8" fill="none"/>',
  pump:'<circle cx="12" cy="12" r="7" fill="none"/><path d="M12 5v7l4 3" fill="none"/>',
  valve:'<path d="M4 12h16M12 8v8M7 9l10 6M17 9L7 15" fill="none"/>',
  meter:'<circle cx="12" cy="12" r="8" fill="none"/><path d="M12 12l4-3" fill="none"/>',
  probe:'<path d="M12 3v14M9 20h6M8 8h8M8 12h8" fill="none"/>',
  weather:'<path d="M7 16a4 4 0 010-8 5 5 0 019-2 4 4 0 011 8M9 20l-1 2M13 20l-1 2M17 20l-1 2" fill="none"/>',
  marker:'<path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" fill="none"/><circle cx="12" cy="9" r="2.5"/>'
};
function svg(id){ return '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6">'+(ICONS[id]||'')+'</svg>'; }

/* ------------------------- CSS injecté une fois ------------------------- */
function injectCSS(){
  if(document.getElementById('agrimap-css')) return;
  const s=document.createElement('style'); s.id='agrimap-css'; s.textContent=`
  .agrimap-root{position:relative;width:100%;height:100%;display:flex;min-height:420px}
  .agrimap-map{flex:1;height:100%;min-height:420px;z-index:1}
  .agrimap-bar{position:absolute;top:12px;inset-inline-start:12px;z-index:600;display:flex;flex-direction:column;
    gap:3px;background:#16201b;border:1px solid #2b3a30;border-radius:11px;padding:5px;box-shadow:0 6px 20px rgba(0,0,0,.3)}
  .agrimap-bar .tool{width:38px;height:38px;border:none;background:transparent;color:#cdd8cb;border-radius:8px;
    cursor:pointer;display:grid;place-items:center;position:relative;transition:.15s}
  .agrimap-bar .tool svg{width:20px;height:20px}
  .agrimap-bar .tool:hover{background:#22304a33;color:#fff}
  .agrimap-bar .tool.on{background:#2ea8d8;color:#04202c}
  .agrimap-bar .sep{height:1px;background:#2b3a30;margin:3px 4px}
  .agrimap-bar .tool .tip{position:absolute;inset-inline-start:46px;top:50%;transform:translateY(-50%);
    background:#0e1512;color:#e8efe6;font:600 12px/1 system-ui;white-space:nowrap;padding:6px 9px;border-radius:6px;
    opacity:0;pointer-events:none;transition:.12s;border:1px solid #2b3a30}
  .agrimap-bar .tool:hover .tip{opacity:1}
  body[dir=rtl] .agrimap-bar .tool .tip{inset-inline-start:auto;inset-inline-end:46px}
  .agrimap-base{position:absolute;top:12px;inset-inline-end:12px;z-index:600;display:flex;gap:2px;
    background:#16201b;border:1px solid #2b3a30;border-radius:9px;padding:3px}
  .agrimap-base button{border:none;background:transparent;color:#8fa596;font:700 12px system-ui;padding:6px 12px;
    border-radius:6px;cursor:pointer}
  .agrimap-base button.on{background:#2ea8d8;color:#04202c}
  .agrimap-panel{width:300px;background:#fff;border-inline-start:1px solid #e6eaf2;overflow:auto;padding:16px;
    font:14px/1.5 "Nunito Sans",system-ui,sans-serif;color:#2b3a55}
  .agrimap-panel.dark{background:#16201b;color:#e8efe6;border-color:#2b3a30}
  .agrimap-panel h3{font-size:15px;font-weight:800;margin-bottom:4px}
  .agrimap-panel .muted{color:#8a97ad;font-size:12.5px}
  .agrimap-tabs{display:flex;gap:4px;margin:12px 0}
  .agrimap-tabs button{flex:1;border:1px solid #e6eaf2;background:#f5f7fc;border-radius:8px;padding:7px;font:700 12px system-ui;
    cursor:pointer;color:#2b3a55}
  .agrimap-tabs button.on{background:#3d8bfd;color:#fff;border-color:#3d8bfd}
  .agrimap-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
  .agrimap-field label{font-size:11.5px;font-weight:800;color:#8a97ad}
  .agrimap-field input,.agrimap-field select{border:1px solid #e6eaf2;border-radius:7px;padding:8px;font:inherit}
  .agrimap-del{border:none;background:#fdecea;color:#e2574c;font-weight:700;border-radius:8px;padding:8px 12px;cursor:pointer;width:100%}
  .agrimap-list{list-style:none;margin:8px 0;padding:0}
  .agrimap-list li{padding:8px 10px;border:1px solid #e6eaf2;border-radius:8px;margin-bottom:6px;cursor:pointer;font-size:13px}
  .agrimap-list li:hover{border-color:#3d8bfd}
  .plabel{background:rgba(20,30,25,.7);color:#fff;border:none;font-weight:700;font-size:11px;box-shadow:none}
  .eqpin{width:30px;height:38px;display:grid;place-items:center;filter:drop-shadow(0 3px 4px rgba(0,0,0,.4))}
  .eqpin svg{width:17px;height:17px;color:#fff}
  /* Poignées de sommets (dessin/édition de polygone) — plus petites */
  .leaflet-editing-icon{
    width:6px!important;height:6px!important;
    margin-left:-3px!important;margin-top:-3px!important;
    border-radius:50%!important;border:1px solid #04202c!important;background:#fff!important;box-shadow:0 0 0 1px rgba(0,0,0,.15)}
  @media(max-width:760px){.agrimap-root{flex-direction:column}.agrimap-panel{width:100%;border-inline-start:none;border-top:1px solid #e6eaf2}}
  `;
  document.head.appendChild(s);
}

/* ------------------------- géométrie ------------------------- */
function polyAreaHa(coords){ // fallback planaire (petites surfaces)
  let a=0; for(let i=0,j=coords.length-1;i<coords.length;j=i++){
    const xi=coords[i][1]*Math.cos(coords[i][0]*Math.PI/180)*111320, yi=coords[i][0]*110540;
    const xj=coords[j][1]*Math.cos(coords[j][0]*Math.PI/180)*111320, yj=coords[j][0]*110540;
    a+=(xj*yi-xi*yj);
  } return Math.abs(a/2)/10000;
}
function centroid(coords){let x=0,y=0;coords.forEach(c=>{x+=c[0];y+=c[1];});return [x/coords.length,y/coords.length];}
function uid(p){return p+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

const CROP_COLORS={olivier:'#5a8f2c',tomate:'#d1584e',ble:'#e0a92b',oranger:'#e08a2b',palmier:'#3fa66a',_def:'#2ea8d8'};
/* Couleur par famille (base de cultures partagée crops.js) + repli anciens noms */
const CROP_GCOL={cereal:'#e0a92b',legume:'#7cb342',veget:'#d1584e',fruit:'#5a8f2c',indus:'#8e6fc7',forage:'#3fa66a'};
function cropColor(id){ const c=(window.CROPS&&window.CROPS.byId)?window.CROPS.byId(id):null; return (c&&CROP_GCOL[c.g])||CROP_COLORS[id]||CROP_COLORS._def; }
/* Options <optgroup> depuis CROPS_DB (~47 cultures) selon la langue courante */
function cropOptions(sel){
  const L=(window.I18N&&I18N.lang)||'fr', DB=window.CROPS_DB||[], G=window.CROPS_GROUPS||{};
  if(!DB.length) return '<option'+(sel?' selected':'')+'>'+(sel||'')+'</option>';
  const gr={}; DB.forEach(c=>{(gr[c.g]=gr[c.g]||[]).push(c);});
  return Object.keys(gr).map(gk=>'<optgroup label="'+((G[gk]&&(G[gk][L]||G[gk].fr))||gk)+'">'+
    gr[gk].map(c=>'<option value="'+c.id+'"'+(sel===c.id?' selected':'')+'>'+(c[L]||c.fr)+'</option>').join('')+'</optgroup>').join('');
}
const EQ_COLORS={well:'#5fb15a',pump:'#e08a2b',valve:'#2ea8d8',meter:'#2ea8d8',probe:'#c9a24b',weather:'#3d8bfd',marker:'#8a97ad'};
const EQ_NAMES={well:{fr:'Puits',ar:'بئر',en:'Well'},pump:{fr:'Pompe',ar:'مضخة',en:'Pump'},valve:{fr:'Vanne',ar:'صمّام',en:'Valve'},meter:{fr:'Compteur',ar:'عدّاد',en:'Meter'},probe:{fr:'Sonde',ar:'مجس',en:'Probe'},weather:{fr:'Météo',ar:'محطة',en:'Weather'},marker:{fr:'Repère',ar:'علامة',en:'Marker'}};

const TOOLS=[
  {id:'select'},{sep:1},
  {id:'parcel'},{id:'pivot'},{id:'rect'},{sep:1},
  {id:'well'},{id:'pump'},{id:'valve'},{id:'meter'},{sep:1},
  {id:'probe'},{id:'weather'},{id:'marker'}
];
const EQUIP_TOOLS=['well','pump','valve','meter','probe','weather','marker'];

/* ============================ CLASSE ============================ */
function create(elOrSel, opts){
  opts=opts||{};
  injectCSS();
  const host = typeof elOrSel==='string' ? document.querySelector(elOrSel) : elOrSel;
  host.classList.add('agrimap-root');
  host.innerHTML='';

  const mapEl=document.createElement('div'); mapEl.className='agrimap-map'; host.appendChild(mapEl);
  const bar=document.createElement('div'); bar.className='agrimap-bar'; host.appendChild(bar);
  const baseBox=document.createElement('div'); baseBox.className='agrimap-base'; host.appendChild(baseBox);
  const showPanel = opts.panel!==false;
  const panel=document.createElement('div'); panel.className='agrimap-panel'+(opts.panelDark?' dark':'');
  if(showPanel) host.appendChild(panel);

  const ST={ name:opts.name||'Projet', parcels:[], equipment:[], center:opts.center||[27.036,14.425], zoom:opts.zoom||13 };
  const listeners={change:[],select:[]};
  const layerIndex={};
  let activeTool='select', drawHandler=null, placingType=null, selection=null;

  /* ---- carte ---- */
  const map=L.map(mapEl,{doubleClickZoom:false,zoomControl:true}).setView(ST.center,ST.zoom);
  const basePlan=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'});
  const baseSat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri World Imagery'});
  ((opts.basemap||'sat')==='sat'?baseSat:basePlan).addTo(map);
  const drawn=L.featureGroup().addTo(map);

  function renderBase(){
    baseBox.innerHTML='';
    [['plan',basePlan],['sat',baseSat]].forEach(([k,layer])=>{
      const b=document.createElement('button'); b.textContent=T('basemap_'+k);
      const on=map.hasLayer(layer); b.classList.toggle('on',on);
      b.onclick=()=>{ map.removeLayer(basePlan);map.removeLayer(baseSat); layer.addTo(map); renderBase(); };
      baseBox.appendChild(b);
    });
  }

  /* ---- barre d'outils ---- */
  function renderBar(){
    bar.innerHTML='';
    TOOLS.forEach(t=>{
      if(t.sep){ const d=document.createElement('div'); d.className='sep'; bar.appendChild(d); return; }
      const b=document.createElement('button'); b.className='tool'+(activeTool===t.id?' on':'');
      b.innerHTML=svg(t.id)+'<span class="tip">'+T('tool_'+t.id)+'</span>';
      b.onclick=()=>selectTool(t.id); bar.appendChild(b);
    });
  }
  function selectTool(id){
    activeTool=id; renderBar();
    if(drawHandler){ drawHandler.disable(); drawHandler=null; }
    placingType=null; map.off('click',placePoint);
    mapEl.style.cursor='';
    if(id==='parcel'){ drawHandler=new L.Draw.Polygon(map,{shapeOptions:{color:'#2ea8d8',weight:2}}); drawHandler.enable(); }
    else if(id==='pivot'){ drawHandler=new L.Draw.Circle(map,{shapeOptions:{color:'#2ea8d8',weight:2,dashArray:'5 5'}}); drawHandler.enable(); }
    else if(id==='rect'){ drawHandler=new L.Draw.Rectangle(map,{shapeOptions:{color:'#2ea8d8',weight:2}}); drawHandler.enable(); }
    else if(EQUIP_TOOLS.includes(id)){ placingType=id; map.on('click',placePoint); mapEl.style.cursor='crosshair'; }
  }

  /* ---- création de formes ---- */
  map.on(L.Draw.Event.CREATED,e=>{
    const layer=e.layer, type=e.layerType;
    if(type==='polygon'||type==='rectangle'){
      const coords=layer.getLatLngs()[0].map(ll=>[ll.lat,ll.lng]);
      const area=geoArea(layer.getLatLngs()[0],coords);
      const p={id:uid('P'),name:(T('tool_parcel'),'Parcelle '+String(ST.parcels.length+1).padStart(2,'0')),
        crop:'olivier',soil:'argilo-limoneux',shape:type==='rectangle'?'rectangle':'polygon',area_ha:area,coords,center:centroid(coords)};
      ST.parcels.push(p); addParcelLayer(p); select({kind:'parcel',id:p.id}); emit('change');
    } else if(type==='circle'){
      const c=layer.getLatLng(), r=layer.getRadius();
      const p={id:uid('PIV'),name:'Pivot '+String(ST.parcels.length+1).padStart(2,'0'),crop:'ble',soil:'sableux',
        shape:'pivot',area_ha:+(Math.PI*r*r/10000).toFixed(2),pivot:{lat:c.lat,lng:c.lng,radius:r},center:[c.lat,c.lng]};
      ST.parcels.push(p); addPivotLayer(p); select({kind:'parcel',id:p.id}); emit('change');
    }
    selectTool('select');
  });
  function geoArea(latlngs,coords){
    try{ if(L.GeometryUtil&&L.GeometryUtil.geodesicArea) return +(L.GeometryUtil.geodesicArea(latlngs)/10000).toFixed(2); }catch(e){}
    return +polyAreaHa(coords).toFixed(2);
  }

  function placePoint(e){
    const type=placingType; const n=ST.equipment.filter(x=>x.type===type).length+1;
    const nm=(EQ_NAMES[type]||{});
    const eq={id:uid(type),type,name:(nm[lang()]||nm.fr||type)+' '+String(n).padStart(2,'0'),lat:e.latlng.lat,lng:e.latlng.lng,props:{}};
    if(type==='probe') eq.props.depths_cm=[20,40,60];
    if(type==='pump') eq.props.flow_m3h=40;
    if(type==='well') eq.props.depth_m=60;
    ST.equipment.push(eq); addEqMarker(eq); select({kind:'equipment',id:eq.id}); emit('change');
    selectTool('select');
  }

  /* ---- calques ---- */
  function addParcelLayer(p){
    const color=cropColor(p.crop);
    const layer=L.polygon(p.coords,{color,weight:2,fillColor:color,fillOpacity:.28}).addTo(drawn);
    layer.bindTooltip(p.name,{permanent:true,direction:'center',className:'plabel'});
    layer.on('click',()=>select({kind:'parcel',id:p.id}));
    layerIndex[p.id]=layer;
  }
  function addPivotLayer(p){
    const color=cropColor(p.crop);
    const grp=L.featureGroup().addTo(drawn);
    L.circle([p.pivot.lat,p.pivot.lng],{radius:p.pivot.radius,color,weight:2,dashArray:'5 5',fillColor:color,fillOpacity:.14}).addTo(grp);
    L.circleMarker([p.pivot.lat,p.pivot.lng],{radius:4,color,fillColor:color,fillOpacity:1}).addTo(grp);
    grp.bindTooltip(p.name,{permanent:true,direction:'center',className:'plabel'});
    grp.on('click',()=>select({kind:'parcel',id:p.id}));
    layerIndex[p.id]=grp;
  }
  function addEqMarker(eq){
    const bg=EQ_COLORS[eq.type]||'#8a97ad';
    const html='<div class="eqpin" style="background:'+bg+';border-radius:50% 50% 50% 0;transform:rotate(45deg)">'
      +'<div style="transform:rotate(-45deg)">'+svg(eq.type)+'</div></div>';
    const m=L.marker([eq.lat,eq.lng],{icon:L.divIcon({html,className:'',iconSize:[30,38],iconAnchor:[15,36]}),draggable:true}).addTo(drawn);
    m.bindTooltip(eq.name);
    m.on('click',()=>select({kind:'equipment',id:eq.id}));
    m.on('dragend',()=>{const ll=m.getLatLng();eq.lat=ll.lat;eq.lng=ll.lng;emit('change');});
    layerIndex[eq.id]=m;
  }
  function rebuild(){
    drawn.clearLayers(); for(const k in layerIndex) delete layerIndex[k];
    ST.parcels.forEach(p=>p.pivot?addPivotLayer(p):addParcelLayer(p));
    ST.equipment.forEach(addEqMarker);
  }

  /* ---- panneau / inspecteur ---- */
  let insTab='fiche';
  function itemOf(sel){ if(!sel)return null;
    return (sel.kind==='parcel'?ST.parcels:ST.equipment).find(x=>x.id===sel.id)||null; }
  function select(sel){ selection=sel; renderPanel(); emit('select', sel?{...sel,item:itemOf(sel)}:null); }
  function renderPanel(){
    if(!showPanel) return;
    if(!selection){ panel.innerHTML='<div class="muted">'+T('empty_sel')+'</div>'
      +'<ul class="agrimap-list">'+ST.parcels.map(p=>'<li data-p="'+p.id+'">▪ '+esc(p.name)+' · '+(p.area_ha||0)+' ha</li>').join('')+'</ul>'
      +'<div class="muted">'+ST.parcels.length+' '+T('parcels')+' · '+ST.equipment.length+' '+T('equipment')+'</div>';
      panel.querySelectorAll('[data-p]').forEach(li=>li.onclick=()=>select({kind:'parcel',id:li.dataset.p}));
      return;
    }
    if(selection.kind==='parcel'){
      const p=ST.parcels.find(x=>x.id===selection.id); if(!p){selection=null;return renderPanel();}
      panel.innerHTML=`<h3>${esc(p.name)}</h3><div class="muted">${p.area_ha||0} ha · ${p.shape}</div>
        <div class="agrimap-tabs">
          <button data-t="fiche" class="${insTab==='fiche'?'on':''}">${T('tab_fiche')}</button>
          <button data-t="bilan" class="${insTab==='bilan'?'on':''}">${T('tab_bilan')}</button>
        </div>
        <div id="agtab"></div>`;
      panel.querySelectorAll('.agrimap-tabs button').forEach(b=>b.onclick=()=>{insTab=b.dataset.t;renderPanel();});
      const tab=panel.querySelector('#agtab');
      if(insTab==='fiche'){
        tab.innerHTML=`
          <div class="agrimap-field"><label>${T('p_name')}</label><input id="fn" value="${esc(p.name)}"></div>
          <div class="agrimap-field"><label>${T('p_crop')}</label><select id="fc">${cropOptions(p.crop)}</select></div>
          <div class="agrimap-field"><label>${T('p_soil')}</label><input id="fs" value="${esc(p.soil||'')}"></div>
          <div class="agrimap-field"><label>${T('p_area')} (ha)</label><input id="fa" value="${p.area_ha||0}" readonly></div>
          <button class="agrimap-del" id="fdel">🗑 ${T('p_delete')}</button>`;
        tab.querySelector('#fn').oninput=e=>{p.name=e.target.value; const l=layerIndex[p.id]; if(l&&l.setTooltipContent)l.setTooltipContent(p.name); emit('change');};
        tab.querySelector('#fc').onchange=e=>{p.crop=e.target.value; recolor(p); emit('change');};
        tab.querySelector('#fs').oninput=e=>{p.soil=e.target.value; emit('change');};
        tab.querySelector('#fdel').onclick=()=>{ removeParcel(p.id); };
      } else {
        tab.innerHTML=`<div class="muted">Bilan hydrique, indices et pilotage : branchés par le module hôte (M4/M5).</div>`;
      }
    } else {
      const eq=ST.equipment.find(x=>x.id===selection.id); if(!eq){selection=null;return renderPanel();}
      panel.innerHTML=`<h3>${esc(eq.name)}</h3><div class="muted">${eq.type} · ${eq.lat.toFixed(4)}, ${eq.lng.toFixed(4)}</div>
        <div class="agrimap-field"><label>${T('p_name')}</label><input id="en" value="${esc(eq.name)}"></div>
        <button class="agrimap-del" id="edel">🗑 ${T('p_delete')}</button>`;
      panel.querySelector('#en').oninput=e=>{eq.name=e.target.value;const l=layerIndex[eq.id];if(l&&l.setTooltipContent)l.setTooltipContent(eq.name);emit('change');};
      panel.querySelector('#edel').onclick=()=>{ removeEq(eq.id); };
    }
  }
  function recolor(p){ const l=layerIndex[p.id]; const color=cropColor(p.crop);
    if(!l)return; if(p.pivot){l.eachLayer(x=>x.setStyle&&x.setStyle({color,fillColor:color}));} else l.setStyle({color,fillColor:color}); }
  function removeParcel(id){ const l=layerIndex[id]; if(l)drawn.removeLayer(l); delete layerIndex[id];
    ST.parcels=ST.parcels.filter(x=>x.id!==id); selection=null; renderPanel(); emit('change'); }
  function removeEq(id){ const l=layerIndex[id]; if(l)drawn.removeLayer(l); delete layerIndex[id];
    ST.equipment=ST.equipment.filter(x=>x.id!==id); selection=null; renderPanel(); emit('change'); }

  /* ---- events ---- */
  function emit(ev,data){ (listeners[ev]||[]).forEach(f=>{try{f(data!==undefined?data:snapshot());}catch(e){console.error(e);}}); }
  function snapshot(){ return exportProject(); }

  /* ---- import / export ---- */
  function exportProject(){
    const c=map.getCenter();
    return { format:'agrimanager-irrigation', version:1, exportedAt:new Date().toISOString(),
      name:ST.name, center:[c.lat,c.lng], zoom:map.getZoom(),
      parcels:ST.parcels.map(p=>({...p})), equipment:ST.equipment.map(e=>({...e})), planning:[] };
  }
  function parcelToFeature(p){
    let ring;
    if(p.pivot){ // approx cercle -> polygone 32 pts
      ring=[]; const R=6378137, la=p.pivot.lat*Math.PI/180;
      for(let i=0;i<=32;i++){ const th=i/32*2*Math.PI;
        const dLat=(p.pivot.radius*Math.cos(th))/R*180/Math.PI;
        const dLng=(p.pivot.radius*Math.sin(th))/(R*Math.cos(la))*180/Math.PI;
        ring.push([p.pivot.lng+dLng, p.pivot.lat+dLat]); }
    } else { ring=p.coords.map(c=>[c[1],c[0]]); ring.push(ring[0]); }
    return { type:'Feature', properties:{ name:p.name, crop:p.crop, soil:p.soil, shape:p.shape, area_ha:p.area_ha },
             geometry:{ type:'Polygon', coordinates:[ring] } };
  }
  function exportGeoJSON(){
    return { type:'FeatureCollection', name:ST.name,
      crs:{type:'name',properties:{name:'urn:ogc:def:crs:OGC:1.3:CRS84'}},
      features:ST.parcels.map(parcelToFeature) };
  }
  function importGeoJSON(fc){
    if(!fc||!fc.features)return 0; let n=0;
    fc.features.forEach(f=>{
      if(!f.geometry||f.geometry.type!=='Polygon')return;
      const ring=f.geometry.coordinates[0].map(c=>[c[1],c[0]]); // lat,lng
      if(ring.length>1 && ring[0][0]===ring[ring.length-1][0] && ring[0][1]===ring[ring.length-1][1]) ring.pop();
      const pr=f.properties||{};
      const p={id:uid('P'),name:pr.name||('Parcelle '+(ST.parcels.length+1)),crop:pr.crop||'olivier',
        soil:pr.soil||'',shape:pr.shape||'polygon',area_ha:pr.area_ha||+polyAreaHa(ring).toFixed(2),
        coords:ring,center:centroid(ring)};
      ST.parcels.push(p); addParcelLayer(p); n++;
    });
    if(n){ fitAll(); emit('change'); }
    return n;
  }
  function load(proj){
    if(!proj)return;
    ST.name=proj.name||ST.name;
    ST.parcels=(proj.parcels||[]).map(p=>({...p}));
    ST.equipment=(proj.equipment||[]).map(e=>({...e}));
    if(proj.center)map.setView(proj.center,proj.zoom||map.getZoom());
    rebuild(); fitAll(); selection=null; renderPanel();
  }
  function fitAll(){ if(drawn.getLayers().length){ try{ map.fitBounds(drawn.getBounds().pad(0.2)); }catch(e){} } }

  /* ---- CSV (tabulaire) : parcelles + géométrie WKT (réimportable) ---- */
  function csvCell(v){ v=String(v==null?'':v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
  function wktOf(p){ // réutilise parcelToFeature (pivot -> anneau, ring fermé en [lng,lat])
    const ring=parcelToFeature(p).geometry.coordinates[0];
    return 'POLYGON(('+ring.map(c=>(+c[0]).toFixed(6)+' '+(+c[1]).toFixed(6)).join(', ')+'))';
  }
  function exportCSV(){
    const head=['name','crop','soil','shape','area_ha','radius_m','wkt'];
    const rows=ST.parcels.map(p=>[p.name,p.crop,p.soil||'',p.shape||'polygon',
      p.area_ha||'',(p.pivot?p.pivot.radius:''),wktOf(p)].map(csvCell).join(','));
    return head.join(',')+'\n'+rows.join('\n')+'\n';
  }
  function parseCSV(text){
    const rows=[]; let row=[],cur='',q=false;
    for(let i=0;i<text.length;i++){ const ch=text[i];
      if(q){ if(ch==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=ch; }
      else if(ch==='"') q=true;
      else if(ch===',') { row.push(cur); cur=''; }
      else if(ch==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
      else if(ch!=='\r') cur+=ch;
    }
    if(cur!==''||row.length){ row.push(cur); rows.push(row); }
    return rows.filter(r=>r.length && r.some(c=>c!==''));
  }
  function importCSV(text){
    const rows=parseCSV(text); if(rows.length<2)return 0;
    const head=rows[0].map(h=>h.trim().toLowerCase()), ix=n=>head.indexOf(n);
    const iN=ix('name'),iC=ix('crop'),iS=ix('soil'),iSh=ix('shape'),iA=ix('area_ha'),iW=ix('wkt');
    if(iW<0)return 0;
    const feats=[];
    for(let r=1;r<rows.length;r++){ const c=rows[r];
      const m=/POLYGON\s*\(\(([^)]+)\)\)/i.exec(c[iW]||''); if(!m)continue;
      const ring=m[1].split(',').map(pr=>{ const s=pr.trim().split(/\s+/).map(Number); return [s[0],s[1]]; });
      feats.push({ type:'Feature',
        properties:{ name:iN>=0?c[iN]:'', crop:iC>=0?c[iC]:'', soil:iS>=0?c[iS]:'',
          shape:iSh>=0?(c[iSh]||'polygon'):'polygon', area_ha:iA>=0?(+c[iA]||0):0 },
        geometry:{ type:'Polygon', coordinates:[ring] } });
    }
    return importGeoJSON({ type:'FeatureCollection', features:feats });
  }

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  /* ---- init ---- */
  renderBar(); renderBase(); renderPanel();
  setTimeout(()=>map.invalidateSize(),60);

  return {
    map, state:ST,
    on(ev,fn){ (listeners[ev]=listeners[ev]||[]).push(fn); return this; },
    selectTool, load, export:exportProject, exportGeoJSON, importGeoJSON, exportCSV, importCSV,
    setLang(){ renderBar(); renderBase(); renderPanel(); },
    setName(n){ ST.name=n; },
    fitAll, invalidate(){ map.invalidateSize(); }
  };
}

global.AgriMap = { create, TOOLS, L10N };
})(window);
