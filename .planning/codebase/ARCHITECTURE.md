# Architecture

**Analysis Date:** 2026-02-17

## Pattern Overview

**Overall:** Dual-application monorepo — Symfony 5.4 backend (CQRS + Repository pattern) consumed by a React 18 frontend (Redux/Saga + Jotai + TanStack Query)

**Key Characteristics:**
- Backend uses manual CQRS: every domain action is a Command or Query object with a dedicated Handler
- API surface is split between a hand-rolled REST API (`/api/admin/*`) and API Platform auto-generated endpoints (`/api/*`)
- Frontend manages state in two separate systems: Redux for session/global state, Jotai atoms for ephemeral POS UI state
- Data fetching uses TanStack Query v4 (`useApi`) for admin/list views; older Redux-Saga with normalizr for entity caching on the POS UI

---

## Backend Layers

**Controller Layer:**
- Purpose: Receive HTTP request, delegate to CQRS handler, return JSON response
- Location: `back/src/Controller/Api/Admin/`
- Contains: `OrderController`, `ProductController`, `UserController`, `ClosingController`, `CustomerController`, `ExpenseController`, `MediaController`, `ReportController`, `TerminalController`
- Depends on: RequestDtos, CommandHandlers, QueryHandlers, `ApiResponseFactory`
- Used by: Frontend HTTP client

**Request DTO Layer:**
- Purpose: Deserialize raw HTTP request body into a typed object; carry Symfony validation annotations
- Location: `back/src/Core/Dto/Controller/Api/Admin/<Domain>/`
- Contains: e.g., `CreateOrderRequestDto`, `OrderRequestListDto`, `OrderResponseDto`, `OrderListResponseDto`
- Pattern: Static factory `createFromRequest(Request $request)` parses `json_decode` body; `populateCommand(Command $cmd)` transfers values to a Command object
- Depends on: Common DTOs, Symfony Validator annotations, Command classes

**CQRS Command / Query Layer:**
- Purpose: Represent intent (Command) or data retrieval (Query) as pure value objects
- Location: `back/src/Core/<Domain>/Command/<ActionDomain>Command/` and `back/src/Core/<Domain>/Query/<ActionDomain>Query/`
- Contains per operation: `<Action><Domain>Command.php`, `<Action><Domain>CommandHandler.php`, `<Action><Domain>CommandHandlerInterface.php`, `<Action><Domain>CommandResult.php`
- Depends on: Domain entities, `EntityManager` base class (for Commands), `EntityRepository` base class (for Queries)
- Used by: Controllers (via handler interfaces injected by Symfony DI)

**Domain Entity Layer:**
- Purpose: ORM-mapped domain objects; source of truth for database schema
- Location: `back/src/Entity/`
- Contains: `Order`, `Product`, `User`, `Store`, `Terminal`, `Customer`, `Brand`, `Category`, `Tax`, `Discount`, `Supplier`, `Purchase`, `PurchaseOrder`, `Closing`, `Expense`, `Payment`, `Device`, `Location`, `Media`, `Barcode`, plus pivot/aggregate entities (`OrderProduct`, `OrderDiscount`, `OrderTax`, `OrderPayment`, `ProductVariant`, `ProductPrice`, `ProductStore`, `ProductInventory`, etc.)
- Key traits used on entities: `TimestampableTrait` (createdAt/deletedAt/updatedAt via Gedmo), `UuidTrait` (Ramsey UUID)
- Annotations: `@ApiResource` (API Platform), `@ApiFilter`, `@Gedmo\Loggable`, `@Gedmo\Versioned`, Symfony `@Groups` for serialization

**Repository Layer:**
- Purpose: Thin Doctrine wrapper per entity; used only for entity retrieval via Doctrine's built-in query builder
- Location: `back/src/Repository/`
- Contains: `<Entity>Repository.php` for each entity
- Note: Complex queries are built inside QueryHandlers (which extend `EntityRepository` base class), not in these repository classes

**Base Infrastructure Classes:**
- `back/src/Core/Entity/Repository/EntityRepository.php` — base class for all QueryHandlers; wraps `EntityManagerInterface`, provides `createQueryBuilder()` and `getRepository()`
- `back/src/Core/Entity/EntityManager/EntityManager.php` — extends `EntityRepository`; adds `persist()`, `flush()`, `remove()`, `save()`, `saveAll()` for CommandHandlers

**CQRS Result Traits:**
- Location: `back/src/Core/Cqrs/Traits/`
- `CqrsResultValidationTrait` — adds `hasValidationError()`, `getValidationError()`, factory methods from constraint violations
- `CqrsResultEntityNotFoundTrait` — adds `isNotFound()`, `getNotFoundMessage()`
- `CqrsResultExceptionTrait` — adds exception wrapping
- Every CommandResult and QueryResult composes these traits, giving controllers a uniform result-checking pattern

**Response DTO Layer:**
- Purpose: Shape outgoing JSON; decouple entity structure from API contract
- Location: `back/src/Core/Dto/Controller/Api/Admin/<Domain>/`
- Contains: `<Domain>ResponseDto`, `<Domain>ListResponseDto`
- Pattern: Static factory `createFrom<Entity>($entity)` maps entity to DTO fields

**Factory Layer:**
- Location: `back/src/Factory/Controller/ApiResponseFactory.php`
- Purpose: Centralise JSON serialisation; provide `json()`, `validationError()`, `notFound()`, `unauthorized()`, `download()` helpers used by every controller

**Security Layer:**
- Location: `back/src/Security/`
- `ApiAuthenticator` — token-based (`X-AUTH-TOKEN` header); guards `/api_*` routes
- `AppAuthenticator` — form-based login for web UI
- JWT authentication via LexikJWTAuthenticationBundle for `/api/admin/*` routes (stateless)
- `UserChecker`, `LogoutSuccessHandler`, `UserPasswordHasher` — supporting security utilities

**Event Subscriber Layer:**
- Location: `back/src/EventSubscriber/`
- `ApiPlatformSubscriber`, `LoggerSubscriber` — cross-cutting concerns
- `PurchaseEvent` — domain event handler: updates product cost (PMP/weighted average) and store inventory quantities when a purchase is recorded

**Code Generation Layer:**
- Location: `back/src/Command/Crud/`
- Contains Symfony Console commands that auto-generate CQRS boilerplate (Command, Handler, Interface, Result, DTO) from Doctrine entity metadata using `laminas/laminas-code`

---

## Frontend Layers

**API Layer:**
- Location: `front/src/api/`
- `request/request.ts` — base `fetch` wrapper; attaches `Authorization: Bearer <JWT>` from `js-cookie`; exports `request()`, `jsonRequest()`, `fetchJson()`, `formRequest()`
- `api/account/` — low-level API call functions (e.g., `getAuthInfo`)
- `routing/routes/backend.app.ts` — all backend URL constants; `routing/routes/admin.backend.app.ts` — admin-specific URLs
- `model/*.ts` — TypeScript interface definitions for every domain entity (Order, Product, Customer, etc.)
- `hooks/use.api.ts` — primary data-fetching hook wrapping TanStack Query; manages filters, sort, pagination, and caching

**State Management (Redux):**
- Location: `front/src/duck/`
- Store factory: `front/src/store/store.factory.ts` — creates Redux store with saga middleware, entity normalisation middleware, and DevTools
- Root reducer: `front/src/duck/_root/root.reducer.ts` — combines `auth`, `app`, `entity`, `store`, `shortcut`, `displayShortcut`, `touch`, `terminal`, `progress`
- `duck/auth/` — authentication: `auth.reducer.ts`, `auth.saga.ts`, `auth.selector.ts`, `auth.state.ts`, `auth.action.ts`; saga handles API calls for login/logout
- `duck/entity/` — normalised entity cache powered by normalizr; `entity.middleware.ts` intercepts actions with `meta.schema`, normalises payload, dispatches `entityLoaded`
- `duck/store/` — active store selection (persisted via cookies)
- `duck/terminal/` — active terminal selection
- `duck/shortcuts/` — keyboard shortcut display state
- `duck/touch/` — touch mode flag
- `duck/progress/` — global loading progress indicator

**Jotai Atoms (POS UI State):**
- Location: `front/src/store/jotai.ts`
- `defaultState` atom (`atomWithStorage`, key `pos-state`) — full POS cart state: `added` (CartItem[]), `selected`, `quantity`, `rate`, `discount`, `tax`, `customer`, `orderId`, `adjustment`, etc.
- `defaultData` atom (`atomWithStorage`, key `pos-default-data`) — POS configuration: `defaultTax`, `defaultDiscount`, `defaultPaymentType`, `enableShortcuts`, `enableTouch`, `defaultMode`, `searchBox`, `customerBox`
- These atoms are persisted to localStorage; they drive the live POS terminal UI

**Application Shell:**
- Frontend app: `front/src/app-frontend/` — POS terminal UI
- Admin app: `front/src/app-admin/` — admin dashboard (users, reports, settings)
- Shared components: `front/src/app-common/` — reusable UI components shared by both apps

**Frontend Component Categories:**
- `app-frontend/components/cart/` — cart display, item management
- `app-frontend/components/sale/` — sale operations: `sale.tsx`, `sale.history.tsx`, `sale.print.tsx`, `sale.closing.tsx`, `apply.discount.tsx`, `apply.tax.tsx`, `expenses.tsx`, `view.order.tsx`
- `app-frontend/components/search/` — product search
- `app-frontend/components/modes/` — POS modes (PosMode, PaymentMode)
- `app-frontend/components/settings/` — settings management pages (brands, categories, departments, discounts, items, payment-types, stores, taxes, terminals, users, dynamic-barcodes)
- `app-frontend/components/inventory/` — purchase, purchase-orders, supplier management
- `app-frontend/components/customers/` — customer management
- `app-common/components/table/`, `modal/`, `input/`, `loader/`, `confirm/`, `tabs/` — shared generic UI primitives

**Routing:**
- Frontend routes: `front/src/app-frontend/routes/frontend.routes.ts` — `LOGIN`, `FORGOT_PASSWORD`, `POS`, `POS_V2`, `DASHBOARD`
- Admin routes: `front/src/app-admin/routes/`

**GraphQL (partial):**
- Location: `front/src/api/graphql/terminals.ts`
- Apollo Client is configured for GraphQL; only terminals endpoint uses it currently; most data fetching uses REST via TanStack Query

---

## Data Flow

**Read Flow (list endpoint via Admin REST):**

1. User interacts with admin UI component
2. `useApi(key, url, filters)` hook (TanStack Query) fires `jsonRequest()` GET to `/api/admin/<domain>/list`
3. `request.ts` adds JWT bearer token from cookie
4. Controller method (`e.g., OrderController::list`) receives request
5. `OrderRequestListDto::createFromRequest($request)` deserialises query params
6. `GetOrdersListQuery` is populated via `$requestDto->populateQuery($query)`
7. `GetOrdersListQueryHandler::handle($query)` builds Doctrine QueryBuilder, applies filters, returns paginated `Paginator`
8. `OrderListResponseDto::createFromResult($result)` shapes the response
9. `ApiResponseFactory::json($responseDto)` serialises and returns JSON

**Write Flow (create endpoint via Admin REST):**

1. User submits form in React component
2. `jsonRequest(ORDER_CREATE, { method: 'POST', body: JSON.stringify(data) })` is called
3. `ApiRequestDtoValidator::validate($requestDto)` runs Symfony validator; returns 422 with errors if invalid
4. `CreateOrderRequestDto::createFromRequest($request)` deserialises body
5. `CreateOrderCommand` is populated via `$requestDto->populateCommand($command)`
6. `CreateOrderCommandHandler::handle($command)` creates entity, validates with Symfony Validator, persists to DB
7. Result checked: `hasValidationError()` or `isNotFound()` → appropriate HTTP error response
8. On success, `OrderResponseDto::createFromOrder($result->getOrder())` is returned

**POS Cart Flow (Jotai):**

1. Cashier scans/selects product in `app-frontend/components/search/`
2. Product added to `defaultState.added` (CartItem[]) via `useAtom(defaultState)` setter
3. `pos.tsx` computes `subTotal()`, `taxTotal()`, `discountTotal()`, `finalTotal()` from cart items
4. On sale complete, `ORDER_CREATE` API call is made with the cart contents
5. On success, cart is cleared and sale is recorded

**Authentication Flow:**

1. User submits login form → POST to `LOGIN` (`/api/auth/login_check`)
2. LexikJWT bundle returns JWT token
3. `authenticateUser` saga calls `getAuthInfo()` → `AUTH_INFO` endpoint
4. On success: `userAuthenticated` action dispatched; store and terminal loaded from cookies into Redux

---

## Key Abstractions

**CommandHandler:**
- Purpose: Encapsulates all write business logic for one operation
- Examples: `back/src/Core/Order/Command/CreateOrderCommand/CreateOrderCommandHandler.php`, `back/src/Core/Brand/Command/CreateBrandCommand/CreateBrandCommandHandler.php`
- Pattern: extends `EntityManager`, implements `<Action><Domain>CommandHandlerInterface`; single `handle(Command): Result` method

**QueryHandler:**
- Purpose: Encapsulates all read/filter logic for one query type; returns paginated results
- Examples: `back/src/Core/Brand/Query/SelectBrandQuery/SelectBrandQueryHandler.php`, `back/src/Core/Order/Query/GetOrdersListQuery/GetOrdersListQueryHandler.php`
- Pattern: extends `EntityRepository`, implements `<Action><Domain>QueryHandlerInterface`; builds Doctrine QueryBuilder from Query object fields

**CommandResult / QueryResult:**
- Purpose: Typed return values carrying either the entity/data or error state
- Pattern: Plain class using `CqrsResultValidationTrait` and `CqrsResultEntityNotFoundTrait`; controller checks `hasValidationError()`, `isNotFound()` before accessing payload

**RequestDto:**
- Purpose: Bridge between HTTP request and Command/Query objects; carries validation rules
- Pattern: `static createFromRequest(Request)` + `populateCommand(Command)` or `populateQuery(Query)` methods

**useApi hook:**
- Purpose: Standardised TanStack Query wrapper for all admin list/filter endpoints
- Location: `front/src/api/hooks/use.api.ts`
- Pattern: `useApi<T>(key, url, initialFilters)` returns `{ data, isLoading, handleFilterChange, handlePageChange, fetchData, ... }`

---

## Entry Points

**Backend HTTP Entry Point:**
- Location: `back/public/index.php`
- Triggers: Every HTTP request to the Symfony kernel
- Responsibilities: Boot Symfony kernel, handle request, send response

**Backend Console Entry Point:**
- Location: `back/bin/console`
- Triggers: CLI commands, including CRUD code generation (`src/Command/Crud/`)

**Frontend Entry Point:**
- Location: `front/index.html` + `front/src/` (Vite build)
- Root component mounts Redux Provider, React Query Client, Router, and Jotai Provider

---

## Error Handling

**Strategy:** Explicit result-object checking in controllers; no exceptions bubble to HTTP layer for business logic errors

**Patterns:**
- Validation errors → `CommandResult::hasValidationError()` → `ApiResponseFactory::validationError()` → HTTP 422
- Not found → `CommandResult::isNotFound()` → `ApiResponseFactory::notFound()` → HTTP 404
- Auth failure → `ApiAuthenticator::onAuthenticationFailure()` → HTTP 401
- Frontend: TanStack Query errors trigger `notify({ type: 'error', ... })` toast via `app-common/components/confirm/notification`

---

## Cross-Cutting Concerns

**Logging:** `EventSubscriber/LoggerSubscriber.php`
**Validation (backend):** Symfony Validator with annotations on entities and DTOs; custom constraints in `back/src/Core/Validation/Custom/` (`ConstraintValidEntity`, `ConstraintBelongsToMe`)
**Authentication:** JWT (LexikJWT) for stateless API; token attached as `Authorization: Bearer` header by frontend `request.ts`; `X-AUTH-TOKEN` header used by `ApiAuthenticator` for token-based routes
**Soft Deletes:** `deletedAt` field on entities via `TimestampableTrait`; entities are never hard-deleted, `isDeleted` flag used on Orders
**Audit Logging:** Gedmo Loggable + Versioned annotations on Order fields
**Stock Updates on Purchase:** `EventSubscriber/Purchase/PurchaseEvent.php` handles PMP (Prix Moyen Pondéré) cost recalculation and store quantity updates

---

*Architecture analysis: 2026-02-17*
