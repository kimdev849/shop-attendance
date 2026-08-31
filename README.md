# 🏪 ShopAttendance

**Système de gestion de présence pour entreprises multi-sites.**

ShopAttendance permet aux entreprises de suivre les présences, retards et absences de leurs employés répartis dans plusieurs points de vente (shops), à l'aide de tablettes installées sur site.

---

## 🎯 À quoi ça sert ?

### Le problème

Une entreprise avec 10 boutiques veut savoir qui pointe à quelle heure, qui est en retard, qui est absent. Aujourd'hui, c'est fait à la main ou avec des systèmes obsolètes qui ne fonctionnent pas hors-ligne.

### La solution

Des **tablettes Android** placées à l'entrée de chaque shop permettent aux employés de **pointer en moins de 5 secondes** :
1. Chercher son nom sur l'écran
2. Entrer son code PIN
3. Regarder la caméra (vérification faciale)
4. C'est pointé ✅

L'**admin** suit tout en temps réel sur un **dashboard web** : présences, retards, absences, statistiques par shop.

---

## 🔄 Le flux complet

```
┌─────────────────────────────────────────────────────────────────┐
│                        CÔTÉ ADMIN                                │
│                                                                  │
│  1. Créer les shops (Boutique A, Boutique B...)                 │
│  2. Ajouter les travailleurs (nom, matricule, shop)             │
│  3. Définir les codes PIN pour chaque employé                   │
│  4. Enregistrer la photo de référence (détection faciale)        │
│  5. Créer les tablettes (nom + shop lié)                        │
│  6. Suivre les stats sur le dashboard                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CÔTÉ TABLETTE                                │
│                                                                  │
│  1. Configurer la tablette (nom + shop)                         │
│  2. L'employé arrive → cherche son nom                           │
│  3. Entre son code PIN                                           │
│  4. La caméra vérifie son visage                                │
│  5. Pointage enregistré ✅                                      │
│  6. Fonctionne hors-ligne (sync automatique)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CÔTÉ ADMIN (dashboard)                       │
│                                                                  │
│  • Voir qui est présent / absent / en retard par shop           │
│  • Historique des pointages                                      │
│  • Statistiques (taux de ponctualité, retards, absences)        │
│  • Gestion des pénalités pour retards/absences                  │
│  • Rapports exportables                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture technique

```
┌──────────────────────────┐
│    Dashboard Web         │  ← Admin gère les employés, voit les stats
│    (Next.js / React)     │
└────────────┬─────────────┘
             │ HTTPS (API REST)
             ▼
┌──────────────────────────┐
│    API Backend           │  ← Logique métier, auth, données
│    (NestJS + Prisma)     │
└────────────┬─────────────┘
             │ Prisma ORM
             ▼
┌──────────────────────────┐
│    Base de données       │  ← PostgreSQL managed (Neon)
│    (Neon PostgreSQL)     │
└──────────────────────────┘
             ▲
             │ HTTPS (API REST)
┌────────────┴─────────────┐
│    App Tablette          │  ← Employés pointent sur place
│    (Expo / React Native) │
└──────────────────────────┘
```

### Stack technique

| Composant | Technologie | Rôle |
|-----------|------------|------|
| **Dashboard** | Next.js 15 + Tailwind CSS | Interface admin web |
| **API** | NestJS + Prisma | Backend REST, logique métier |
| **Base de données** | PostgreSQL (Neon) | Stockage des données |
| **Tablette** | Expo (React Native) | App mobile de pointage |
| **Auth** | JWT (access + refresh tokens) | Sécurité des endpoints |
| **Détection faciale** | face-api.js (dashboard) + comparaison serveur | Vérification d'identité |
| **Déploiement** | Render (API + Dashboard) + Expo Go | Hébergement |

---

## 📱 Les 3 apps du projet

### 1. Dashboard Admin (`apps/admin-dashboard`)

L'interface web pour les administrateurs :
- **Dashboard** : stats en temps réel (présences, retards, absences, tablettes)
- **Travailleurs** : créer/modifier/supprimer des employés, définir PIN, enregistrer photo faciale
- **Appareils** : gérer les tablettes (créer, voir le statut online/offline)
- **Présence** : historique des pointages avec filtres
- **Pénalités** : gérer les retards et absences

### 2. API Backend (`apps/api`)

Le serveur qui centralise toutes les données :
- **Auth** : login, refresh token, rôles (ADMIN)
- **Workers** : CRUD travailleurs, recherche par nom, vérification PIN
- **Attendance** : pointage (check-in/check-out), historique
- **Devices** : enregistrement tablettes, heartbeat, statut online/offline
- **Dashboard** : statistiques agrégées
- **Penalties** : système de pénalités pour retards/absences
- **Sync** : synchronisation hors-ligne

### 3. App Tablette (`apps/tablet-app`)

L'application mobile installée sur les tablettes Android :
- **Configuration** : lier la tablette au shop créé sur le dashboard
- **Identification** : recherche par nom dans les employés du shop
- **Code PIN** : vérification du code à 4 chiffres
- **Biométrie** : capture photo → comparaison avec la photo de référence
- **Pointage** : envoi au serveur (ou sync automatique si hors-ligne)

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js >= 20
- npm >= 10

### Installation

```bash
# Cloner
git clone <url-du-repo>
cd shop-attendance

# Installer les dépendances
npm install

# Générer le client Prisma
npx prisma generate --workspace=apps/api

# Lancer en développement
npm run dev:api        # API sur http://localhost:3001
npm run dev:dashboard  # Dashboard sur http://localhost:3000
```

### Compte de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@shopattendance.local | Admin123! |

---

## 📁 Structure du projet

```
shop-attendance/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── src/modules/        # Modules métier
│   │   │   ├── auth/           # Authentification
│   │   │   ├── workers/        # Travailleurs
│   │   │   ├── attendance/     # Pointage
│   │   │   ├── devices/        # Tablettes
│   │   │   ├── dashboard/      # Stats
│   │   │   ├── penalties/      # Pénalités
│   │   │   └── ...
│   │   ├── prisma/             # Schema + migrations
│   │   └── package.json
│   │
│   ├── admin-dashboard/        # Frontend Next.js
│   │   ├── app/                # Pages (routing)
│   │   ├── components/         # Composants UI
│   │   ├── lib/                # Utils, API client, auth
│   │   └── package.json
│   │
│   └── tablet-app/             # App Expo (React Native)
│       ├── app/                # Écrans
│       ├── components/         # Composants
│       ├── services/           # API client, sync, biometrics
│       ├── storage/            # Cache local (AsyncStorage)
│       └── package.json
│
├── packages/
│   └── types/                  # Types partagés (TypeScript)
│
├── render.yaml                 # Config Render (déploiement)
├── package.json                # Racine monorepo
└── DEPLOYMENT.md               # Guide de déploiement
```

---

## 🔐 Sécurité

- **JWT** : tokens d'accès (15min) + refresh tokens (7 jours)
- **Roles** : seuls les admins accèdent au dashboard
- **Endpoints publics** : login, check-in tablette, heartbeat
- **Photo faciale** : stockée en base, comparée à chaque pointage
- **PIN** : hashé avec bcrypt, jamais en clair

---

## 📄 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Guide de déploiement complet
- **Swagger** : `https://shop-attendance-api.onrender.com/docs`

---

## 📝 Licence

Projet privé — Tous droits réservés.
