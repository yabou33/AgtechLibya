# 🌱 Plateforme AgriTech Libye · EU4Skills

Plateforme éducative regroupant toutes les applications AgriTech (télédétection, IoT, capteurs
sol, stations météo, irrigation, IA, gestion de ferme) en **une seule interface trilingue**
(العربية · English · Français), avec base de données, gestion des profils et import/export universel.

📐 **Architecture complète** : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Lancer sur votre PC (mode serveur complet) — Python

Prérequis : **Python ≥ 3.10** (vous avez 3.14). `sqlite3` est inclus dans Python.

```bash
cd platform
pip install -r requirements.txt     # 1re fois : installe Flask
python server.py                    # démarre le serveur
```
Ouvrir **http://localhost:8000**. La base et le compte admin sont créés automatiquement.

Compte admin par défaut : `admin@agritech.ly` — mot de passe `ChangeMe!2026`
➡ **À changer** (variable `ADMIN_PASS` dans `server.py`, ou via l'admin une fois connecté).

## Héberger (voir `docs/DEPLOY.md` pour le détail pas à pas)

- **GitHub Pages (démo statique, gratuit)** — publier le dossier `public/`.
  L'app ne trouve pas `/api` et bascule en **mode local** (localStorage + import/export).
  Pas de comptes ni de base partagée, mais tous les modules et le dessin de parcelles fonctionnent.
- **Plateforme complète (Python)** — GitHub Pages ne fait pas tourner Python. On connecte le
  repo GitHub à **Render.com** (offre gratuite) qui lit `render.yaml` et lance le serveur.
  Déploiement automatique à chaque `git push`. Comptes, 4 rôles, base partagée.

---

## Profils

| Profil | Accès |
|---|---|
| **Administrateur** | Gestion des utilisateurs, config, audit, tout |
| **Professeur** | Classes, TP, suivi des rendus, tous les modules |
| **Étudiant** | Modules assignés, bac à sable, rendu de TP |
| **Agriculteur** | Son exploitation, irrigation, import/export |

Chaque utilisateur saisit **ses propres identifiants API** (Sentinel Hub `clientId`/`secret`,
clé météo) dans son profil. En mode serveur, le secret reste côté serveur (proxy `api/sh_token.php`).

## Import / Export

Tout ce qui est dessiné ou calculé est exportable **et** réimportable. Exemples de format
dans [`samples/`](samples/) : parcelles GeoJSON, projet JSON, séries NDVI CSV, capteurs sol JSON,
station météo CSV.

## Structure

```
platform/
├── server.py        # serveur Flask (API + statique + proxy Sentinel)
├── requirements.txt # Flask, gunicorn
├── render.yaml      # déploiement Render.com (GitHub → cloud)
├── public/          # frontend (shell + apps modules + assets partagés)
│   ├── index.html   # portail / shell trilingue
│   ├── apps/        # apps modules intégrées (à venir)
│   └── assets/      # css · js (store, carto) · i18n
├── db/              # schema.sql (versionné) + agritech.db (ignoré .gitignore)
├── samples/         # exemples d'import/export
└── docs/            # ARCHITECTURE.md · DEPLOY.md · guides EN/AR (à venir)
```
