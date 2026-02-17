# Coding Conventions

**Analysis Date:** 2026-02-17

## Overview

This is a dual-codebase project: PHP/Symfony backend (`back/`) and TypeScript/React frontend (`front/`). Each side has its own conventions, described separately below.

---

## Backend (PHP/Symfony) Conventions

### Naming Patterns

**Files:**
- Entity classes: PascalCase, e.g., `Brand.php`, `ProductVariant.php` — in `back/src/Entity/`
- Command/Query classes: PascalCase with suffix, e.g., `CreateBrandCommand.php`, `SelectBrandQuery.php`
- Handlers: PascalCase + `Handler` suffix, e.g., `CreateBrandCommandHandler.php`
- Handler interfaces: same as handler + `Interface` suffix, e.g., `CreateBrandCommandHandlerInterface.php`
- Result objects: PascalCase + `Result` suffix, e.g., `CreateBrandCommandResult.php`
- DTOs: PascalCase + `Dto` or `RequestDto` / `ResponseDto` suffix, e.g., `CreateBrandRequestDto.php`, `BrandResponseDto.php`
- Controllers: PascalCase + `Controller` suffix, e.g., `ProductController.php`
- Traits: PascalCase + `Trait` suffix, e.g., `TimestampableTrait.php`, `CqrsResultValidationTrait.php`

**Classes:**
- PascalCase for all classes, traits, and interfaces
- No abbreviations; names spell out full domain words (`CreateBrandCommand`, not `CreateBrandCmd`)

**Methods:**
- camelCase
- Getters: `get{Property}()` — e.g., `getName()`, `getStores()`
- Setters: `set{Property}(?Type $value)` — always return `self` in entity setters for fluent chaining
- Boolean getters: `is{Property}()` — e.g., `isActive()`, `isNotFound()`, `hasValidationError()`
- Collection add/remove: `add{Item}()` / `remove{Item}()` — e.g., `addStore()`, `removeStore()`
- Static factory methods: `createFrom{Source}()` — e.g., `createFromRequest()`, `createFromConstraintViolations()`, `createNotFound()`

**Properties:**
- camelCase, no type declarations at property level (PHP 7.4 style using `@var` PHPDoc)
- Initialized to `null` by default in command/DTO classes: `private $name = null;`

**Namespaces:**
- Follow PSR-4: `App\` root maps to `back/src/`
- Example: `App\Core\Brand\Command\CreateBrandCommand\CreateBrandCommand`
- Controller namespace: `App\Controller\Api\Admin`
- Core domain namespace: `App\Core\{DomainName}\{Command|Query}\{CommandName}\`
- DTO namespace: `App\Core\Dto\{Common|Controller}\{Area}\{Entity}\`

### Code Style

**Formatting:**
- No `.php-cs-fixer` config found at project root; no automated formatting enforced
- Indentation: 4 spaces
- Opening brace on same line for class/function (Allman-adjacent style observed in some files, K&R in others — inconsistent)
- Blank lines between property blocks and methods
- No trailing comma in function arguments

**PHPDoc:**
- Used for property `@var` type declarations (required, as PHP 7.4 lacks full property typing)
- Used for class-level `@Route` and `@ApiResource` annotations
- Used for `@ORM\Column`, `@ORM\ManyToOne` etc.
- Symfony Serializer `@Groups` annotation on entity properties
- Symfony Validator `@Assert\NotBlank` etc. on DTO properties
- Brief `@return` annotations on collection getters: `@return Collection|Store[]`

### Import Organization

**Order (PHP):**
1. `namespace` declaration
2. Blank line
3. `use` statements, alphabetically grouped:
   - App-specific uses first, then Symfony/Doctrine/vendor
4. Blank line before class declaration

No path aliases — PSR-4 autoloading only.

### CQRS Pattern (Backend Core)

Every domain entity follows this exact structure under `back/src/Core/{DomainName}/`:

```
{DomainName}/
├── Command/
│   ├── Create{Entity}Command/
│   │   ├── Create{Entity}Command.php        # Data bag (setters/getters only)
│   │   ├── Create{Entity}CommandHandler.php # Business logic, extends EntityManager
│   │   ├── Create{Entity}CommandHandlerInterface.php
│   │   └── Create{Entity}CommandResult.php  # Uses CqrsResult traits
│   ├── Update{Entity}Command/
│   └── Delete{Entity}Command/
└── Query/
    └── Select{Entity}Query/
        ├── Select{Entity}Query.php
        ├── Select{Entity}QueryHandler.php   # Extends EntityRepository
        ├── Select{Entity}QueryHandlerInterface.php
        └── Select{Entity}QueryResult.php
```

**Command objects** are plain data bags — no logic, just `private $field = null` + getter/setter pairs.

**CommandHandler** extends `App\Core\Entity\EntityManager\EntityManager` and must implement `getEntityClass(): string`.

**QueryHandler** extends `App\Core\Entity\Repository\EntityRepository` and must implement `getEntityClass(): string`.

**Result objects** use PHP traits:
- `CqrsResultValidationTrait` — provides `hasValidationError()`, `getValidationError()`, static `createFromConstraintViolations()`
- `CqrsResultEntityNotFoundTrait` — provides `isNotFound()`, `getNotFoundMessage()`, static `createNotFound()`

### Controller Pattern (Backend)

Controllers extend `Symfony\Bundle\FrameworkBundle\Controller\AbstractController`.

Class-level `@Route` defines prefix, method-level `@Route` defines path + HTTP methods:

```php
/**
 * @Route("/admin/order", name="admin_orders_")
 */
class OrderController extends AbstractController
{
    /**
     * @Route("/create", methods={"POST"}, name="create")
     */
    public function create(Request $request, ApiRequestDtoValidator $validator, ...) { ... }
}
```

**Standard request/response flow in every controller action:**
1. Parse request via `{Entity}RequestDto::createFromRequest($request)` — static factory
2. Validate with `ApiRequestDtoValidator::validate($requestDto)` → return `$responseFactory->validationError()` if invalid
3. Populate a `{Entity}Command` or `{Entity}Query` via `$requestDto->populateCommand($command)`
4. Call `$handler->handle($command)` — returns a Result object
5. Check `$result->hasValidationError()` → return `$responseFactory->validationError()`
6. Check `$result->isNotFound()` → return `$responseFactory->notFound()`
7. Return `$responseFactory->json($responseDto)`

Use `ApiResponseFactory` (from `App\Factory\Controller\ApiResponseFactory`) — never call `$this->json()` with raw data for complex responses. Simple wrappers like `$this->json([...])` are used for ad-hoc responses.

### DTO Pattern (Backend)

**Request DTOs** (`back/src/Core/Dto/Controller/Api/Admin/{Entity}/`):
- Use `@Assert\` annotations for validation
- Static `createFromRequest(Request $request): self` — parses JSON body via `json_decode($request->getContent(), true)`
- `populateCommand({Entity}Command $command)` — transfers fields to command

**Response DTOs** (`back/src/Core/Dto/Common/{Entity}/`):
- Static `createFrom{Entity}({Entity} $entity): self` factory methods
- Expose only fields needed by the frontend

### Shared Traits (Entity layer)

All entities mix in from `back/src/Entity/Traits/`:
- `TimestampableTrait` — `createdAt`, `updatedAt`, `deletedAt` with Gedmo Timestampable
- `ActiveTrait` — `isActive` boolean with `@Groups({"active.read"})`
- `UuidTrait` — `uuid` field, auto-generated on construct via `Uuid::uuid4()`

Apply all three traits to every new entity unless there is a specific reason not to.

### Validation (Backend)

- DTO-level: Symfony `@Assert\` annotations
- Entity-level: validated in CommandHandler via `$this->validator->validate($item)` before persist
- Violations returned as `CreateBrandCommandResult::createFromConstraintViolations($violations)`, not thrown as exceptions

### Error Handling (Backend)

No exception-based error propagation across layers. Instead:
- Result objects carry success/error state
- Controllers check result state and call the appropriate `ApiResponseFactory` method
- `@chmod` with `@` error suppression is used in one file — this is an existing pattern to be aware of (see CONCERNS)

---

## Frontend (TypeScript/React) Conventions

### Naming Patterns

**Files:**
- Component files: `kebab.case.tsx` — e.g., `create.brand.tsx`, `brands.tsx`, `sale.inline.tsx`
- Hook files: `use.{name}.ts` — e.g., `use.api.ts`, `use.load.list.ts`
- State files: `{slice}.state.ts` — e.g., `auth.state.ts`, `app.state.ts`
- Action files: `{slice}.action.ts` — e.g., `auth.action.ts`
- Reducer files: `{slice}.reducer.ts` — e.g., `auth.reducer.ts`
- Selector files: `{slice}.selector.ts` — e.g., `auth.selector.ts`
- Model/type files: `{entity}.ts` using dot-separated nouns — e.g., `cart.item.ts`, `order.payment.ts`
- Route constant files: `backend.app.ts`, `frontend.routes.ts`
- Exception files: `http.exception.ts`, `validation.exception.ts`

**Components (exports):**
- Named exports using PascalCase: `export const Brands = () => { ... }`
- Props interfaces: PascalCase with `Props` suffix — e.g., `interface CreateBrandProps { ... }`
- Component functions: arrow functions, not `function` declarations

**Hooks:**
- camelCase starting with `use` — e.g., `useLogout`, `useApi`
- Return tuple `[state, action]` for mutation hooks: `const [isLoading, error], logout] = useLogout()`
- Return object for data hooks: `UseApiResult<T>` from `useApi`

**Redux (duck pattern):**
- Actions: `createAction('SCREAMING_SNAKE_CASE')` via `redux-actions`
- Reducers: `handleActions<State, any>({ ... }, INITIAL_STATE)`
- Selectors: `createSelector(...)` via `reselect`
- State type files always export an `INITIAL_STATE` constant

**API Route Constants:**
- SCREAMING_SNAKE_CASE in `back/src/api/routing/routes/backend.app.ts`
- Format: `{ENTITY}_{ACTION}` — e.g., `BRAND_LIST`, `BRAND_CREATE`, `BRAND_EDIT`
- IDs in URLs: `:id` placeholder — e.g., `'/brands/:id'`
- Replaced at call site: `BRAND_EDIT.replace(':id', id)`

**TypeScript Interfaces/Types:**
- PascalCase, prefixed with `I` is NOT used
- Extend Hydra base interfaces: `export interface Brand extends HydraId, HydraType { ... }`
- Props interfaces declared immediately above the component

### Code Style

**Formatting:**
- No `.eslintrc` or `.prettierrc` found at project root (only in node_modules); no enforced auto-formatting
- ESLint config exists only inside `package.json` as `"eslintConfig": { "extends": ["react-app", "react-app/jest"] }` — minimal config
- Indentation: 2 spaces (observed throughout)
- Semicolons: present
- Trailing commas: used in multi-line objects/arrays

**TypeScript:**
- `strict: true` enforced in `front/tsconfig.json`
- `any` is used in some places for complex structures (e.g., column definitions, hook options) — acceptable but not preferred
- Generic components use `FC<Props>` typing: `export const CreateBrand: FC<CreateBrandProps> = (...) => { ... }`

### Import Organization

**Order (TypeScript):**
1. React and react-router imports
2. Third-party libraries (redux, react-query, etc.)
3. Internal modules — `api/`, `duck/`, `lib/`, `app-common/`, `app-frontend/`
4. Types/interfaces last (no explicit type-only imports enforced)

**No path aliases** beyond `common` alias pointing to `src/common` (rarely used). Use relative paths.

### Form Handling Pattern

All forms use `react-hook-form` + `yup` validation:

```typescript
const ValidationSchema = yup.object({
  name: yup.string().required(ValidationMessage.Required),
  stores: yup.array().required(ValidationMessage.Required)
}).required();

const { register, handleSubmit, setError, formState: { errors }, reset, control } = useForm({
  resolver: yupResolver(ValidationSchema)
});
```

Server-side validation errors mapped back to form fields:
```typescript
e.violations.forEach((item: ConstraintViolation) => {
  setError(item.propertyPath, { message: item.message, type: 'server' });
});
```

### API Request Pattern

Use the layered request helpers in `front/src/api/request/request.ts`:
- `request(url, init)` — base, adds JWT Bearer token from cookie
- `jsonRequest(url, init)` — adds `Content-Type: application/json`
- `fetchJson(url, init)` — `jsonRequest` + auto-parse response body as JSON
- `formRequest(url, init)` — for multipart form submissions

For paginated list views, use the `useApi` hook from `front/src/api/hooks/use.api.ts`:
```typescript
const useLoadHook = useApi<HydraCollection<Brand>>("brands", `${BRAND_LIST}?store=${store?.id}`);
const { fetchData, data, isLoading } = useLoadHook;
```
Pass `useLoadHook` directly to `<TableComponent useLoadList={useLoadHook} />`.

### Error Handling (Frontend)

HTTP exceptions are class-based, thrown by the request layer:
- `HttpException` — base class
- `BadRequestException` (400), `UnauthorizedException` (401), `ForbiddenException` (403), `NotFoundException` (404), `UnprocessableEntityException` (422)

Handle in form submit functions with try/catch:
```typescript
try {
  await fetchJson(url, { method, body: JSON.stringify(values) });
} catch (exception: any) {
  if (exception instanceof UnprocessableEntityException) {
    const e: ValidationResult = await exception.response.json();
    e.violations.forEach(item => setError(item.propertyPath, { message: item.message, type: 'server' }));
  }
  // re-throw non-validation exceptions
  throw exception;
}
```

Use `notify({ type: 'error', description: message })` (from `front/src/app-common/components/confirm/notification.ts`) to show toast-style error feedback.

Global unhandled 401 rejection handler in app root — triggers `logoutAction()` automatically.

### State Management (Redux)

Redux store uses the "duck" pattern — each feature has its own folder under `front/src/duck/`:
```
duck/{feature}/
├── {feature}.action.ts
├── {feature}.reducer.ts
├── {feature}.selector.ts
└── {feature}.state.ts
```

Actions created with `createAction` from `redux-actions`. Side effects handled with `redux-saga`. Entity normalization uses `normalizr`.

### Module Design

**Exports:** Named exports preferred; default export only on hook files (e.g., `export default useApi`)

**No barrel `index.ts` files** in component directories — import directly from the file:
```typescript
import { CreateBrand } from './create.brand';
import useApi from '../../../../api/hooks/use.api';
```

### Comments

**Backend:** PHPDoc blocks on class declarations and property types. Inline comments for non-obvious logic (`//validate item before creation`, `//skip header`).

**Frontend:** Inline comments for ESLint disable rules (`// eslint-disable-next-line react-hooks/exhaustive-deps`) and brief explanations of non-obvious logic. No JSDoc on React components.

---

*Convention analysis: 2026-02-17*
