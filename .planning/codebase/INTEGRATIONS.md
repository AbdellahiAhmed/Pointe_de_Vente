# External Integrations

**Analysis Date:** 2026-02-17

## APIs & External Services

**Error Tracking:**
- Rollbar - Error monitoring and reporting
  - SDK/Client: `rollbar/rollbar` ^2.1 (declared in `back/composer.json`)
  - Auth: `ROLLBAR_TOKEN` (expected env var, not wired in `back/src/` — integration is declared but not actively used in application code)

**Analytics:**
- Google Analytics 4 - Frontend usage tracking
  - SDK/Client: `react-ga4` ^2.1.0
  - Initialized: `front/src/ga.js`
  - Auth: `VITE_GOOGLE_ANALYTICS` env var (GA4 Measurement ID)
  - Imported in entry file: `front/src/index.tsx` (indirectly via `ga.js`)

## Data Storage

**Databases:**
- MariaDB 10.6 (primary relational database)
  - Connection: `DATABASE_URL` env var in `back/.env`
  - Client: Doctrine ORM 2.10 via `doctrine/doctrine-bundle`
  - Entity mappings: `back/src/Entity/` (40+ entities including Order, Product, Customer, Store, Terminal, etc.)
  - Migrations: `back/migrations/`
  - Soft delete (SoftDeleteable filter) and timestamps (Timestampable) applied globally via `stof/doctrine-extensions-bundle`
  - Config: `back/config/packages/doctrine.yaml`
  - Docker: `mariadb:10.6` container on port 3307:3306 (`back/docker-compose.yaml`)

**File Storage:**
- Local filesystem (uploaded media files)
  - Managed via Glide image manipulation library (`league/glide-symfony` ^2.0)
  - API endpoint: `back/src/Controller/Api/Admin/MediaController.php`
  - Public access: `back/src/Controller/Api/PublicMediaController.php`
  - Media entity: `back/src/Entity/Media.php`

**Client-side Storage:**
- LocalForage 1.10.0 - IndexedDB/localStorage abstraction for offline data persistence in frontend
- Browser localStorage - Persists locale preference (`front/src/i18next.ts`)
- Browser cookies (`js-cookie` ^3.0.1) - Used for auth tokens or session data

**Caching:**
- Symfony Cache (production) - Doctrine result and system cache pools configured in `back/config/packages/prod/doctrine.yaml`
- No external caching service (Redis/Memcached) detected

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication (no third-party identity provider)
  - Implementation: LexikJWT authentication bundle
  - Login endpoint: `POST /api/auth/login_check` (JSON login with username/password)
  - Token TTL: 2,592,000 seconds (30 days) — configured in `back/config/packages/lexik_jwt_authentication.yaml`
  - Token refresh: `POST /api/token/refresh` via `gesdinet/jwt-refresh-token-bundle`
  - Refresh token TTL: 2,592,000 seconds (30 days), TTL updates on use
  - Key files: RSA keypair at `back/config/jwt/private.pem` and `back/config/jwt/public.pem`
  - Token extraction: Authorization header + query parameter enabled
  - User entity: `back/src/Entity/User.php`, provider field: `username`
  - Roles: `ROLE_ADMIN`, `ROLE_USER` (access control in `back/config/packages/security.yaml`)
  - Frontend stores tokens in cookies via `js-cookie`

**Public endpoints (no auth required):**
- `POST /api/auth/login_check` - Login
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/forgot-password` - Forgot password email
- `POST /api/auth/register` - User registration
- `POST /api/token/refresh` - Token refresh
- `GET /api/doc` - Swagger UI documentation

## Monitoring & Observability

**Error Tracking:**
- Rollbar SDK installed (`rollbar/rollbar` ^2.1) but not actively invoked in `back/src/` application code

**Logging:**
- Symfony Monolog bundle (`symfony/monolog-bundle` ^3.1)
- Dev: Debug-level logging, web profiler enabled (`back/config/packages/dev/monolog.yaml`)
- Production: Configured in `back/config/packages/prod/monolog.yaml`
- Test: Suppressed in `back/config/packages/test/monolog.yaml`

**Performance:**
- Web Profiler (dev only): `symfony/web-profiler-bundle` (`back/config/packages/dev/web_profiler.yaml`)
- Frontend Web Vitals: `web-vitals` ^2.1.0 via `front/src/reportWebVitals.js`, logged to console

## API Layer

**REST API:**
- API Platform 2.7 exposes REST endpoints for all annotated entities
- Base path: `/api/admin/*` (role-protected), `/api/client/*`, `/api/auth/*`
- Response format: JSON-LD / Hydra
- Pagination: 10 items/page default, client-configurable
- PATCH support: `application/merge-patch+json`
- Documentation: Swagger/OpenAPI 3 at `/api/doc` (via `nelmio/api-doc-bundle`)
- Config: `back/config/packages/api_platform.yaml`

**GraphQL API:**
- Endpoint: `/api/graphql` (exposed by API Platform + `webonyx/graphql-php` ^14.11)
- Used by frontend for terminal-related queries: `front/src/api/graphql/terminals.ts`
- Client: Apollo Client 3.8.4 (`front/src/index.tsx`)
- Schema URL for codegen: `http://polymer-admin.localhost/api/graphql` (`front/codegen.ts`)
- Generated types: `front/src/__generated__/` (gql.ts, graphql.ts, fragment-masking.ts)

**Frontend API Communication:**
- REST calls: Native `fetch` API with `@tanstack/react-query` 4.x for caching (`front/src/api/hooks/use.api.ts`)
- GraphQL calls: Apollo Client with `InMemoryCache` (`front/src/index.tsx`)
- CORS: Configured to allow frontend origin via `CORS_ALLOW_ORIGIN` env var (`back/config/packages/nelmio_cors.yaml`)
- Credentials: `credentials: 'include'` and `mode: 'cors'` on all fetch requests (`front/src/api/config/fetch.config.ts`)
- Base URL: `VITE_API_BASE_URL` env var (`front/src/api/config/route.config.ts`)
- Dev proxy: Vite proxies `/api/*` to `http://localhost:8000` (`front/vite.config.js`)

## Email

**Mailer:**
- Symfony Mailer (`symfony/mailer` 5.4.*) used for password reset/forgot-password flows
  - DSN: `MAILER_DSN` env var (defaults to `smtp://localhost`)
  - Used in: `back/src/Controller/Api/SecurityController.php`
  - Configured: `back/config/packages/mailer.yaml`
  - No external email provider (SendGrid, Mailgun, etc.) detected — bare SMTP only

## Internationalization

**i18n:**
- i18next 21 + react-i18next 11 for client-side translations
  - Languages: French (`fr`) and Arabic (`ar`)
  - Translation files: `front/src/language/lang.fr.json`, `front/src/language/lang.ar.json`
  - Default language: `fr`
  - Language persisted in `localStorage` key `locale`
  - Config: `front/src/i18next.ts`

## CI/CD & Deployment

**Hosting:**
- Docker-based deployment (nginx + PHP-FPM + MariaDB)
- Docker Compose config: `back/docker-compose.yaml`
- Services: `web` (nginx:latest, port 8000/444), `db` (mariadb:10.6, port 3307), `php` (custom image)

**CI Pipeline:**
- Not detected (no GitHub Actions, GitLab CI, or CircleCI config found)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Environment Configuration

**Backend required env vars:**
- `DATABASE_URL` - MariaDB connection string
- `JWT_SECRET_KEY` - Path to RSA private key PEM
- `JWT_PUBLIC_KEY` - Path to RSA public key PEM
- `JWT_PASSPHRASE` - RSA key passphrase
- `MAILER_DSN` - SMTP connection string
- `CORS_ALLOW_ORIGIN` - Regex of allowed frontend origins
- `APP_SECRET` - Symfony application secret

**Frontend required env vars:**
- `VITE_API_HOST` - GraphQL endpoint URL (used by Apollo Client)
- `VITE_API_BASE_URL` - REST API base URL (used by fetch hooks)
- `VITE_APP_TYPE` - `admin` or `frontend` (controls which app is rendered)
- `VITE_GOOGLE_ANALYTICS` - GA4 Measurement ID

**Secrets location:**
- Backend: `back/.env.local` (not committed), JWT PEM files at `back/config/jwt/`
- Frontend: `front/.env` (present in repo - review for accidental secret exposure)

---

*Integration audit: 2026-02-17*
