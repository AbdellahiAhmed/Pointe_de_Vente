# Phase 2: Data Model Corrections - Research

**Researched:** 2026-02-17
**Domain:** Doctrine ORM schema migrations, DQL query corrections, MariaDB 10.6 type system
**Confidence:** HIGH

## Summary

Phase 2 addresses three confirmed data integrity bugs that corrupt all downstream reporting: (1) revenue reports include suspended/parked orders in totals, (2) Closing entity stores financial figures as `float` causing rounding errors in cash reconciliation, and (3) the profit report reads live `Product.cost` instead of a snapshotted cost-at-sale, meaning historical profit changes retroactively when costs are updated.

The codebase uses Doctrine ORM 2.x with annotation-based mapping on Symfony 5.4 and MariaDB 10.6. Migrations use `doctrine/doctrine-migrations-bundle ^3.2`. The existing Phase 1 migration (`Version20260217000001.php`) already demonstrates the pattern for data migrations in this project.

**Primary recommendation:** Create two Doctrine migrations -- one for schema changes (Closing float-to-decimal, add OrderProduct.costAtSale), one for data backfill (populate costAtSale from current Product.cost) -- then fix all ReportController queries to filter `o.isSuspended != true` and use `op.costAtSale` instead of `prod.cost`. Separately, fix the `Core/Discont/` typo namespace and migrate `User.roles` from PHP serialized `array` to `json` type.

## Standard Stack

### Core (already installed -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| doctrine/orm | ^2.10 | Entity mapping, DQL queries | Already in use, handles all DB access |
| doctrine/doctrine-migrations-bundle | ^3.2 | Schema version control | Already in use, generates migration classes |
| doctrine/dbal | (transitive) | Database abstraction, column types | Provides the `decimal` type mapping |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gedmo/doctrine-extensions | ^3.4 | Timestampable, SoftDeleteable, Loggable | Already configured; OrderProduct uses `@Gedmo\Loggable` |

**Installation:** No new packages needed. All changes are to existing entity annotations and migration files.

## Architecture Patterns

### Migration Execution in Docker
Migrations run inside the Docker container `dev-php-polymer` with mount path `/var/www/html/polymer/`. The command pattern is:

```bash
# Generate a migration diff from entity changes
docker exec dev-php-polymer php /var/www/html/polymer/bin/console doctrine:migrations:diff

# Run pending migrations
docker exec dev-php-polymer php /var/www/html/polymer/bin/console doctrine:migrations:migrate --no-interaction

# Validate schema is in sync
docker exec dev-php-polymer php /var/www/html/polymer/bin/console doctrine:schema:validate
```

### Existing CQRS Pattern
The codebase follows a Command/Query pattern:
```
src/Core/{Entity}/Command/{ActionCommand}/ -> CommandHandler, Command, CommandResult, Interface
src/Core/{Entity}/Query/{QueryName}/       -> QueryHandler, Query, QueryResult, Interface
```
Services are auto-wired from `src/` via `services.yaml`. Interface-to-implementation binding happens automatically through Symfony's autowiring with the `App\` namespace resource.

### Entity Annotation Pattern (Doctrine ORM 2.x)
All entities use annotation-based mapping (NOT attributes). Example of the decimal type already in use:

```php
// Source: back/src/Entity/OrderProduct.php (line 53)
/**
 * @ORM\Column(type="decimal", precision=20, scale=2)
 */
private $price;
```

The project consistently uses `precision=20, scale=2` for financial columns in OrderProduct, OrderPayment, OrderDiscount, and Order.adjustment. The Closing entity is the outlier using `type="float"`.

### Project Structure for This Phase
```
back/
├── src/
│   ├── Entity/
│   │   ├── Closing.php           # CHANGE: 5 float columns -> decimal(20,2)
│   │   ├── OrderProduct.php      # CHANGE: add costAtSale decimal(20,2) column
│   │   ├── Product.php           # VERIFY: cost is already decimal(20,2) -- NO CHANGE NEEDED
│   │   └── User.php              # CHANGE: roles type="array" -> type="json"
│   ├── Core/
│   │   ├── Discont/              # DELETE: move to Core/Discount/
│   │   ├── Discount/             # EXISTS: already has Update/Delete/Query, needs Create moved here
│   │   ├── Closing/Command/      # CHANGE: float types -> string in Command DTOs
│   │   └── Order/Command/CreateOrderCommand/
│   │       └── CreateOrderCommandHandler.php  # CHANGE: snapshot costAtSale
│   ├── Controller/Api/Admin/
│   │   └── ReportController.php  # CHANGE: add isSuspended filter to ALL queries
│   └── Repository/
│       └── ClosingRepository.php # VERIFY: no custom queries to fix
├── migrations/
│   └── VersionXXXX.php           # NEW: schema + data migration(s)
```

## Critical Findings from Codebase Analysis

### Finding 1: Product.cost is ALREADY decimal(20,2) -- NOT a string
**Confidence:** HIGH (verified in entity source)

The phase description mentions "Product.cost string->decimal" but inspection of `Product.php` line 96 shows:
```php
/**
 * @ORM\Column(type="decimal", precision=20, scale=2, nullable=true)
 */
private $cost;
```
The getter returns `?string` (which is correct -- Doctrine decimal maps to PHP string to avoid float precision loss). **No migration needed for Product.cost.** The roadmap item may have been based on stale analysis.

### Finding 2: Closing entity has 5 float columns
**Confidence:** HIGH (verified in entity source)

All five financial fields in `Closing.php` use `type="float"`:
- `openingBalance` (line 49)
- `closingBalance` (line 55)
- `cashAdded` (line 61)
- `cashWithdrawn` (line 67)
- `expenses` (line 91)

These MUST be migrated to `decimal(20,2)`. The `float` type maps to MySQL/MariaDB `DOUBLE` which has well-documented precision issues for financial calculations. The `decimal` type maps to `DECIMAL(20,2)` which stores exact values.

### Finding 3: OrderProduct has NO costAtSale column
**Confidence:** HIGH (verified in entity source)

`OrderProduct.php` has: `id`, `product` (FK), `variant` (FK), `quantity`, `price`, `isSuspended`, `isDeleted`, `isReturned`, `order` (FK), `discount`, `taxes`. No cost field exists.

The profit report in `ReportController::profit()` (line 131) uses:
```php
'COALESCE(SUM(COALESCE(prod.cost, 0) * op.quantity), 0) as totalCost'
```
This joins to the live `Product.cost`, meaning if a product's cost changes, ALL historical profit reports change retroactively. This is the confirmed bug.

### Finding 4: ReportController has NO isSuspended filter
**Confidence:** HIGH (verified in controller source)

All three report endpoints (`sales`, `profit`, `daily`) filter:
- `o.isDeleted = false` -- YES, present
- `o.isReturned = false` -- YES, present (in revenue queries)
- `o.isSuspended != true` -- **MISSING** from ALL queries

A suspended order (parked sale) has `isSuspended = true` and `status = 'On Hold'`. These are orders a cashier started but did not complete. They should NOT count in revenue. Currently they DO count because the only filters are `isDeleted` and `isReturned`.

Additionally, the payment breakdown queries in `sales()` (line 78) and `daily()` (line 247) do NOT filter `o.isReturned = false`, meaning returned order payments are included in payment totals.

### Finding 5: Closing queries have NO terminal/session scoping for Z-Report
**Confidence:** HIGH (verified in query handler source)

The `SelectClosingQueryHandler` (the list query) filters by exact field matches but has no built-in terminal or store scoping. The `ClosingController::getOpened()` method correctly scopes by store AND terminal, but the `list` endpoint and the `SelectClosingQuery` do not filter by store or terminal by default.

For Z-Report (DATA-03), the key issue is that when computing session totals, orders must be filtered to the specific terminal's session time window (`dateFrom` to `dateTo` or `closedAt`). Currently there is NO query that computes session-scoped order totals -- this will need to be built or the existing report queries will need to accept terminal/session parameters.

### Finding 6: Core/Discont/ namespace typo
**Confidence:** HIGH (verified in filesystem)

Four files exist under `src/Core/Discont/Command/CreateDiscountCommand/`:
- `CreateDiscountCommand.php`
- `CreateDiscountCommandHandler.php`
- `CreateDiscountCommandHandlerInterface.php`
- `CreateDiscountCommandResult.php`

Two DTO files reference this typo namespace:
- `CreateDiscountRequestDto.php` (line 7): `use App\Core\Discont\Command\CreateDiscountCommand\CreateDiscountCommand;`
- `UpdateDiscountRequestDto.php` (line 7): `use App\Core\Discont\Command\CreateDiscountCommand\CreateDiscountCommand;`

There is no DiscountController -- Discount CRUD seems to be handled entirely through ApiPlatform auto-routing on the entity. The command handlers are used by the DTOs for custom create/update flows.

### Finding 7: User.roles uses PHP serialized array type
**Confidence:** HIGH (verified in entity source)

`User.php` line 99:
```php
/**
 * @ORM\Column(type="array")
 */
private $roles = [];
```

Doctrine `type="array"` stores data as PHP `serialize()` format (e.g., `a:1:{i:0;s:13:"ROLE_VENDEUR";}`). This is fragile and non-portable. Changing to `type="json"` stores as standard JSON (e.g., `["ROLE_VENDEUR"]`). The Phase 1 migration already handled the ROLE_USER to ROLE_VENDEUR rename using serialized string replacement.

**Migration path:** Change annotation to `type="json"`, then run a data migration that reads the serialized values and writes them as JSON. The PHP getter/setter interface (`array`) stays identical -- only the storage format changes.

### Finding 8: Closing entity DTO chain uses float types
**Confidence:** HIGH (verified in DTO source)

The `ClosingDto.php`, `CreateClosingCommand.php`, `SelectClosingQuery.php`, and `UpdateClosingCommand.php` all use `?float` type hints for the financial fields. When Closing entity changes to `decimal`, Doctrine will return PHP `string` values (like OrderProduct.price already does). The DTOs and Commands need their type hints updated from `?float` to `?string` to match, and the ClosingDto should be updated to return string values to the frontend.

**Frontend impact:** The `Closing` TypeScript interface (`front/src/api/model/closing.ts`) types these as `number`. JSON-serialized `string` decimals will need `parseFloat()` on the frontend, OR the backend DTO can cast to float for JSON serialization (losing the point of decimal precision). **Recommendation:** Keep backend DTO returning `float` for JSON response (the precision benefit is in storage and SQL computation, not in JSON transport where floats are fine for 2 decimal places).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema migrations | Raw SQL ALTER TABLE | `doctrine:migrations:diff` | Generates idempotent up/down, tracks version |
| Decimal precision | PHP bcmath calculations | MariaDB DECIMAL(20,2) in SQL | Database handles precision; Doctrine returns string |
| Data backfill (costAtSale) | PHP loop with flush | Single `UPDATE` SQL in migration | One statement is atomic and fast vs. N+1 entity loads |
| Namespace refactoring | Manual find-replace | IDE refactoring or careful grep+sed | Must update namespace declarations, use statements, and service references |

**Key insight:** The float-to-decimal migration and costAtSale backfill are pure SQL operations. They should NOT be done through Doctrine entity hydration because that would load every row into PHP memory. A single `ALTER TABLE` + `UPDATE` SQL is the correct approach.

## Common Pitfalls

### Pitfall 1: Float-to-Decimal Data Conversion Loss
**What goes wrong:** `ALTER TABLE closing MODIFY opening_balance DECIMAL(20,2)` silently rounds existing float values. For example, `99.99` stored as IEEE 754 float might be `99.98999999999999` and round to `99.99` (fine) or `100.00` (bad if near boundary).
**Why it happens:** MariaDB `DOUBLE` stores approximately 15-17 significant digits. `DECIMAL(20,2)` stores exactly 2 decimal places with rounding.
**How to avoid:** MariaDB `CAST(column AS DECIMAL(20,2))` uses standard banker's rounding. For financial data that was already meant to be 2 decimal places, this is safe. Run a pre-migration check query to identify any values that would round differently than expected.
**Warning signs:** Values ending in long decimal sequences (e.g., `1234.5600000000001`).

### Pitfall 2: Nullable columns in aggregate queries
**What goes wrong:** `SUM(op.costAtSale * op.quantity)` returns NULL if ANY row has NULL costAtSale.
**Why it happens:** SQL NULL propagation. `NULL * 5 = NULL`, and `SUM` over a set containing NULL just ignores them, but if ALL are NULL, result is NULL.
**How to avoid:** Use `COALESCE(op.costAtSale, 0)` in the query, matching the existing pattern already used for `prod.cost` in the current queries. Also backfill existing rows in the migration.
**Warning signs:** Profit report showing NULL or 0 after migration.

### Pitfall 3: PHP serialized array to JSON migration
**What goes wrong:** Simply changing `type="array"` to `type="json"` in the entity without a data migration causes a fatal error. Doctrine will try to `json_decode()` a PHP-serialized string.
**Why it happens:** The storage format changes from `a:1:{i:0;s:13:"ROLE_VENDEUR";}` to `["ROLE_VENDEUR"]`. Existing rows still have the old format.
**How to avoid:** Two-step approach: (1) run migration that converts all rows from serialized to JSON format, (2) then change entity annotation. OR: do it in one migration that runs SQL to convert, then the entity change is safe for new writes.
**Warning signs:** `json_decode` errors, empty roles arrays, login failures.

**Migration SQL pattern for serialized-to-JSON:**
```sql
-- MariaDB does not have a native unserialize function.
-- Safest approach: read in PHP, convert, write back.
-- In the migration's up() method, use raw PHP:
```
```php
public function up(Schema $schema): void
{
    // Step 1: Change column type to LONGTEXT temporarily if needed
    // Step 2: Convert data using PHP
    $rows = $this->connection->fetchAllAssociative('SELECT id, roles FROM user_account');
    foreach ($rows as $row) {
        $roles = unserialize($row['roles']);
        $json = json_encode($roles);
        $this->connection->executeStatement(
            'UPDATE user_account SET roles = ? WHERE id = ?',
            [$json, $row['id']]
        );
    }
    // The column type change from array to json maps to the same DB type
    // (both are LONGTEXT in MariaDB), so no ALTER TABLE needed for the column itself.
}
```

**Important:** Doctrine `type="array"` and `type="json"` both map to the same MariaDB column type (`LONGTEXT` or `JSON` depending on version). The difference is purely in PHP serialization. The migration only needs to convert the DATA, not the column type.

### Pitfall 4: isSuspended is nullable boolean
**What goes wrong:** Filtering with `o.isSuspended = false` misses rows where `isSuspended IS NULL`.
**Why it happens:** The column is `nullable=true` (see Order.php line 62). Many orders created before isSuspended was added, or completed orders, may have NULL rather than false.
**How to avoid:** Use `(o.isSuspended IS NULL OR o.isSuspended = false)` or equivalently `o.isSuspended != true` (which correctly excludes only rows where isSuspended is explicitly true, and includes both NULL and false).
**Warning signs:** Completed orders disappearing from reports.

### Pitfall 5: Closing DTO float type hints after decimal migration
**What goes wrong:** After changing Closing entity from float to decimal, Doctrine returns string values. But `CreateClosingCommand`, `UpdateClosingCommand`, `SelectClosingQuery`, and `ClosingDto` all have `?float` type hints on getters/setters. PHP strict types would fail.
**Why it happens:** The file headers don't declare `strict_types=1`, so PHP will silently coerce. But it's still wrong practice and may cause subtle precision loss during the coercion.
**How to avoid:** Update the Command/Query/DTO type hints from `?float` to `?string` for all financial fields. In the ClosingDto that builds the JSON response, cast to `(float)` at serialization time so the frontend receives numbers.
**Warning signs:** Financial values silently losing precision on round-trips.

### Pitfall 6: Namespace refactoring breaks autowiring
**What goes wrong:** Moving `Core/Discont/` to `Core/Discount/` breaks the interface-to-implementation autowiring because Symfony caches service definitions.
**Why it happens:** The Symfony container autowires `CreateDiscountCommandHandlerInterface` to `CreateDiscountCommandHandler`. If the namespace changes but the cache is stale, the old class name is still referenced.
**How to avoid:** After renaming, clear the Symfony cache: `docker exec dev-php-polymer php /var/www/html/polymer/bin/console cache:clear`. Also update ALL `use` statements that reference the old namespace (found in: `CreateDiscountRequestDto.php`, `UpdateDiscountRequestDto.php`).
**Warning signs:** "Class not found" errors for CreateDiscountCommandHandler.

## Code Examples

### Example 1: Closing Entity Decimal Migration (annotation change)
```php
// Source: verified pattern from OrderProduct.php and OrderPayment.php
// BEFORE (Closing.php):
/**
 * @ORM\Column(type="float", nullable=true)
 */
private $openingBalance;

// AFTER:
/**
 * @ORM\Column(type="decimal", precision=20, scale=2, nullable=true)
 */
private $openingBalance;
```

### Example 2: Adding costAtSale to OrderProduct
```php
// Source: pattern from existing OrderProduct decimal columns
/**
 * @ORM\Column(type="decimal", precision=20, scale=2, nullable=true)
 * @Groups({"order.read","customer.read"})
 */
private $costAtSale;

public function getCostAtSale(): ?string
{
    return $this->costAtSale;
}

public function setCostAtSale(?string $costAtSale): self
{
    $this->costAtSale = $costAtSale;
    return $this;
}
```

### Example 3: Snapshotting costAtSale in CreateOrderCommandHandler
```php
// Source: back/src/Core/Order/Command/CreateOrderCommand/CreateOrderCommandHandler.php
// In the foreach($command->getItems() ...) loop, after line 97:
$orderProduct->setProduct($product);
$orderProduct->setCostAtSale($product->getCost()); // Snapshot cost at sale time
$orderProduct->setDiscount($itemDto->getDiscount());
```

### Example 4: isSuspended filter in ReportController
```php
// Source: back/src/Controller/Api/Admin/ReportController.php
// Add to EVERY query builder that computes revenue/profit/counts:
->andWhere('o.isSuspended IS NULL OR o.isSuspended = false')
// OR equivalently:
->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
// OR the simplest DQL approach (Doctrine handles NULL correctly with != ):
->andWhere('o.isSuspended != :suspended')->setParameter('suspended', true)
// Note: In DQL, != with a parameter correctly excludes TRUE and includes NULL and FALSE.
```

### Example 5: Profit query using costAtSale
```php
// BEFORE (ReportController::profit, line 131):
'COALESCE(SUM(COALESCE(prod.cost, 0) * op.quantity), 0) as totalCost'
// ...
->join('op.product', 'prod')

// AFTER:
'COALESCE(SUM(COALESCE(op.costAtSale, 0) * op.quantity), 0) as totalCost'
// The join to 'prod' can be removed from cost calculation (but may still be needed
// for other fields like prod.name in top products query)
```

### Example 6: Backfill migration SQL
```sql
-- Populate costAtSale for existing OrderProduct rows
-- Uses current Product.cost (approximate for historical, exact going forward)
UPDATE order_product op
INNER JOIN product p ON op.product_id = p.id
SET op.cost_at_sale = COALESCE(p.cost, 0);
```

### Example 7: Float-to-decimal migration SQL
```sql
-- Closing financial columns: float -> decimal(20,2)
ALTER TABLE closing
  MODIFY opening_balance DECIMAL(20,2) DEFAULT NULL,
  MODIFY closing_balance DECIMAL(20,2) DEFAULT NULL,
  MODIFY cash_added DECIMAL(20,2) DEFAULT NULL,
  MODIFY cash_withdrawn DECIMAL(20,2) DEFAULT NULL,
  MODIFY expenses DECIMAL(20,2) DEFAULT NULL;
```

## Detailed Inventory of Required Changes

### Plan 02-01: Schema Migrations

| File | Change | Impact |
|------|--------|--------|
| `Entity/Closing.php` | 5 fields: `type="float"` -> `type="decimal", precision=20, scale=2` | DB column type change |
| `Entity/OrderProduct.php` | Add `costAtSale` decimal(20,2) nullable column | New column + getter/setter |
| `Entity/User.php` | `type="array"` -> `type="json"` on roles | Storage format change |
| `Core/Closing/Command/CreateClosingCommand/CreateClosingCommand.php` | `?float` -> `?string` for 4 financial fields | Type hint update |
| `Core/Closing/Command/UpdateClosingCommand/UpdateClosingCommand.php` | `?float` -> `?string` for financial fields | Type hint update |
| `Core/Closing/Query/SelectClosingQuery/SelectClosingQuery.php` | `?float` -> `?string` for financial fields | Type hint update |
| `Core/Dto/Common/Closing/ClosingDto.php` | `?float` -> `?string` for financial properties, keep `(float)` cast in `createFromClosing` | DTO type update |
| `Core/Discont/` (4 files) | Move to `Core/Discount/Command/CreateDiscountCommand/` | Namespace fix |
| `Core/Dto/.../CreateDiscountRequestDto.php` | Update `use` from `Discont` to `Discount` | Import fix |
| `Core/Dto/.../UpdateDiscountRequestDto.php` | Update `use` from `Discont` to `Discount` | Import fix |
| `migrations/VersionXXXX.php` | Schema migration: ALTER closing, ADD order_product.cost_at_sale | New file |
| `migrations/VersionXXXY.php` | Data migration: backfill costAtSale, convert User.roles serialized->JSON | New file |

### Plan 02-02: Query Fixes

| File | Change | Impact |
|------|--------|--------|
| `Controller/Api/Admin/ReportController.php` `sales()` | Add `isSuspended` filter to order count query (qb) | Bug fix DATA-01 |
| `Controller/Api/Admin/ReportController.php` `sales()` | Add `isSuspended` filter to revenue query (qb2) | Bug fix DATA-01 |
| `Controller/Api/Admin/ReportController.php` `sales()` | Add `isSuspended` filter + `isReturned` filter to payment query (qb3) | Bug fix DATA-01 |
| `Controller/Api/Admin/ReportController.php` `profit()` | Add `isSuspended` filter to profit query (qb) | Bug fix DATA-01 |
| `Controller/Api/Admin/ReportController.php` `profit()` | Add `isSuspended` filter to top products query (qb2) | Bug fix DATA-01 |
| `Controller/Api/Admin/ReportController.php` `profit()` | Change `prod.cost` to `op.costAtSale` in both queries | Bug fix (cost accuracy) |
| `Controller/Api/Admin/ReportController.php` `daily()` | Add `isSuspended` filter to ALL 4 queries | Bug fix DATA-01 |
| `Controller/Api/Admin/ReportController.php` `daily()` | Change `prod.cost` to `op.costAtSale` in revenue query | Bug fix (cost accuracy) |
| `Controller/Api/Admin/ReportController.php` `daily()` | Add `isSuspended` + `isReturned` filter to payment query | Bug fix DATA-01 |

### Z-Report Session Scoping (DATA-03)
The current codebase does NOT have a Z-Report query endpoint. The Closing entity stores session metadata (`dateFrom`, `dateTo`, `terminal`, `store`) but there is no query that computes "orders for THIS closing session." For DATA-03, the ReportController or ClosingController needs a method that:
1. Takes a closing ID (or terminal + date range)
2. Queries orders WHERE `o.terminal = :terminal AND o.createdAt BETWEEN :dateFrom AND :dateTo`
3. Filters `o.isSuspended != true AND o.isDeleted = false`

This is a new query, not a fix to an existing one. The `SelectClosingQueryHandler` only queries Closing entities themselves, not the orders within a session.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Doctrine `type="array"` (PHP serialize) | Doctrine `type="json"` | Doctrine 2.6+ | JSON is portable, readable, queryable |
| `float` for money | `decimal(precision, scale)` for money | Industry standard | Eliminates IEEE 754 rounding errors |
| Live cost lookup for profit | Snapshot cost at sale time | POS industry standard | Historical accuracy preserved |

**Deprecated/outdated:**
- `type="array"`: Still supported but discouraged. Stores opaque PHP serialized data that cannot be queried by the database and is not portable across languages.

## Open Questions

1. **Closing DTO return type for financial fields**
   - What we know: Changing entity to decimal means Doctrine returns strings. Frontend expects numbers.
   - What's unclear: Should the DTO cast to float for JSON (loses precision intent but is backward-compatible) or return strings (breaking frontend)?
   - Recommendation: Cast to `(float)` in DTO for JSON serialization. The precision benefit is in SQL storage/computation, not JSON transport. This avoids any frontend changes in this phase.

2. **costAtSale backfill accuracy**
   - What we know: Existing orders have no cost snapshot. Current Product.cost is the only available value.
   - What's unclear: How much historical cost has changed. Some products may have had very different costs in the past.
   - Recommendation: Backfill with current cost (best available), accept historical approximation, document in code comments. Phase 3 (PMP) will ensure correct going forward.

3. **Z-Report query location**
   - What we know: No Z-Report computation endpoint exists. Closing entity has session boundaries.
   - What's unclear: Should the Z-Report query live in ReportController or ClosingController?
   - Recommendation: Add to ClosingController since it's session-scoped data. But this can be deferred to Phase 5 (Z-Report UI) if Phase 2 just ensures DATA-03 by adding terminal/session filters to existing queries. For Phase 2, the minimum is to ensure the closing list query can filter by store/terminal.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all entity files, controllers, and DTOs
- `back/src/Entity/Closing.php` -- 5 float columns confirmed
- `back/src/Entity/OrderProduct.php` -- no costAtSale column confirmed
- `back/src/Entity/Product.php` -- cost is already decimal(20,2), NOT string
- `back/src/Controller/Api/Admin/ReportController.php` -- no isSuspended filter in any query
- `back/src/Entity/User.php` -- roles is type="array" (PHP serialized)
- `back/src/Core/Discont/` -- typo namespace confirmed with 4 files + 2 referencing DTOs
- `back/src/Core/Closing/Command/` -- float type hints in Commands/Queries

### Secondary (MEDIUM confidence)
- MariaDB 10.6 documentation: DECIMAL type stores exact numeric values with specified precision
- Doctrine ORM 2.x documentation: `type="decimal"` maps to DECIMAL in MySQL/MariaDB, returns PHP string
- Doctrine ORM 2.x documentation: `type="json"` and `type="array"` both use LONGTEXT/JSON column type, differ in PHP serialization

### Tertiary (LOW confidence)
- None. All findings are from direct code inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all changes to existing code
- Architecture: HIGH - follows existing codebase patterns exactly
- Pitfalls: HIGH - all pitfalls identified through direct code analysis, not speculation
- Product.cost finding: HIGH - contradicts phase description but entity source is authoritative

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable -- Doctrine 2.x and Symfony 5.4 are in maintenance mode)
