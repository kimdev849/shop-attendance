# 🚀 ShopAttendance — Guide Complet de Déploiement

> **Ce guide est conçu pour être donné à n'importe quel développeur.**
> En suivant ces étapes exactement, il pourra déployer tout le projet.

---

## 📋 Sommaire

1. [Prérequis](#1--prérequis)
2. [Structure du Projet](#2--structure-du-projet)
3. [Préparer le Code Localement](#3--préparer-le-code-localement)
4. [Créer le Repository GitHub](#4--créer-le-repository-github)
5. [Créer la Base de Données (Neon)](#5--créer-la-base-de-données-neon)
6. [Déployer l'API sur Render](#6--déployer-lapi-sur-render)
7. [Déployer le Frontend sur Render](#7--déployer-le-frontend-sur-render)
8. [Configurer les Variables d'Environnement](#8--configurer-les-variables-denvironnement)
9. [Vérifier le Déploiement](#9--vérifier-le-déploiement)
10. [Développement Local](#10--développement-local)
11. [Dépannage](#11--dépannage)

---

## 1. Prérequis

### Installer sur ton ordinateur

| Outil | Lien | Version |
|-------|------|---------|
| Node.js | https://nodejs.org | >= 20.0.0 |
| npm | Inclus avec Node.js | >= 10.0.0 |
| Git | https://git-scm.com | Dernière version |

### Vérifier l'installation

```bash
node --version    # Doit afficher v20.x.x ou plus
npm --version     # Doit afficher 10.x.x ou plus
git --version     # Doit afficher git version x.x.x
```

### Créer un compte sur chaque service

| Service | Lien | Pourquoi |
|---------|------|----------|
| GitHub | https://github.com | Héberger le code source |
| Render | https://render.com | Héberger l'API et le Frontend |
| Neon | https://neon.tech | Base de données PostgreSQL |

---

## 2. Structure du Projet

```
shop-attendance/
├── apps/
│   ├── api/                    ← Backend NestJS (→ Render)
│   │   ├── src/
│   │   │   ├── modules/        ← Modules métier (auth, workers, attendance...)
│   │   │   ├── common/         ← Guard, Decorators, Filters
│   │   │   └── prisma/         ← PrismaService
│   │   ├── prisma/             ← Schema Prisma + migrations
│   │   └── package.json
│   │
│   ├── admin-dashboard/        ← Frontend Next.js (→ Render)
│   │   ├── app/                ← Pages Next.js
│   │   ├── features/           ← Features métier (workers, attendance...)
│   │   ├── components/         ← Composants UI
│   │   ├── lib/                ← Utilitaires (api, auth, utils)
│   │   └── package.json
│   │
│   └── tablet-app/             ← App Expo (→ Expo Go / EAS)
│
├── packages/
│   ├── types/                  ← Types partagés
│   └── config/                 ← Configuration partagée
│
├── deploy.sh                   ← Script de préparation
├── render.yaml                 ← Config Render
├── DEPLOYMENT.md               ← Ce fichier
├── package.json                ← Root package.json (monorepo)
└── README.md
```

---

## 3. Préparer le Code Localement

### Étape 3.1 — Cloner le projet

```bash
git clone https://github.com/TON_UTILISATEUR/shop-attendance.git
cd shop-attendance
```

### Étape 3.2 — Installer les dépendances

```bash
npm install
```

### Étape 3.3 — Générer le client Prisma

```bash
cd apps/api
npx prisma generate
cd ../..
```

### Étape 3.4 — Build l'API

```bash
npm run build:api
```

**Résultat attendu :** Le dossier `apps/api/dist/` est créé.

```bash
ls apps/api/dist/
# main.js  app.module.js  modules/  common/  ...
```

### Étape 3.5 — Build le Frontend

```bash
npm run build:dashboard
```

**Résultat attendu :** Le dossier `apps/admin-dashboard/.next/` est créé.

```bash
ls apps/admin-dashboard/.next/
# server/  static/  build-manifest.json  ...
```

### Étape 3.6 — Préparer les fichiers de déploiement

```bash
chmod +x deploy.sh
./deploy.sh all
```

**Résultat attendu :**
- `.deploy/api/` → Fichiers prêts pour Render (API)
- `apps/admin-dashboard/packages/types/` → Types copiés (Frontend)

### Étape 3.7 — Vérifier zéro erreur

```bash
# Vérifier l'API
cd apps/api && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Doit afficher 0

# Vérifier le Frontend
cd apps/admin-dashboard && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Doit afficher 0
```

---

## 4. Créer le Repository GitHub

### Étape 4.1 — Créer le repository sur GitHub

1. Aller sur https://github.com/new
2. **Repository name** : `shop-attendance`
3. **Description** : `Plateforme de gestion de présence et ponctualité`
4. **Visibility** : Private (recommandé) ou Public
5. **DO PAS cocher** "Add a README file" (on en a déjà un)
6. Cliquer **Create repository**

### Étape 4.2 — Pousser le code

```bash
# depuis la racine du projet
git init
git add .
git commit -m "Initial commit: ShopAttendance monorepo"
git branch -M main
git remote add origin https://github.com/TON_UTILISATEUR/shop-attendance.git
git push -u origin main
```

> **Remplace** `TON_UTILISATEUR` par ton vrai nom d'utilisateur GitHub.

---

## 5. Créer la Base de Données (Neon)

### Étape 5.1 — Créer un compte Neon

1. Aller sur https://console.neon.tech
2. Cliquer **Sign Up** (ou Sign In si tu as déjà un compte)
3. Choisir **GitHub** pour s'inscrire (plus rapide)

### Étape 5.2 — Créer un projet

1. Cliquer **Create Project**
2. **Project name** : `shop-attendance`
3. **Database name** : `shopattendance`
4. Choisir la région la plus proche (ex: AWS Paris ou Frankfurt)
5. Cliquer **Create Project**

### Étape 5.3 — Récupérer le mot de passe

1. Une popup affiche le mot de passe — **le copier immédiatement**
2. Si tu l'as raté, aller dans **Dashboard** → **Connection Details**
3. Copier le **Connection string** au format :
   ```
   postgresql://neondb_owner:XXXXX@ep-xxx-xxx.us-east-2.aws.neon.tech/shopattendance?sslmode=require
   ```

### Étape 5.4 — Appliquer les migrations

```bash
# Utiliser le mot de passe récupéré
cd apps/api
DATABASE_URL="postgresql://neondb_owner:TON_MOT_DE_PASSE@ep-xxx-xxx.neon.tech/shopattendance?sslmode=require" \
  npx prisma migrate deploy
```

### Étape 5.5 — Peupler les données de test (optionnel)

```bash
cd apps/api
DATABASE_URL="postgresql://neondb_owner:TON_MOT_DE_PASSE@ep-xxx-xxx.neon.tech/shopattendance?sslmode=require" \
  npx ts-node prisma/seed.ts
```

---

## 6. Déployer l'API sur Render

### Étape 6.1 — Créer un compte Render

1. Aller sur https://render.com
2. Cliquer **Get Started for Free**
3. Choisir **Sign Up with GitHub**

### Étape 6.2 — Créer la base de données PostgreSQL sur Render

> **Note :** On utilise Neon comme base principale, mais Render a besoin d'une base pour la config.
> Si tu utilises Neon, tu peux skipper cette étape et directement utiliser le DATABASE_URL de Neon.

### Étape 6.3 — Créer le Web Service (API)

1. Aller sur https://dashboard.render.com
2. Cliquer **New +** → **Web Service**
3. **Connect a repository** → Choisir `shop-attendance`
4. Configurer :

| Champ | Valeur |
|-------|--------|
| **Name** | `shop-attendance-api` |
| **Region** | Frankfurt (ou la plus proche) |
| **Branch** | `main` |
| **Root Directory** | `.deploy/api` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `node dist/main` |
| **Node Version** | 20 |

5. Cliquer **Advanced** → **Add Environment Variable** pour chaque variable :

| Variable | Valeur |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Le Connection string de Neon (voir étape 5.3) |
| `JWT_SECRET` | Générer un secret (voir ci-dessous) |
| `JWT_REFRESH_SECRET` | Générer un autre secret |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `*` (on changera après le déploiement du frontend) |

6. Cliquer **Create Web Service**
7. Attendre le build (3-5 minutes)

### Étape 6.4 — Générer les secrets JWT

Pour générer un secret sécurisé, exécuter cette commande :

```bash
# Générer JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Générer JWT_REFRESH_SECRET (exécuter une 2ème fois)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Étape 6.5 — Vérifier l'API

1. Aller sur https://dashboard.render.com
2. Cliquer sur `shop-attendance-api`
3. Vérifier que le service est **Live** (vert)
4. Ouvrir l'URL : `https://shop-attendance-api.onrender.com/docs`
5. Swagger doit s'afficher avec toutes les routes

**URL de l'API** : `https://shop-attendance-api.onrender.com`

---

## 7. Déployer le Frontend sur Render

> **Note :** Render supporte les sites statiques et les apps Next.js.
> On va utiliser un **Static Site** ou un **Web Service** pour le frontend.

### Étape 7.1 — Configurer le Frontend pour Render

Le frontend Next.js doit être construit en mode standalone pour Render.

Dans `apps/admin-dashboard/next.config.js`, vérifier :

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

module.exports = nextConfig;
```

### Étape 7.2 — Créer le Web Service (Frontend)

1. Aller sur https://dashboard.render.com
2. Cliquer **New +** → **Web Service**
3. **Connect a repository** → Choisir `shop-attendance`
4. Configurer :

| Champ | Valeur |
|-------|--------|
| **Name** | `shop-attendance-dashboard` |
| **Region** | Frankfurt (ou la plus proche) |
| **Branch** | `main` |
| **Root Directory** | `apps/admin-dashboard` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Node Version** | 20 |

5. Cliquer **Advanced** → **Add Environment Variable** :

| Variable | Valeur |
|----------|--------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | `https://shop-attendance-api.onrender.com` |

6. Cliquer **Create Web Service**
7. Attendre le build (3-5 minutes)

### Étape 7.3 — Vérifier le Frontend

1. Aller sur https://dashboard.render.com
2. Cliquer sur `shop-attendance-dashboard`
3. Vérifier que le service est **Live** (vert)
4. Ouvrir l'URL : `https://shop-attendance-dashboard.onrender.com`
5. La page de login doit s'afficher

**URL du Frontend** : `https://shop-attendance-dashboard.onrender.com`

---

## 8. Configurer les Variables d'Environnement

### Étape 8.1 — Mettre à jour CORS_ORIGIN

Maintenant que le frontend est déployé, mettre à jour l'API :

1. Aller sur https://dashboard.render.com
2. Cliquer sur `shop-attendance-api`
3. Aller dans **Environment**
4. Modifier `CORS_ORIGIN` :
   ```
   https://shop-attendance-dashboard.onrender.com
   ```
5. Le service redéploye automatiquement

### Étape 8.2 — Résumé des Variables

#### API (Render)

| Variable | Valeur |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://neondb_owner:XXX@ep-xxx.neon.tech/shopattendance?sslmode=require` |
| `JWT_SECRET` | `abc123...` (généré à l'étape 6.4) |
| `JWT_REFRESH_SECRET` | `def456...` (généré à l'étape 6.4) |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://shop-attendance-dashboard.onrender.com` |

#### Frontend (Render)

| Variable | Valeur |
|----------|--------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | `https://shop-attendance-api.onrender.com` |

---

## 9. Vérifier le Déploiement

### Étape 9.1 — Tester l'API

```bash
# Health check
curl https://shop-attendance-api.onrender.com/docs
# Doit afficher Swagger UI

# Test login (avec les données du seed)
curl -X POST https://shop-attendance-api.onrender.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@shopattendance.local", "password": "Admin123!"}'
# Doit retourner un accessToken et un refreshToken
```

### Étape 9.2 — Tester le Frontend

1. Ouvrir `https://shop-attendance-dashboard.onrender.com`
2. Se connecter avec :
   - **Email** : `admin@shopattendance.local`
   - **Mot de passe** : `Admin123!`
3. Le dashboard doit s'afficher avec les stats

### Étape 9.3 — Vérifier la connexion Frontend ↔ API

1. Ouvrir les DevTools du navigateur (F2)
2. Aller dans l'onglet **Network**
3. Naviguer dans le dashboard
4. Les requêtes vers l'API doivent retourner 200 OK

---

## 10. Développement Local

### Lancer en local

```bash
# Terminal 1 : API
npm run dev:api

# Terminal 2 : Frontend
npm run dev:dashboard

# Terminal 3 (optionnel) : Tablet App
cd apps/tablet-app
npx expo start
```

### Variables d'environnement locales

Créer un fichier `.env` à la racine :

```env
# Base de données (peut utiliser Neon en dev)
DATABASE_URL=postgresql://neondb_owner:XXX@ep-xxx.neon.tech/shopattendance?sslmode=require

# JWT
JWT_SECRET=dev-secret-key
JWT_REFRESH_SECRET=dev-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# API
API_PORT=3001
CORS_ORIGIN=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Commandes utiles

```bash
# Build complet
npm run build:api
npm run build:dashboard

# Type check
cd apps/api && npx tsc --noEmit
cd apps/admin-dashboard && npx tsc --noEmit

# Prisma
cd apps/api && npx prisma generate
cd apps/api && npx prisma migrate dev
cd apps/api && npx prisma studio

# Tests
cd apps/api && npm test

# Lint
cd apps/admin-dashboard && npm run lint
```

---

## 11. Dépannage

### L'API ne démarre pas sur Render

**Symptôme** : Le service Render est en état "Build failed" ou "Crashed"

**Solution** :
```bash
# Vérifier les logs sur Render Dashboard → Logs
# Causes courantes :
# 1. DATABASE_URL invalide → Vérifier le format
# 2. Prisma non généré → Le Build Command doit inclure "npx prisma generate"
# 3. Secrets JWT manquants → Vérifier JWT_SECRET et JWT_REFRESH_SECRET
```

### Le Frontend ne trouve pas l'API

**Symptôme** : Erreurs CORS dans la console du navigateur

**Solution** :
```bash
# Vérifier que CORS_ORIGIN correspond exactement à l'URL du frontend
# Sur Render → API → Environment → CORS_ORIGIN
# Doit être : https://shop-attendance-dashboard.onrender.com
# (sans slash à la fin)
```

### Le build échoue avec des erreurs TypeScript

**Solution** :
```bash
# Locale, vérifier et corriger :
npx tsc --noEmit

# Si c'est un problème de types Prisma :
cd apps/api && npx prisma generate
npm run build:api
```

### La base de données n'est pas accessible

**Solution** :
```bash
# Vérifier le format de DATABASE_URL :
# Bon format :
postgresql://neondb_owner:PASSWORD@ep-xxx-xxx.region.aws.neon.tech/shopattendance?sslmode=require

# Mauvais formats :
# - manque ?sslmode=require
# - mot de passe contient des caractères spéciaux non encodés
# - host incorrect
```

### Le frontend affiche "Internal Server Error"

**Solution** :
```bash
# Vérifier les variables d'environnement sur Render
# NEXT_PUBLIC_API_URL doit être défini
# Le Build Command doit inclure "npm run build"
```

---

## 📌 Checklist de Déploiement

### Avant de pousser sur GitHub
- [ ] `npx tsc --noEmit` → 0 erreurs (API + Dashboard)
- [ ] `npm run build:api` → `dist/` créé
- [ ] `npm run build:dashboard` → `.next/` créé
- [ ] `./deploy.sh all` → Fichiers de déploiement créés

### GitHub
- [ ] Repository créé sur GitHub
- [ ] Code poussé avec `git push -u origin main`

### Neon (Base de données)
- [ ] Compte créé sur https://console.neon.tech
- [ ] Projet `shop-attendance` créé
- [ ] Connection string copiée
- [ ] Migrations appliquées (`npx prisma migrate deploy`)

### Render (API)
- [ ] Service `shop-attendance-api` créé
- [ ] Root Directory = `.deploy/api`
- [ ] Build Command = `npm install && npx prisma generate && npm run build`
- [ ] Start Command = `node dist/main`
- [ ] Toutes les variables d'environnement configurées
- [ ] Service status = **Live** (vert)
- [ ] Swagger accessible à `/docs`

### Render (Frontend)
- [ ] Service `shop-attendance-dashboard` créé
- [ ] Root Directory = `apps/admin-dashboard`
- [ ] Build Command = `npm install && npm run build`
- [ ] Start Command = `npm run start`
- [ ] `NEXT_PUBLIC_API_URL` configuré
- [ ] Service status = **Live** (vert)

### Vérification Finale
- [ ] Login fonctionne sur le frontend
- [ ] API répond aux requêtes
- [ ] CORS fonctionne (pas d'erreurs console)
- [ ] Données seedées visibles dans le dashboard

---

## 📞 Support

Si tu as un problème :
1. Vérifier les logs sur Render Dashboard → Logs
2. Vérifier les logs de build
3. Vérifier les variables d'environnement
4. Relire cette documentation

---

Je sais ça fais beaucoup si t'as un pb ne m'appele pas tout est écris ici . 
