# AgriTech Libya — Plateforme éducative · Blueprint d'architecture

**Programme** : EU4Skills / Skills4EU — *Smart Agriculture & Water Management* (Expertise France – Libye)
**But** : regrouper toutes les apps HTML (télédétection, IoT, capteurs sol, stations météo, irrigation, IA, gestion de ferme) en **une seule plateforme** trilingue (AR / EN / FR), avec base de données, gestion des profils, et import/export universel.

---

## 1. Décisions actées

| Sujet | Décision |
|---|---|
| **Backend** | Python (Flask) + SQLite — Python déjà installé sur le poste ; PHP absent. Versionnable GitHub, déployable Render |
| **Consolidation** | Shell commun + apps existantes en modules (on préserve le travail) |
| **Moteur de dessin** | Extrait de `J3/pilotage-irrigation.html` → module partagé, réutilisé par **toutes** les apps |
| **Langues** | Arabe · Anglais · Français (RTL géré pour l'arabe) |
| **Import/Export** | Universel : parcelles, NDVI, capteurs, météo, projets — toujours avec exemples de format |
| **Profils** | admin · professeur · étudiant · agriculteur |
| **Exécution** | Double mode : PC local (PHP) + GitHub (statique) |
| **Documentation** | EN + AR avec captures d'écran |

---

## 2. Double mode d'exécution (important)

GitHub **Pages** ne fait tourner que du statique (pas de Python). La plateforme fonctionne donc de deux façons, décidées automatiquement par le frontend (`/api/ping` répond → mode serveur ; sinon → mode local) :

| | **Mode serveur** | **Mode statique** |
|---|---|---|
| Où | PC local (`python server.py`), Render, VPS | GitHub Pages, `file://`, clé USB |
| Données | SQLite partagée (`db/agritech.db`) | localStorage + fichiers import/export |
| Comptes / rôles | Oui (login, 4 profils) | Non (usage libre, données locales) |
| Usage | Formation réelle, multi-utilisateurs, notes | Démo publique, TP hors-ligne |

Le même code frontend sert les deux. Les apps écrivent via une couche `store.js` : `store.saveProject(p)` → POST `/api/projects` en mode serveur, ou `localStorage` en mode statique.

### Lancer en local
```bash
cd platform
pip install -r requirements.txt   # 1re fois : Flask
python server.py                  # http://localhost:8000 (base + admin créés auto)
```

### Héberger (détail : docs/DEPLOY.md)
- **Pages (démo statique, gratuit)** : publier `platform/public` → l'app tourne en mode local automatiquement.
- **Complet (Python)** : brancher le repo GitHub sur **Render.com** (lit `render.yaml`) → déploiement auto. `db/agritech.db` ignoré par `.gitignore`.

---

## 3. Modules pédagogiques (M1–M9 + passerelle géologie)

| Code | Module | App existante réutilisée | État |
|---|---|---|---|
| **M1** | Introduction Smart Agriculture | `J2/Simulateur_Smart_Agriculture.html` | à intégrer |
| **M2** | Télédétection & indices | `agrimap.html`, `agrisim_live.html`, `tp_remotesensing_geology.html` | ✅ riche |
| **M3** | IoT — capteurs sol & réseaux | *(à créer)* + données `J4/DataJ4` | à créer |
| **M4** | Stations météo, ET₀ & bilan hydrique | `hydrosim.html` (partiel) + CSV logger | à créer/adapter |
| **M5** | Irrigation intelligente & pilotage | `J3/pilotage-irrigation.html` | ✅ canonique |
| **M6** | FMIS — gestion d'exploitation | `J4/agrimanager-v1.6.html` | ✅ riche |
| **M7** | IA en agriculture | *(à créer)* | à créer |
| **M8** | Analyse des écarts | *(atelier)* | à créer |
| **M9** | Plan d'action curriculaire | *(atelier)* | à créer |
| **G0** | Passerelle Géologie × Hydrogéologie | `agri_geology_live.html` | ✅ |

---

## 4. Profils & permissions

| Capacité | admin | professeur | étudiant | agriculteur |
|---|:--:|:--:|:--:|:--:|
| Gérer les utilisateurs | ✅ | — | — | — |
| Config système / audit | ✅ | — | — | — |
| Créer classes & TP | ✅ | ✅ | — | — |
| Voir tous les rendus | ✅ | ✅ (ses classes) | — | — |
| Accéder aux modules M1–M9 | ✅ | ✅ | ✅ (assignés) | ✅ (M2,M4,M5,M6) |
| Créer parcelles/projets | ✅ | ✅ | ✅ (bac à sable) | ✅ (son exploitation) |
| Import / Export | ✅ | ✅ | ✅ | ✅ |
| Rendre un TP | — | — | ✅ | — |
| Piloter irrigation réelle | ✅ | ✅ | démo | ✅ |

*Rangs (`roles.rank`)* : admin 100 · professeur 60 · étudiant 30 · agriculteur 20.

---

## 5. Moteur cartographique partagé (`assets/js/agrimap-draw.js`)

Extrait du fichier canonique. Standard imposé à **toutes** les apps.

**Barre d'outils verticale (gauche)** : Sélection · Parcelle (polygone) · Pivot (cercle) · Rectangle · Marqueur · Sonde · Vanne · Station météo · Forage/puits.
**Header** : nom du projet · switch **FR / ع / EN** · **Importer** · **Exporter**.
**Panneau droit** : onglets contextuels (Bilan · Équip. · Sondes · Fiche) à la sélection d'une parcelle.
**Interactions** : clic = sommet, double-clic/Entrée = fermer, Échap = annuler ; pivot = 1 clic centre + rayon à la souris + clic valider.
**Fonds** : Plan (OSM) / Satellite (Esri World Imagery).
**Persistance** : `store.js` (serveur ou localStorage).

API cible :
```js
const map = AgriMap.create('#map', { tools:['select','parcel','pivot','rect','marker','probe','valve','weather','well'],
                                     lang:'fr', basemap:'sat' });
map.on('parcel:created', p => store.saveParcel(p));
map.load(projectJSON);              // hydrate parcelles + équipements
const json = map.export();          // format 'agrimanager-irrigation' v1
```

---

## 6. Formats d'import / export (avec exemples → `platform/samples/`)

Chaque app affiche un bouton **« Format ? »** montrant un exemple copiable.

| Donnée | Format | Fichier exemple |
|---|---|---|
| Parcelles | **GeoJSON** FeatureCollection (Polygon, CRS84 lon,lat) | `samples/parcelles.geojson` |
| Projet complet | **JSON** `agrimanager-irrigation` v1 (parcelles+équip+planning) | `samples/projet.json` |
| Séries d'indices (NDVI…) | **CSV** `parcel,index,date,mean,min,max,std,p10,p50,p90` | `samples/ndvi_serie.csv` |
| Capteurs sol | **JSON** `{local_time,site_name,site_id,probe_id,probe_measure,soil_value,unit}` | `samples/capteurs_sol.json` |
| Station météo | **CSV** logger `Date/Heure,A1-WS1,A1-HR1,A1-T1,A1-R1,A1-B…` | `samples/meteo_station.csv` |

Règle produit : **tout ce qui est dessiné ou calculé est exportable ET réimportable**, sans perte.

---

## 7. Base de données

Voir `db/schema.sql`. Tables clés : `users`, `roles`, `classes`, `enrollments`, `modules`,
`farms`, `projects`, `parcels`, `equipment`, `sensor_sites`/`sensor_readings`,
`weather_stations`/`weather_readings`, `index_series`, `assignments`/`submissions`, `audit_log`.

---

## 8. Idées de fonctionnalités (enrichissement)

**Transversal**
- Bibliothèque de **parcelles/projets démo** partagés par le prof (templates de TP).
- Comparateur multi-parcelles (sparklines) — déjà amorcé dans `agrisim_live`.
- Mode hors-ligne complet (PWA) pour les visites terrain (Zaghouan, Mornag).
- Journal de transfert « comment j'enseignerais ça » (rituel quotidien du programme).

**M2 Télédétection** — export raster NDVI (PNG géoréférencé) + série temporelle CSV ; détection d'anomalie (cas B-14).
**M3 IoT** — lecteur de courbes de sonde (pics d'irrigation, drainage, seuil de recharge) ; calculateur CAPEX/OPEX réseau (LoRaWAN/GSM) ; fiche mini-labo IoT budgété.
**M4 Météo** — calcul **ET₀ FAO-56 Penman-Monteith** pas à pas ; bilan hydrique décadaire ; GDD + risque maladie **TomCast DSV**.
**M5 Irrigation** — planning d'irrigation + re-planification sous contrainte (« forage plafonné en juillet ») ; RDI (déficit contrôlé).
**M6 FMIS** — coût de production par parcelle ; registre des forages comme actif ; traçabilité de lots ; **AgriScore**.
**M7 IA** — détection de maladies par vision (démo) ; prédiction de rendement ; classification d'occupation du sol ; « limites honnêtes » enseignées comme contenu.
**Éval** — QCM pré/post-test (déjà en `.docx`), suivi M&E, export des notes.

---

## 9. Documentation (livrable EN + AR, avec captures)

- `docs/USER_GUIDE_EN.md` / `docs/USER_GUIDE_AR.md` — guide par profil + par module, captures d'écran (`docs/img/`).
- `docs/INSTALL.md` — lancer en local + héberger (GitHub Pages & serveur PHP).
- Glossaire trilingue (exigence programme : « trilingual glossary »).
- Les captures seront prises une fois chaque module intégré.

---

## 10. Feuille de route

1. **Fondation** *(en cours)* — schéma DB, shell trilingue, moteur carto partagé, `store.js` double-mode, exemples import/export.
2. **Auth & profils** — login PHP, 4 rôles, tableaux de bord par profil.
3. **Intégration modules** — M2, M5, M6 (déjà riches) → puis M1, M3, M4, M7.
4. **Pédagogie** — classes, TP, rendus, notes, QCM.
5. **Documentation EN/AR + captures**, PWA hors-ligne, déploiement.
