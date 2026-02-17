# Technology Stack

**Analysis Date:** 2026-02-17

## Languages

**Primary (Backend):**
- PHP >=7.4 - Symfony application and domain logic (`back/src/`)

**Primary (Frontend):**
- TypeScript 4.4 - All React components and business logic (`front/src/`)

**Secondary (Frontend):**
- JavaScript - Utility scripts (`front/src/ga.js`, `front/src/reportWebVitals.js`)
- SCSS - Stylesheets alongside TailwindCSS (`front/src/css/`)

## Runtime

**Backend Environment:**
- PHP >=7.4 (exact version resolved at runtime via Docker)
- Composer 2 for dependency management
- Lockfile: `back/composer.lock` present

**Frontend Environment:**
- Node.js 24.13.0
- Yarn 1.22.22 (classic)
- Lockfile: `front/yarn.lock` present

## Package Manager

**Backend:** Composer
- Config: `back/composer.json`
- Lockfile: `back/composer.lock`

**Frontend:** Yarn Classic (v1)
- Config: `front/package.json`
- Lockfile: `front/yarn.lock`

## Frameworks

**Backend Core:**
- Symfony 5.4.* - Full web framework (`back/`)
- API Platform 2.7.* - REST + GraphQL API layer, maps to `back/src/Entity/`

**Frontend Core:**
- React 18.2.0 - UI rendering (`front/src/`)
- React Router 6.3.0 - Client-side routing (`front/src/app-admin/`, `front/src/app-frontend/`)

**Build/Dev (Frontend):**
- Vite 4.4.2 - Dev server and bundler (`front/vite.config.js`)
- TypeScript 4.4.2 - Compiled via Vite, config in `front/tsconfig.json`

**CSS:**
- TailwindCSS 3.1.8 - Utility classes (`front/tailwind.config.js`, `front/postcss.config.js`)
- PostCSS 8 - CSS processing

**Testing (Frontend):**
- @testing-library/react 13.0.0 - React component tests
- @testing-library/jest-dom 5.14.1 - DOM matchers
- @testing-library/user-event 13.2.1 - User interaction simulation

**Testing (Backend):**
- PHPUnit 9.5 - Unit and integration tests (`back/tests/`)
- Symfony PHPUnit Bridge 6.0 - Symfony test integration

## Key Dependencies

**Critical (Backend):**
- `lexik/jwt-authentication-bundle` 2.14 - JWT auth for stateless API (`back/config/packages/lexik_jwt_authentication.yaml`)
- `gesdinet/jwt-refresh-token-bundle` 1.0 - JWT refresh tokens (`back/config/packages/gesdinet_jwt_refresh_token.yaml`)
- `doctrine/orm` 2.10 - ORM for MariaDB/MySQL (`back/src/Entity/`)
- `doctrine/doctrine-migrations-bundle` 3.2 - Database schema migrations (`back/migrations/`)
- `doctrine/doctrine-fixtures-bundle` 3.4 - Database seeding (`back/src/DataFixtures/`)
- `nelmio/cors-bundle` 2.2 - CORS headers for frontend access (`back/config/packages/nelmio_cors.yaml`)
- `api-platform/core` 2.7 - API resource definitions via annotations on entities
- `webonyx/graphql-php` 14.11 - GraphQL endpoint (exposed by API Platform at `/api/graphql`)

**Critical (Frontend):**
- `@apollo/client` 3.8.4 - GraphQL client for terminal queries (`front/src/api/graphql/`)
- `@tanstack/react-query` 4.29.7 - REST API data fetching and caching (`front/src/api/hooks/`)
- `redux` 4.2.0 + `redux-saga` 1.1.3 - Global state and side effects (`front/src/store/`)
- `jotai` 2.4.3 - Lightweight atomic state (`front/src/index.tsx` wraps app with JotaiProvider)
- `react-hook-form` 7.34.0 + `yup` 1.1.1 - Form handling and validation
- `antd` 5.4.7 - Ant Design UI component library
- `react-aria` + `react-aria-components` 1.0.1 - Accessible UI primitives

**Infrastructure (Backend):**
- `stof/doctrine-extensions-bundle` 1.7 - SoftDelete, Timestampable (`back/config/packages/stof_doctrine_extensions.yaml`)
- `gedmo/doctrine-extensions` 3.4 - Loggable, SoftDeleteable behavior
- `ramsey/uuid` 4.2 - UUID generation for entities
- `nesbot/carbon` 2.55 - Date/time utilities
- `beberlei/doctrineextensions` 1.3 - MySQL-specific Doctrine functions
- `league/glide-symfony` 2.0 - On-the-fly image manipulation (used via `back/src/Controller/Api/Admin/MediaController.php`)
- `rollbar/rollbar` 2.1 - Error tracking service (declared as dependency, not wired in src)
- `fakerphp/faker` 1.20 - Fake data for fixtures

**Infrastructure (Frontend):**
- `@nivo/bar`, `@nivo/pie`, `@nivo/core` 0.79 - Data visualization charts
- `@tanstack/react-table` 8.9.2 - Table component logic
- `i18next` 21 + `react-i18next` 11 - French/Arabic internationalization (`front/src/i18next.ts`)
- `luxon` 3.2.1 - Date/time handling
- `fuse.js` 6.6.2 - Client-side fuzzy search
- `react-simple-keyboard` 3.4 - On-screen keyboard for touchscreen POS
- `react-speech-recognition` 3.9.1 - Voice input
- `localforage` 1.10.0 - Offline/IndexedDB storage
- `react-window` 1.8.7 - Virtualized list rendering
- `normalizr` 3.6.2 - API response normalization

**GraphQL Codegen (Frontend Dev):**
- `@graphql-codegen/cli` 5.0.0 - Generates TypeScript types from GraphQL schema
- `@graphql-codegen/client-preset` 4.1.0 - Client-side codegen preset
- Output: `front/src/__generated__/` (committed)
- Schema endpoint: `http://polymer-admin.localhost/api/graphql`

## Configuration

**Backend Environment:**
- Variables in `back/.env` (defaults), `back/.env.local` (local overrides, not committed)
- Key required vars: `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_PUBLIC_KEY`, `JWT_PASSPHRASE`, `MAILER_DSN`, `CORS_ALLOW_ORIGIN`
- JWT keys stored as PEM files at `back/config/jwt/private.pem` and `back/config/jwt/public.pem`

**Frontend Environment:**
- Variables in `front/.env` (Vite-style, prefixed `VITE_`)
- Key required vars: `VITE_API_HOST` (GraphQL endpoint), `VITE_API_BASE_URL` (REST base URL), `VITE_APP_TYPE` (`admin` or `frontend`), `VITE_GOOGLE_ANALYTICS`
- Vite proxies `/api/*` requests to `http://localhost:8000` in dev mode (`front/vite.config.js`)

**Build:**
- Backend: `back/config/packages/` directory with per-package YAML configs
- Frontend: Manual Rollup chunks defined in `front/vite.config.js` for Apollo, Lodash, Ant Design, Nivo, TanStack, keyboard, FontAwesome

**TypeScript:**
- Strict mode enabled, target ES5, JSX: react-jsx
- Path alias: `common` → `front/src/common/`
- Config: `front/tsconfig.json`

## Platform Requirements

**Development:**
- PHP >=7.4
- Node.js (tested on 24.13.0), Yarn 1.x
- Docker + Docker Compose (services: nginx:latest on 8000:80, mariadb:10.6 on 3307:3306, custom PHP image)
- Symfony CLI (optional but used for cache/assets scripts)

**Production:**
- Docker-based deployment (see `back/docker-compose.yaml`)
- Nginx as web server (config in `back/.docker/nginx/`)
- MariaDB 10.6 as database
- Frontend: Vite static build (`front/dist/`)

---

*Stack analysis: 2026-02-17*
