# 🚀 Guide de Démarrage Rapide

> **Objectif** : Faire tourner le projet complet (API + Dashboard + App Mobile) en moins de 10 minutes.

---

## 📋 Prérequis

Installer sur ton ordinateur :

| Outil | Lien | Version min |
|-------|------|-------------|
| **Node.js** | https://nodejs.org | >= 20 |
| **npm** | Inclus avec Node.js | >= 10 |
| **Git** | https://git-scm.com | Dernière version |

Sur ton **téléphone** :
| Outil | Lien |
|-------|------|
| **Expo Go** | 📱 Chercher "Expo Go" sur App Store ou Play Store |

Vérifier l'installation :
```bash
node --version    # v20.x.x ou plus
npm --version     # 10.x.x ou plus
```

---

## 🏁 Étape 1 — Cloner le projet

```bash
git clone https://github.com/TON_UTILISATEUR/shop-attendance.git
cd shop-attendance
```

---

## 📱 Étape 2 — Lancer l'App Mobile (Tablette)

C'est la partie la plus simple — l'API est déjà en ligne sur Render.

```bash
cd apps/tablet-app

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm start
```

Dans ton terminal, tu verras :
```
📡 Detected local IP: 192.168.X.X
```

**Scanne le QR code** qui s'affiche avec **Expo Go** sur ton téléphone.

> ⚠️ **Ton téléphone et ton ordinateur doivent être sur le même WiFi.**

### Configurer la tablette
1. L'app s'ouvre → clique **"Configurer cette tablette"**
2. Renseigne :
   - **Shop ID** : l'ID de ton shop (ex: `shop-001`)
   - **Device ID** : un identifiant unique (ex: `tablet-01`)
   - **Device Name** : le nom de la tablette (ex: `Bureau Principal`)
3. Clique **"Enregistrer"**
4. Retour à l'accueil → clique **"Commencer le pointage"**

---

## 🖥️ Étape 3 — Lancer le Dashboard Admin

Ouvre un **nouveau terminal** (garde le terminal de la tablette ouvert) :

```bash
cd apps/admin-dashboard

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev
```

Ouvre **http://localhost:3000** dans ton navigateur.

### Se connecter
| Champ | Valeur |
|-------|--------|
| Email | `admin@shopattendance.local` |
| Mot de passe | `Admin123!` |

---

## 🔧 Étape 4 — (Optionnel) Lancer l'API en local

> L'API est déjà en ligne sur Render, mais si tu veux modifier le backend, voici comment la lancer en local.

### 4.1 — Créer une base PostgreSQL

**Option A — Neon (recommandé, gratuit)** :
1. Créer un compte sur https://console.neon.tech
2. Créer un projet
3. Copier le **Connection string**

**Option B — Docker (local)** :
```bash
docker compose up -d
```

### 4.2 — Configurer l'API

```bash
cd apps/api

# Créer le fichier .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/shopattendance?schema=public
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
API_PORT=3001
CORS_ORIGIN=http://localhost:3000
EOF

# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate deploy

# Peupler les données de test (optionnel)
npx ts-node prisma/seed.ts
```

### 4.3 — Lancer l'API

```bash
npm run start:dev
```

L'API tourne sur **http://localhost:3001**

### 4.4 — Tester

```bash
# Vérifier que l'API répond
curl http://localhost:3001/docs

# Tester la connexion
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@shopattendance.local", "password": "Admin123!"}'
```

---

## 🔄 Résumé des commandes

### Tout lancer en local

```bash
# Terminal 1 — API (optionnel si tu utilises la prod)
cd apps/api && npm run start:dev

# Terminal 2 — Dashboard
cd apps/admin-dashboard && npm run dev

# Terminal 3 — App Mobile
cd apps/tablet-app && npm start
```

### Commandes utiles

```bash
# Build pour production
npm run build:api          # Build l'API
npm run build:dashboard    # Build le Dashboard

# Base de données
npm run db:migrate         # Appliquer les migrations
npm run db:seed            # Peupler les données de test
npm run db:studio          # Ouvrir Prisma Studio (GUI)

# Vérifier les erreurs TypeScript
cd apps/api && npx tsc --noEmit
cd apps/admin-dashboard && npx tsc --noEmit
cd apps/tablet-app && npx tsc --noEmit
```

---

## 🌐 URLs Importantes

| Service | URL |
|---------|-----|
| **API (prod)** | https://shop-attendance-api.onrender.com |
| **Swagger (docs API)** | https://shop-attendance-api.onrender.com/docs |
| **Dashboard (prod)** | https://shop-attendance-dashboard.onrender.com |
| **Dashboard (local)** | http://localhost:3000 |
| **API (local)** | http://localhost:3001 |

---

## 🐛 Dépannage

### "Cannot find native module" / "Something went wrong"
```bash
cd apps/tablet-app
rm -rf node_modules package-lock.json
npm install
npx expo start --clear
```

### Le QR code ne marche pas
- Vérifie que le téléphone et l'ordinateur sont sur le **même WiFi**
- Regarde l'IP affichée dans le terminal (`📡 Detected local IP: X.X.X.X`)
- Assure-toi qu'aucun pare-feu ne bloque le port 8081

### Le Dashboard ne trouve pas l'API
Vérifie le fichier `.env` du dashboard :
```bash
# apps/admin-dashboard/.env
NEXT_PUBLIC_API_URL=http://localhost:3001  # pour le local
# ou
NEXT_PUBLIC_API_URL=https://shop-attendance-api.onrender.com  # pour la prod
```

### La base de données ne répond pas
Vérifie le format de `DATABASE_URL` dans `apps/api/.env` :
```
postgresql://user:password@host:5432/dbname?schema=public
```

### L'app tablette affiche "Tablette non configurée"
C'est normal ! Va dans **Paramètres** (⚙️) sur l'écran d'accueil pour configurer le shop et l'appareil.

---

## 📱 Comptes de Test

| Rôle | Identifiant | Mot de passe / PIN |
|------|-------------|-------------------|
| Admin (Dashboard) | `admin@shopattendance.local` | `Admin123!` |
| Travailleur (Tablette) | Matricule (ex: `EMP-1000`) | PIN `1234` |

---

## 📚 Pour aller plus loin

- **[README.md](./README.md)** — Architecture complète du projet
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Guide de déploiement sur Render + Neon
- **Swagger** — Documentation interactive de l'API

---

*Besoin d'aide ? Tout est documenté. Si un truc ne marche pas, vérifie les logs dans ton terminal ou les logs sur Render Dashboard.*
