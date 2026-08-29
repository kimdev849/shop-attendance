# 🏪 ShopAttendance

Plateforme de gestion de présence, ponctualité et pénalités pour des travailleurs répartis dans plusieurs shops.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│              admin-dashboard.vercel.app                  │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Workers  │  │Attendance│  │Penalties │  │ Reports│  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     API (NestJS)                         │
│              shop-attendance-api.onrender.com             │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                  modules/                           │ │
│  │  ┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│  │  │ Auth │ │ Workers  │ │Attendance│ │Penalties │  │ │
│  │  ├──────┤ ├──────────┤ ├──────────┤ ├──────────┤  │ │
│  │  │Shops │ │ Devices  │ │Schedules │ │ Absences │  │ │
│  │  ├──────┤ ├──────────┤ ├──────────┤ ├──────────┤  │ │
│  │  │Audit │ │ Dashboard│ │ Reports  │ │  Sync    │  │ │
│  │  └──────┘ └──────────┘ └──────────┘ └──────────┘  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Controller → Service → Repository → Prisma → Neon      │
└───────────────────────────┬─────────────────────────────┘
                            │ Prisma
                            ▼
┌─────────────────────────────────────────────────────────┐
│               Neon PostgreSQL Database                   │
│                  shop-attendance-db                      │
└─────────────────────────────────────────────────────────┘
                            ▲
                            │ HTTPS
┌───────────────────────────┴─────────────────────────────┐
│               TABLET APP (Expo / React Native)           │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Check-in │  │Biometrics│  │  Sync    │  │ Workers│  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

| Couche | Technologie | Déploiement |
|--------|------------|-------------|
| **Frontend** | Next.js 15 + React 19 + Tailwind CSS | Render (Web Service) |
| **API** | NestJS + Prisma + PostgreSQL | Render (Web Service) |
| **Database** | PostgreSQL | Neon (managed) |
| **Tablet** | Expo / React Native | Expo Go / EAS Build |

---

## 🚀 Démarrage Rapide

### Prérequis

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git

### Installation

```bash
# Cloner le projet
git clone https://github.com/TON_UTILISATEUR/shop-attendance.git
cd shop-attendance

# Installer les dépendances
npm install

# Générer le client Prisma
cd apps/api && npx prisma generate && cd ../..

# Lancer en développement
npm run dev:api      # Terminal 1 : API sur http://localhost:3001
npm run dev:dashboard # Terminal 2 : Frontend sur http://localhost:3000
```

### Déploiement

Voir **[DEPLOYMENT.md](./DEPLOYMENT.md)** pour le guide complet.

```bash
# Résumé rapide :
./deploy.sh all           # Préparer les fichiers
git add . && git commit -m "Deploy" && git push  # Pousser
# Puis créer les services sur Render
```

---

## 📁 Structure du Code

### Backend (`apps/api/src/modules/`)

```
modules/
├── auth/           # Authentification JWT
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.repository.ts
│   └── dto/
│
├── workers/        # Gestion des travailleurs
│   ├── workers.module.ts
│   ├── workers.controller.ts
│   ├── workers.service.ts
│   ├── workers.repository.ts
│   ├── dto/
│   ├── types/
│   └── constants/
│
├── attendance/     # Pointage et présence
│   ├── attendance.module.ts
│   ├── attendance.controller.ts
│   ├── attendance.service.ts
│   ├── attendance.repository.ts
│   ├── dto/
│   ├── types/
│   └── constants/
│
├── penalties/      # Système de pénalités
├── shops/          # Gestion des shops
├── devices/        # Tablets
├── schedules/      # Horaires
├── absences/       # Absences
├── reports/        # Rapports
├── dashboard/      # Stats dashboard
├── audit/          # Journal d'audit
├── sync/           # Synchronisation offline
└── notifications/  # Notifications
```

### Frontend (`apps/admin-dashboard/`)

```
├── app/            # Pages Next.js
│   ├── login/
│   ├── dashboard/
│   ├── workers/
│   ├── attendance/
│   ├── penalties/
│   └── ...
│
├── features/       # Features métier
│   ├── workers/api.ts
│   ├── attendance/api.ts
│   ├── penalties/api.ts
│   ├── shops/api.ts
│   └── auth/api.ts
│
├── components/     # Composants UI
│   ├── ui/         # Button, Card, Table...
│   ├── layout/     # Shell, Sidebar, Header
│   └── charts/     # Graphiques
│
└── lib/            # Utilitaires
    ├── api.ts      # Client API axios
    ├── auth.tsx    # Context auth
    └── utils.ts    # Helpers
```

---

## 🔑 Comptes de Test

Après avoir lancé le seed (`npm run db:seed`) :

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@shopattendance.local | Admin123! |
| Travailleur | (matricule) | 1234 (PIN) |

---

## 📚 API Documentation

L'API est documentée via Swagger :

- **URL** : `https://shop-attendance-api.onrender.com/docs`
- **Version** : v1
- **Auth** : Bearer Token (JWT)

### Routes principales

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/v1/auth/login` | Connexion |
| POST | `/v1/auth/refresh` | Rafraîchir le token |
| GET | `/v1/workers` | Liste des travailleurs |
| POST | `/v1/workers` | Créer un travailleur |
| GET | `/v1/attendance` | Liste des pointages |
| POST | `/v1/attendance/check-in` | Pointage (tablette) |
| GET | `/v1/penalties` | Liste des pénalités |
| PATCH | `/v1/penalties/:id/approve` | Approuver une pénalité |
| GET | `/v1/dashboard/stats` | Stats du dashboard |
| POST | `/v1/sync/attendance` | Sync offline |

---

## 🛠️ Commandes Utiles

```bash
# Développement
npm run dev:api          # API en dev (hot-reload)
npm run dev:dashboard    # Frontend en dev

# Build
npm run build:api        # Build l'API (→ dist/)
npm run build:dashboard  # Build le Frontend (→ .next/)

# Base de données
npm run db:generate      # Générer le client Prisma
npm run db:migrate       # Appliquer les migrations
npm run db:seed          # Peupler la base
npm run db:studio        # Ouvrir Prisma Studio

# Déploiement
./deploy.sh api          # Préparer l'API pour Render
./deploy.sh dashboard    # Préparer le Frontend pour Render
./deploy.sh all          # Préparer les deux

# Qualité
npm test                 # Lancer les tests
```

---

## 📄 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Guide complet de déploiement (GitHub + Render)
- **Swagger** — Documentation API interactive

---

## 🤝 Contribuer

1. Créer une branche (`git checkout -b feature/ma-feature`)
2. Committer (`git commit -m 'Ajouter ma feature'`)
3. Push (`git push origin feature/ma-feature`)
4. Ouvrir une Pull Request

---

## 📝 Licence

Projet privé — Tous droits réservés.

---


