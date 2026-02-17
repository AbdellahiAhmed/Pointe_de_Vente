# Codebase Structure

**Analysis Date:** 2026-02-17

## Directory Layout

```
Pointe_de_Vente/           # Monorepo root
├── back/                  # Symfony 5.4 backend
│   ├── bin/               # Symfony console
│   ├── config/            # Symfony configuration (packages, routes, security)
│   │   ├── packages/      # Bundle config (api_platform, security, doctrine, jwt, cors)
│   │   └── routes/        # Route definitions
│   ├── docs/              # API documentation assets
│   ├── migrations/        # Doctrine migration files
│   ├── public/            # Web root (index.php, uploads/, downloads/)
│   ├── src/               # All PHP application source
│   │   ├── Command/       # Symfony Console CRUD code-generators
│   │   ├── Controller/    # HTTP controllers
│   │   ├── Core/          # CQRS domain layer (commands, queries, DTOs, entities)
│   │   ├── DataFixtures/  # Doctrine fixtures (seed data)
│   │   ├── Entity/        # Doctrine ORM entities
│   │   ├── EventSubscriber/ # Symfony event subscribers
│   │   ├── Factory/       # Response factories
│   │   ├── Repository/    # Doctrine entity repositories
│   │   ├── Security/      # Authenticators, user checker
│   │   └── State/         # API Platform state providers (if any)
│   └── .docker/           # Docker setup (nginx, php, db data)
│
└── front/                 # React 18 frontend (Vite)
    ├── public/            # Static assets
    └── src/
        ├── __generated__/ # Apollo/GraphQL generated types
        ├── api/           # API client: request helpers, models, hooks, routing
        ├── app-admin/     # Admin dashboard application
        ├── app-common/    # Shared UI components (used by both apps)
        ├── app-frontend/  # POS terminal application
        ├── assets/        # Fonts, images
        ├── css/           # Global stylesheets
        ├── duck/          # Redux ducks (reducers, actions, sagas, selectors)
        ├── language/      # i18n translation files
        ├── lib/           # Utility libraries (http, currency, error, uuid, etc.)
        └── store/         # Redux store factory + Jotai atoms
```

---

## Backend Directory Purposes

**`back/src/Controller/Api/Admin/`:**
- Purpose: REST API controllers for the admin/POS interface
- Contains: `OrderController`, `ProductController`, `UserController`, `CustomerController`, `ClosingController`, `ExpenseController`, `MediaController`, `ReportController`, `TerminalController`
- Key files: `back/src/Controller/Api/Admin/OrderController.php`

**`back/src/Core/<Domain>/Command/<Action><Domain>Command/`:**
- Purpose: One directory per CQRS command, containing exactly four files
- Pattern: `<Action><Domain>Command.php` (data object), `<Action><Domain>CommandHandler.php` (business logic), `<Action><Domain>CommandHandlerInterface.php` (DI contract), `<Action><Domain>CommandResult.php` (typed return)
- Key files: `back/src/Core/Brand/Command/CreateBrandCommand/CreateBrandCommandHandler.php`

**`back/src/Core/<Domain>/Query/<Action><Domain>Query/`:**
- Purpose: One directory per CQRS query
- Pattern: `<Action><Domain>Query.php`, `<Action><Domain>QueryHandler.php`, `<Action><Domain>QueryHandlerInterface.php`, `<Action><Domain>QueryResult.php`
- Key files: `back/src/Core/Brand/Query/SelectBrandQuery/SelectBrandQueryHandler.php`

**`back/src/Core/Dto/Controller/Api/Admin/<Domain>/`:**
- Purpose: Request and response DTO classes per domain per controller
- Contains: `Create<Domain>RequestDto`, `<Domain>RequestListDto`, `<Domain>ResponseDto`, `<Domain>ListResponseDto`
- Key files: `back/src/Core/Dto/Controller/Api/Admin/Order/CreateOrderRequestDto.php`

**`back/src/Core/Dto/Common/<Domain>/`:**
- Purpose: Shared sub-DTOs used across multiple RequestDtos (e.g., `OrderProductDto`, `CartProductDto`, `TaxDto`, `DiscountDto`)
- Key files: `back/src/Core/Dto/Common/Order/`, `back/src/Core/Dto/Common/Product/`

**`back/src/Core/Cqrs/`:**
- Purpose: Shared CQRS result traits and interfaces
- Key files: `back/src/Core/Cqrs/Traits/CqrsResultValidationTrait.php`, `back/src/Core/Cqrs/Traits/CqrsResultEntityNotFoundTrait.php`

**`back/src/Core/Entity/`:**
- Purpose: Base classes for CommandHandlers and QueryHandlers
- Key files: `back/src/Core/Entity/EntityManager/EntityManager.php`, `back/src/Core/Entity/Repository/EntityRepository.php`

**`back/src/Entity/`:**
- Purpose: All Doctrine ORM entities (database schema)
- Key files: `back/src/Entity/Order.php`, `back/src/Entity/Product.php`, `back/src/Entity/User.php`, `back/src/Entity/Store.php`, `back/src/Entity/Terminal.php`
- Traits: `back/src/Entity/Traits/TimestampableTrait.php`, `back/src/Entity/Traits/UuidTrait.php`

**`back/src/Core/Validation/Custom/`:**
- Purpose: Custom Symfony validation constraints
- Key files: `back/src/Core/Validation/Custom/ConstraintValidEntity.php`, `back/src/Core/Validation/Custom/ConstraintBelongsToMeValidator.php`

**`back/src/Factory/Controller/`:**
- Purpose: Centralised response building
- Key files: `back/src/Factory/Controller/ApiResponseFactory.php`

**`back/src/EventSubscriber/Purchase/`:**
- Purpose: Domain event handler for purchase stock/cost updates
- Key files: `back/src/EventSubscriber/Purchase/PurchaseEvent.php`

**`back/src/Command/Crud/`:**
- Purpose: Symfony console commands for auto-generating CQRS boilerplate
- Key files: `back/src/Command/Crud/Create/CreateCommand.php`, `back/src/Command/Crud/Select/SelectQuery.php`

---

## Frontend Directory Purposes

**`front/src/api/`:**
- Purpose: All backend communication — HTTP client, URL constants, TypeScript models, data-fetching hooks
- Key files:
  - `front/src/api/request/request.ts` — base fetch wrapper with JWT injection
  - `front/src/api/routing/routes/backend.app.ts` — all REST URL constants (PRODUCT_LIST, ORDER_CREATE, etc.)
  - `front/src/api/routing/routes/admin.backend.app.ts` — admin-specific URLs
  - `front/src/api/hooks/use.api.ts` — TanStack Query hook used across all admin list views
  - `front/src/api/model/*.ts` — TypeScript interfaces for every domain entity

**`front/src/duck/`:**
- Purpose: Redux state management; each subdirectory is a "duck" (reducer + actions + saga + selectors)
- Key files:
  - `front/src/duck/_root/root.reducer.ts` — combines all reducers
  - `front/src/duck/auth/auth.saga.ts` — login/logout sagas
  - `front/src/duck/auth/auth.selector.ts` — `isUserLoggedIn` and user selectors
  - `front/src/duck/entity/entity.middleware.ts` — normalizr entity normalisation middleware
  - `front/src/duck/entity/entity.schema.ts` — normalizr schemas
  - `front/src/duck/entity/selector/_entity.ts` — `getEntityByIdSelector`, `getEntityByIdListSelector`

**`front/src/store/`:**
- Purpose: Redux store factory and Jotai persistent atoms
- Key files:
  - `front/src/store/store.factory.ts` — creates Redux store with saga + entity middleware
  - `front/src/store/jotai.ts` — `defaultState` atom (POS cart) and `defaultData` atom (POS config)

**`front/src/app-frontend/`:**
- Purpose: POS terminal application (cashier-facing)
- Key files:
  - `front/src/app-frontend/routes/frontend.routes.ts` — `POS`, `POS_V2`, `DASHBOARD`, `LOGIN` path constants
  - `front/src/app-frontend/containers/dashboard/pos.tsx` — root POS container; price/tax/discount calculation logic; delegates to mode components
  - `front/src/app-frontend/containers/layout/layout.tsx` — main layout shell
  - `front/src/app-frontend/components/sale/sale.tsx` — primary sale panel
  - `front/src/app-frontend/components/modes/` — `PosMode` and `PaymentMode` UI
  - `front/src/app-frontend/components/settings/` — all settings management screens

**`front/src/app-admin/`:**
- Purpose: Admin dashboard (manager-facing): user management, reports
- Key files:
  - `front/src/app-admin/containers/dashboard/` — admin dashboard views
  - `front/src/app-admin/containers/reports/` — sales/profit/daily reports

**`front/src/app-common/`:**
- Purpose: Reusable React components shared by both app shells
- Key files:
  - `front/src/app-common/components/table/` — data table components
  - `front/src/app-common/components/modal/` — modal primitives
  - `front/src/app-common/components/confirm/` — notification/toast helpers
  - `front/src/app-common/components/input/` — form input components
  - `front/src/app-common/components/loader/` — loading indicators
  - `front/src/app-common/components/react-aria/` — accessible component wrappers

**`front/src/lib/`:**
- Purpose: Domain-agnostic utility libraries
- Key files:
  - `front/src/lib/http/request.ts` — raw fetch wrapper
  - `front/src/lib/http/header/` — HTTP header composition helpers
  - `front/src/lib/currency/` — currency formatting
  - `front/src/lib/localforage/` — IndexedDB persistence helpers
  - `front/src/lib/validator/` — client-side validation utilities

---

## Key File Locations

**Backend Entry Points:**
- `back/public/index.php` — Symfony kernel bootstrap
- `back/bin/console` — Symfony CLI

**Backend Configuration:**
- `back/config/packages/security.yaml` — JWT config, firewall rules, access control
- `back/config/packages/api_platform.yaml` — API Platform settings, pagination defaults
- `back/config/packages/doctrine.yaml` — Doctrine ORM / DBAL config
- `back/config/packages/lexik_jwt_authentication.yaml` — JWT secret and TTL
- `back/config/packages/nelmio_cors.yaml` — CORS configuration

**Frontend Entry Points:**
- `front/index.html` — Vite HTML entry point
- `front/vite.config.js` — Vite build configuration
- `front/tailwind.config.js` — Tailwind CSS configuration

**Frontend Configuration:**
- `front/src/api/config/fetch.config.ts` — base fetch headers/options
- `front/src/api/routing/routes/backend.app.ts` — all backend URL constants

**Migrations:**
- `back/migrations/` — Doctrine migration files (numbered sequentially)

---

## Naming Conventions

**Backend Files:**
- Entities: `PascalCase.php` (e.g., `OrderProduct.php`)
- Command objects: `<Action><Domain>Command.php` (e.g., `CreateOrderCommand.php`)
- Query objects: `<Action><Domain>Query.php` (e.g., `SelectBrandQuery.php`, `GetOrdersListQuery.php`)
- Handlers: `<Action><Domain>CommandHandler.php`
- Interfaces: `<Action><Domain>CommandHandlerInterface.php`
- Results: `<Action><Domain>CommandResult.php`
- RequestDtos: `<Action><Domain>RequestDto.php`, `<Domain>RequestListDto.php`
- ResponseDtos: `<Domain>ResponseDto.php`, `<Domain>ListResponseDto.php`
- Repositories: `<Entity>Repository.php`

**Backend Directories:**
- Domain modules in `back/src/Core/<DomainName>/` (PascalCase, singular: `Brand`, `Order`, `Product`)
- Commands under `back/src/Core/<Domain>/Command/<Action><Domain>Command/`
- Queries under `back/src/Core/<Domain>/Query/<Action><Domain>Query/`

**Frontend Files:**
- Components/containers: `kebab-case.tsx` (e.g., `sale.tsx`, `apply.discount.tsx`, `dashboard.layout.tsx`)
- Redux slices: `<domain>.<type>.ts` (e.g., `auth.reducer.ts`, `auth.saga.ts`, `auth.selector.ts`, `auth.action.ts`)
- API models: `<domain>.ts` (e.g., `order.ts`, `product.ts`, `cart.item.ts`)
- API routes: `backend.app.ts`, `frontend.routes.ts`
- Jotai atoms: defined in `front/src/store/jotai.ts`

**Frontend Directories:**
- Domain components: `front/src/app-frontend/components/<domain>/` (kebab-case: `settings`, `inventory`, `sale`)
- Redux ducks: `front/src/duck/<domain>/` (kebab-case: `auth`, `entity`, `terminal`)

---

## Where to Add New Code

**New Backend Domain Entity:**
1. Create entity: `back/src/Entity/<DomainName>.php` (with `TimestampableTrait`, `UuidTrait`, ORM annotations, `@ApiResource` if needed)
2. Create repository: `back/src/Repository/<DomainName>Repository.php`
3. Generate migration: `bin/console doctrine:migrations:diff`

**New CQRS Command:**
1. Create directory: `back/src/Core/<Domain>/Command/<Action><Domain>Command/`
2. Add four files: `<Action><Domain>Command.php`, `<Action><Domain>CommandHandler.php` (extends `EntityManager`), `<Action><Domain>CommandHandlerInterface.php`, `<Action><Domain>CommandResult.php` (uses `CqrsResultValidationTrait`, `CqrsResultEntityNotFoundTrait`)
3. Register handler in Symfony DI (via autowiring + interface binding in `services.yaml`)

**New CQRS Query:**
1. Create directory: `back/src/Core/<Domain>/Query/<Action><Domain>Query/`
2. Add four files: `<Action><Domain>Query.php`, `<Action><Domain>QueryHandler.php` (extends `EntityRepository`), `<Action><Domain>QueryHandlerInterface.php`, `<Action><Domain>QueryResult.php`

**New Controller Endpoint:**
1. Add method to existing controller in `back/src/Controller/Api/Admin/` or create new `<Domain>Controller.php`
2. Create RequestDto in `back/src/Core/Dto/Controller/Api/Admin/<Domain>/`
3. Create ResponseDto in same directory

**New Frontend API URL:**
- Add constant to `front/src/api/routing/routes/backend.app.ts`

**New Frontend Admin List View:**
- Component: `front/src/app-frontend/components/settings/<domain>/`
- Use `useApi<T>('key', URL_CONSTANT)` from `front/src/api/hooks/use.api.ts`
- Use `app-common/components/table/` for the data table

**New POS Feature (cart/checkout):**
- Business logic: `front/src/app-frontend/containers/dashboard/pos.tsx`
- UI: `front/src/app-frontend/components/sale/` or `front/src/app-frontend/components/modes/`
- State: extend `DefaultStateInterface` in `front/src/store/jotai.ts` if new cart state is needed

**New Redux Slice:**
- Create directory: `front/src/duck/<domain>/`
- Add: `<domain>.action.ts`, `<domain>.reducer.ts`, `<domain>.state.ts`, `<domain>.selector.ts`
- Register reducer in `front/src/duck/_root/root.reducer.ts`

**Utilities:**
- Backend shared helpers: `back/src/Core/` (new subdirectory if needed)
- Frontend shared helpers: `front/src/lib/<utility-name>/`

---

## Special Directories

**`back/.docker/`:**
- Purpose: Docker Compose support files — nginx site config, PHP Dockerfile, db data volume
- Generated: Partial (db/data is runtime)
- Committed: Yes (config files); data volume excluded

**`back/public/bundles/`:**
- Purpose: Published Symfony bundle assets (API Platform Swagger UI, Nelmio API Doc)
- Generated: Yes (via `bin/console assets:install`)
- Committed: No (should be in `.gitignore`)

**`back/public/uploads/` and `back/public/downloads/`:**
- Purpose: Runtime file storage for media uploads and export downloads
- Generated: Yes (runtime)
- Committed: No

**`front/src/__generated__/`:**
- Purpose: Apollo GraphQL auto-generated TypeScript types from schema
- Generated: Yes (via `yarn codegen` using `front/codegen.ts`)
- Committed: Typically yes for stability

**`front/dist/`:**
- Purpose: Vite production build output
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-02-17*
