# Déploiement — GitHub & hébergement

**Question clé : « Est-ce que je peux tout déployer facilement sur GitHub ? »**

Réponse honnête en deux temps :

| | Le **code** sur GitHub | Le **site qui tourne** |
|---|---|---|
| **GitHub (repo)** | ✅ Oui — tout le code, gratuit | — |
| **GitHub Pages** | — | ⚠️ **Statique seulement** — le frontend tourne (modules, dessin, import/export) mais **sans comptes/rôles/base** (Pages n'exécute pas Python) |
| **Render.com** (gratuit) | ✅ déploie depuis le repo GitHub | ✅ **Plateforme complète** (Python + comptes + 4 rôles + base partagée) |

Autrement dit : le repo GitHub héberge le code ; pour la version **complète** qui tourne en ligne,
on branche ce repo sur Render (gratuit) qui lance le serveur Python. Les deux se mettent à jour
tout seuls à chaque `git push`.

---

## Option A — Démo statique sur GitHub Pages (5 min, gratuit)

Publie uniquement le frontend. Idéal pour montrer la plateforme, TP hors-ligne, visites terrain.
Pas de comptes : chaque visiteur travaille en local (localStorage + import/export).

```bash
cd C:/Users/yasse/source/repos/AgTechLybia
git init && git add . && git commit -m "Plateforme AgriTech Libye"
git branch -M main
git remote add origin https://github.com/<vous>/AgTechLybia.git
git push -u origin main
```
Puis sur GitHub : **Settings → Pages → Source: Deploy from a branch → main → /(root)**.
L'URL sera `https://<vous>.github.io/AgTechLybia/platform/public/index.html`.

> Astuce : pour une URL plus propre, publier le contenu de `platform/public/` à la racine
> d'un repo dédié `agritech-demo`.

## Option B — Plateforme complète sur Render.com (10 min, gratuit)

Fait tourner Python → comptes, 4 rôles, base partagée, proxy Sentinel Hub par utilisateur.

1. Pousser le repo sur GitHub (comme ci-dessus).
2. Créer un compte sur **render.com** (connexion via GitHub).
3. **New → Blueprint** → sélectionner le repo. Render lit `platform/render.yaml` automatiquement.
4. Valider. Render installe Flask et lance `gunicorn server:app`. URL publique fournie.
5. Se connecter avec `admin@agritech.ly` / `ChangeMe!2026` puis **changer le mot de passe**.

> ⚠️ **Base de données** : sur l'offre gratuite Render, le disque est éphémère (la base SQLite
> peut être remise à zéro à chaque redéploiement). Pour de la production durable :
> - brancher un **disque persistant** Render (payant), **ou**
> - migrer vers **PostgreSQL** (Render offre une base gratuite) — le code SQL est quasi identique.
> Pour la formation / démo, l'éphémère suffit (on réimporte via les fichiers d'export).

## Alternatives d'hébergement Python (toutes déployables depuis GitHub)

| Hébergeur | Gratuit | Note |
|---|---|---|
| **Render.com** | ✅ | le plus simple avec `render.yaml` |
| **Railway.app** | crédit gratuit | déploiement Git direct |
| **PythonAnywhere** | ✅ | spécial Python, base persistante |
| **Fly.io** | ✅ (petit) | Docker |
| VPS (OVH, Hetzner) | — | contrôle total, `gunicorn` + nginx |

---

## Sécurité avant mise en ligne publique

- [ ] Changer le mot de passe admin.
- [ ] Définir `AGRI_SECRET` (clé de session) — déjà auto-générée par `render.yaml`.
- [ ] Ne jamais committer `db/agritech.db` (déjà dans `.gitignore` — contient les identifiants API).
- [ ] En production, chiffrer `sh_client_secret` au repos et servir en HTTPS (Render le fait).
