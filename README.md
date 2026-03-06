# Homy

Application web progressive (PWA) de gestion du foyer — courses, dépenses partagées, factures, et plus.

## Stack

| Couche       | Technologie                             |
| ------------ | --------------------------------------- |
| Frontend     | Next.js 15 + React 19 + TypeScript      |
| Styling      | Tailwind CSS                            |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime) |
| State        | Zustand + React Query                   |
| Hébergement  | Vercel                                  |

## Structure du projet

```
homy/
├── apps/
│   └── web/                  ← Application Next.js
│       ├── src/
│       │   ├── app/          ← Pages (App Router)
│       │   │   ├── (auth)/   ← Login, Register
│       │   │   └── (app)/    ← Dashboard, Shopping, Expenses, Bills
│       │   ├── components/   ← Composants UI et layout
│       │   ├── lib/          ← Supabase clients, utilitaires
│       │   ├── hooks/        ← Custom hooks
│       │   ├── services/     ← Appels API Supabase
│       │   ├── stores/       ← État global (Zustand)
│       │   └── types/        ← Types locaux
├── packages/
│   └── shared-types/         ← Types TypeScript partagés
├── supabase/
│   └── migrations/           ← Schéma SQL
└── docs/                     ← Documentation
```

## Démarrage rapide

### 1. Prérequis

- Node.js ≥ 20
- npm ≥ 10
- Un compte [Supabase](https://supabase.com) (gratuit)

### 2. Cloner et installer

```bash
git clone https://github.com/TON_USERNAME/homy.git
cd homy
npm install
```

### 3. Configurer Supabase

1. Créer un nouveau projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, exécuter le fichier `supabase/migrations/001_initial_schema.sql`
3. Récupérer l'URL et la clé anonyme dans **Project Settings → API**

### 4. Variables d'environnement

```bash
cp apps/web/.env.example apps/web/.env.local
# Remplir NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 5. Lancer en développement

```bash
npm run dev
# → http://localhost:3000
```

## Commandes utiles

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run lint         # ESLint
npm run type-check   # Vérification TypeScript
```

## Conventions Git

| Type        | Usage                                           |
| ----------- | ----------------------------------------------- |
| `feat:`     | Nouvelle fonctionnalité                         |
| `fix:`      | Correction de bug                               |
| `chore:`    | Maintenance, dépendances                        |
| `docs:`     | Documentation                                   |
| `refactor:` | Refactorisation sans changement de comportement |

**Branches :** `main` (prod) → `develop` → `feat/nom-feature`

## Déploiement (Vercel)

1. Connecter le repo GitHub à [Vercel](https://vercel.com)
2. Définir le **Root Directory** sur `apps/web`
3. Ajouter les variables d'environnement Supabase
4. Deploy automatique sur chaque push sur `main`

## Roadmap

- [x] Setup projet & structure
- [ ] M1 — Authentification & Foyer
- [ ] M2 — Liste de courses
- [ ] M3 — Soldes partagés
- [ ] M4 — Suivi des factures
- [ ] PWA offline
- [ ] Dashboard & statistiques

## Licence

Projet personnel — tous droits réservés.
