# Phase 5: Z-Report and Extended Reports - Research

**Researched:** 2026-02-17
**Domain:** PDF generation (React), Symfony report aggregation, immutable snapshot persistence, sequential numbering
**Confidence:** HIGH on backend architecture; MEDIUM on @react-pdf/renderer Arabic RTL

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ZRPT-01 | Le Rapport Z a un numéro séquentiel non-réinitialisable | Closing.id (auto-increment) already provides a permanent, never-reset number; add a `zReportNumber` column seeded from a DB sequence or max(id)+1 pattern |
| ZRPT-02 | Le Rapport Z couvre un cycle de session (ouverture → fermeture) par terminal | Closing entity already scopes by terminal + store + closedAt IS NULL; session window = dateFrom → dateTo |
| ZRPT-03 | Rapport Z includes header, sales summary, payment breakdown | ReportController patterns already provide the required DQL queries; Z-Report generates them scoped to closing.dateFrom/dateTo + terminal |
| ZRPT-04 | Rapport Z includes cash reconciliation (opening fund, cash in, add/withdraw, expected vs counted, variance) | Closing entity already stores openingBalance, cashAdded, cashWithdrawn, closingBalance, expenses; the snapshot JSON (data field) carries per-payment-type totals |
| ZRPT-05 | Rapport Z includes denomination count (MRU denominations) | Closing.denominations already stores JSON; MRU denominations are 500, 200, 100, 50, 20, 10, 5, 1 ouguiya — the closing UI must capture count-per-denomination and store in this field |
| ZRPT-06 | Z-Report persisted as immutable snapshot (not recalculated) | Add a `zReportSnapshot` JSON column to Closing; populate it at close-time from a backend "freeze" endpoint; never recompute from live orders |
| ZRPT-07 | Z-Report printable/downloadable as PDF (FR and AR) | @react-pdf/renderer v4.3.2 on the frontend; Arabic requires Font.register() with a non-variable Arabic TTF (Noto Sans Arabic Regular/Bold TTF), plus RTL workaround (direction:'rtl', textAlign:'right', U+202B prefix); test at install time |
| ZRPT-08 | Only MANAGER or ADMIN can generate/close a Z-Report | ClosingVoter already grants ROLE_MANAGER (which includes ADMIN via hierarchy); no change needed; new /close endpoint and PDF download endpoint both go behind same voter |
| RAPT-01 | Enhanced sales report: by category, payment mode, ticket count, average basket | Add DQL GROUP BY category to existing ReportController /sales endpoint; or add a dedicated /report/sales-detail endpoint |
| RAPT-02 | Profit report using costAtSale PMP (sale price - costAtSale), gross margin per product | Already implemented in ReportController /profit; needs to expose margin % per product row, not just aggregate |
| RAPT-03 | Enhanced daily report: top products, top vendors, J-1 comparison | Add vendor breakdown query (GROUP BY o.user) and yesterday comparison to /report/daily |
| RAPT-04 | Vendor report (individual performance: revenue, ticket count, avg basket) | New /report/vendor endpoint; JOIN on o.user; GROUP BY user |
| RAPT-05 | Category report (sales and profit by product category) | New /report/category endpoint; JOIN product.categories; GROUP BY category |
</phase_requirements>

---

## Summary

Phase 5 splits cleanly into two work streams: the **Z-Report** (backend snapshot + frontend PDF) and **extended analytics reports** (backend query expansion + frontend UI). The backend work is straightforward Symfony DQL on an already-correct data model — all prerequisite migrations from Phase 2 (costAtSale, isSuspended filter, decimal Closing columns) and Phase 4 (Payment.category for cash/mobile/credit bucketing) are in place.

The highest-risk item is the Z-Report PDF with Arabic RTL. `@react-pdf/renderer` v4.3.2 does not have native RTL support. Arabic text requires: (1) Font.register() with a static non-variable TTF (Noto Sans Arabic), (2) `direction:'rtl'` + `textAlign:'right'` in StyleSheet, and (3) the Unicode RLM character (U+202B) prepended to Arabic strings. Issue #2638 on the react-pdf repo documents that bidi support added in v3.4.x introduced random "undefined glyph" failures for Arabic fonts. The prior project decision mandates a smoke-test document at install time before building the full ZReportDocument component.

The immutable snapshot requirement (ZRPT-06) means the Z-Report must never be reconstructed from live orders after closing. The Closing entity already has a `data` JSON field and a `denominations` JSON field. The plan is to add a `zReportSnapshot` JSON column to Closing that is populated once at close-time and never updated. The sequential non-resettable number (ZRPT-01) is cleanly solved by adding a `zReportNumber` integer column to Closing and setting it to `MAX(zReportNumber) + 1` in a transaction when the Z-Report is first generated.

**Primary recommendation:** Build Phase 5 in three plans: (A) backend snapshot + sequential number + new report endpoints, (B) Z-Report PDF document with Arabic RTL smoke-test gate, (C) frontend extended reports UI.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | 4.3.2 (latest) | React component tree → PDF blob | De-facto standard for client-side PDF in React apps; declarative, no server needed |
| Noto Sans Arabic (TTF) | static font files | Arabic text rendering in PDF | Only non-variable TTF fonts work with @react-pdf; Noto has broad glyph coverage for Hassaniya Arabic |
| Symfony DQL / QueryBuilder | (existing) | Backend aggregation queries | Already used in ReportController; no new library needed |
| Doctrine Migrations | (existing) | Schema changes for zReportNumber, zReportSnapshot | Already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PDFDownloadLink | (part of @react-pdf/renderer) | Trigger PDF download without leaving page | Use instead of PDFViewer for the download button pattern |
| BlobProvider | (part of @react-pdf/renderer) | Render PDF into a blob for preview | Only if an inline PDF preview is needed (not required by spec) |
| luxon | (existing, ^3.2.1) | Date formatting in Z-Report header | Already installed; use DateTime.fromISO().toFormat() |
| react-i18next | (existing) | Language switching FR/AR for Z-Report UI | Already installed; i18n config supports fr + ar |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @react-pdf/renderer client-side | Symfony + DomPDF server-side | Server PDF is easier for Arabic but requires a separate backend endpoint and download flow; adds PHP dependency; not needed since client already has the data |
| @react-pdf/renderer client-side | jsPDF + html2canvas | html2canvas produces raster (low quality) PDFs; jsPDF has poor complex layout support; react-pdf gives vector, proper pagination, font embedding |
| Noto Sans Arabic TTF | Amiri, Cairo | Amiri has ligature issues in react-pdf; Cairo is a variable font (unsupported); Noto Sans Arabic static TTF is proven to work |

**Installation:**
```bash
# From /front directory
npm install @react-pdf/renderer@4.3.2
# Download Noto Sans Arabic static TTF variants (Regular, Bold) into front/src/assets/fonts/
# Regular: https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyG2vu3CBFQLaig.woff2
# (Use TTF not woff2 - @react-pdf only supports TTF and WOFF)
```

---

## Architecture Patterns

### Recommended Project Structure

```
back/src/
├── Entity/
│   └── Closing.php              # ADD: zReportNumber INT, zReportSnapshot JSON
├── Controller/Api/Admin/
│   ├── ClosingController.php    # ADD: /close endpoint (freeze snapshot), /zreport/{id}/data
│   └── ReportController.php    # ADD: /vendor, /category endpoints; EXTEND: /sales, /daily
├── Core/Closing/Command/
│   └── CloseSessionCommand/    # New command: freezes snapshot, sets zReportNumber
└── migrations/
    └── Version20260217XXXXXX.php  # zReportNumber + zReportSnapshot columns

front/src/
├── assets/fonts/
│   ├── NotoSansArabic-Regular.ttf
│   └── NotoSansArabic-Bold.ttf
├── app-admin/
│   ├── containers/reports/
│   │   ├── sales-report.tsx        # EXTEND: category breakdown
│   │   ├── profit-report.tsx       # EXTEND: per-product margin %
│   │   ├── daily-report.tsx        # EXTEND: top vendors, J-1 compare
│   │   ├── vendor-report.tsx       # NEW
│   │   └── category-report.tsx     # NEW
│   └── containers/closing/
│       ├── z-report-list.tsx        # NEW: list of closed Z-Reports
│       └── ZReportDocument.tsx      # NEW: @react-pdf Document component
└── app-admin/routes/frontend.routes.ts  # ADD: REPORTS_VENDOR, REPORTS_CATEGORY, Z_REPORT_*
```

### Pattern 1: Immutable Snapshot on Session Close

**What:** When MANAGER closes a session, the backend runs a dedicated "close" endpoint that: (1) assigns zReportNumber, (2) runs all aggregation queries scoped to closing.dateFrom/dateTo + terminal, (3) writes the result into Closing.zReportSnapshot (JSON), and (4) sets closedAt. After this point, the PDF is always generated from the snapshot, never from live data.

**When to use:** ZRPT-06 (immutability), ZRPT-01 (sequential number)

**Example:**
```php
// Source: codebase pattern (UpdateClosingCommandHandler.php)
// In new CloseSessionCommandHandler:
public function handle(CloseSessionCommand $command): CloseSessionCommandResult
{
    $closing = $this->getRepository()->find($command->getId());

    // Step 1: Assign sequential number (within a transaction)
    $maxNumber = $this->em->createQuery(
        'SELECT MAX(c.zReportNumber) FROM App\Entity\Closing c'
    )->getSingleScalarResult() ?? 0;
    $closing->setZReportNumber($maxNumber + 1);

    // Step 2: Aggregate all data for the session
    $snapshot = $this->buildSnapshot($closing); // all DQL aggregations
    $closing->setZReportSnapshot($snapshot);
    $closing->setClosedAt(new \DateTimeImmutable());
    $closing->setClosedBy($command->getClosedBy());

    $this->flush(); // atomic
    return CloseSessionCommandResult::createFromClosing($closing);
}
```

### Pattern 2: @react-pdf/renderer Document with Font.register()

**What:** Register Arabic font before rendering. Use `direction:'rtl'` and `textAlign:'right'` in styles. Prepend `\u202B` to Arabic text strings. Use `PDFDownloadLink` for the download button.

**When to use:** ZRPT-07 (PDF with FR and AR)

**Example:**
```typescript
// Source: react-pdf.org/fonts + community workarounds (issue #2306, #2638)
import { Document, Page, Text, View, StyleSheet, Font, PDFDownloadLink } from '@react-pdf/renderer';

// Register BEFORE any rendering
Font.register({
  family: 'NotoSansArabic',
  fonts: [
    { src: '/fonts/NotoSansArabic-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSansArabic-Bold.ttf', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  arabicText: {
    fontFamily: 'NotoSansArabic',
    direction: 'rtl',
    textAlign: 'right',
  },
});

// RTL workaround for Arabic strings:
const rtl = (text: string) => `\u202B${text}`;

const ZReportDocument = ({ data, lang }: { data: ZReportSnapshot; lang: 'fr' | 'ar' }) => (
  <Document language={lang === 'ar' ? 'ar' : 'fr'}>
    <Page size="A4" style={lang === 'ar' ? styles.arabicPage : styles.page}>
      <View>
        <Text style={lang === 'ar' ? styles.arabicText : styles.text}>
          {lang === 'ar' ? rtl(data.storeName) : data.storeName}
        </Text>
      </View>
    </Page>
  </Document>
);
```

### Pattern 3: Backend Aggregation for Extended Reports

**What:** New DQL GROUP BY queries in ReportController following the same pattern as existing /sales, /profit, /daily endpoints. New endpoints: /report/vendor, /report/category.

**When to use:** RAPT-01 through RAPT-05

**Example:**
```php
// Source: existing ReportController.php pattern
// Vendor report (RAPT-04):
$qb->select(
    'u.id as userId',
    'u.displayName as vendorName',
    'COUNT(DISTINCT o.id) as totalOrders',
    'COALESCE(SUM(op.price * op.quantity), 0) as grossRevenue',
    'COALESCE(SUM(op.discount), 0) as totalDiscounts'
)
->from(Order::class, 'o')
->join('o.user', 'u')
->join('o.items', 'op')
->where('DATE(o.createdAt) >= :dateFrom')
->andWhere('o.isDeleted = false')
->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
->andWhere('o.isReturned = false')
->groupBy('u.id', 'u.displayName');

// Category report (RAPT-05) - note ManyToMany requires DISTINCT:
$qb->select(
    'cat.id as categoryId',
    'cat.name as categoryName',
    'COALESCE(SUM(op.price * op.quantity), 0) as revenue',
    'COALESCE(SUM(COALESCE(op.costAtSale, 0) * op.quantity), 0) as cost'
)
->from(OrderProduct::class, 'op')
->join('op.order', 'o')
->join('op.product', 'prod')
->join('prod.categories', 'cat')
->where('DATE(o.createdAt) >= :dateFrom')
->andWhere('o.isDeleted = false')
->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
->andWhere('o.isReturned = false')
->groupBy('cat.id', 'cat.name');
```

### Pattern 4: Z-Report Snapshot Shape

**What:** The `zReportSnapshot` JSON column stores all the data needed to render the PDF without re-querying. Structure it completely at close time.

```json
{
  "zReportNumber": 42,
  "generatedAt": "2026-02-17T20:00:00Z",
  "store": { "name": "Boutique Principale", "location": "Nouakchott" },
  "terminal": { "code": "T-001" },
  "openedBy": "Ahmed",
  "closedBy": "Fatima",
  "dateFrom": "2026-02-17T08:00:00Z",
  "dateTo": "2026-02-17T20:00:00Z",
  "sales": {
    "totalOrders": 45,
    "completedOrders": 43,
    "returnedOrders": 2,
    "grossRevenue": 125000.00,
    "totalDiscounts": 5000.00,
    "netRevenue": 120000.00,
    "averageBasket": 2790.70
  },
  "paymentBreakdown": [
    { "name": "Espèces", "category": "cash", "amount": 80000.00 },
    { "name": "Bankily", "category": "mobile", "amount": 35000.00 },
    { "name": "Crédit", "category": "credit", "amount": 5000.00 }
  ],
  "cashReconciliation": {
    "openingBalance": 10000.00,
    "cashReceived": 80000.00,
    "cashAdded": 0.00,
    "cashWithdrawn": 5000.00,
    "expenses": 2000.00,
    "expectedCash": 83000.00,
    "countedCash": 82500.00,
    "variance": -500.00
  },
  "denominations": [
    { "value": 500, "count": 100, "total": 50000.00 },
    { "value": 200, "count": 80, "total": 16000.00 },
    { "value": 100, "count": 100, "total": 10000.00 },
    { "value": 50, "count": 50, "total": 2500.00 },
    { "value": 20, "count": 100, "total": 2000.00 },
    { "value": 10, "count": 200, "total": 2000.00 }
  ]
}
```

### Anti-Patterns to Avoid

- **Re-querying on PDF render**: Never run DQL from within ZReportDocument.tsx. The PDF component receives pre-computed data from the snapshot. Re-querying breaks immutability.
- **Variable fonts for Arabic**: Noto Sans Arabic comes in variable weight format (woff2). This does NOT work with @react-pdf/renderer. You must download and use the static-weight TTF files (Regular = weight 400, Bold = weight 700 downloaded separately from Google Fonts).
- **Unicode bidi override on non-Arabic text**: Only apply `\u202B` prefix to Arabic locale strings. French strings with this prefix will display broken.
- **Recalculating zReportNumber in application logic without a transaction**: Use `SELECT MAX(zReportNumber) FOR UPDATE` or handle inside a DB transaction to prevent duplicate numbers in multi-terminal scenarios.
- **Storing denomination count-only in closing**: The existing `denominations` JSON already stores counts; the snapshot must also compute and store the MRU total per denomination (count × value) to avoid needing multiplication in the PDF renderer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom HTML-to-PDF | @react-pdf/renderer | react-pdf is declarative, embeds fonts, generates precise PDF/A-level output; HTML-to-canvas produces rasters |
| Arabic text shaping | Custom bidi algorithm | @react-pdf/renderer + Font.register() + U+202B workaround | Text shaping (ligatures, joining forms) is handled by the font engine; custom shaping is thousands of lines |
| Sequential number | Custom sequence table | `MAX(zReportNumber) + 1` in transaction | Simple, no extra entity needed for 1 terminal; deterministic |
| Report aggregation | Fetch all orders then aggregate in PHP | DQL GROUP BY with SUM/COUNT | Database aggregation is orders of magnitude faster for large datasets |
| Date range scoping in Z-Report | Pass store+date filter | Pass `closing.dateFrom` + `closing.dateTo` + `terminal.id` | The session is already scoped by these three dimensions in the Closing entity |

**Key insight:** The entire Z-Report data pipeline is: frontend triggers /admin/closing/{id}/close → backend aggregates + snapshots → frontend fetches snapshot JSON → @react-pdf renders to PDF locally. No server-side PDF generation library needed.

---

## Common Pitfalls

### Pitfall 1: Arabic Variable Font Failure
**What goes wrong:** Installing Noto Sans Arabic from Google Fonts CDN gives a woff2 variable font. @react-pdf throws "unsupported font format" or silently renders boxes instead of Arabic characters.
**Why it happens:** @react-pdf/renderer only supports TTF and WOFF (not WOFF2, not variable OpenType). Google Fonts default download is WOFF2.
**How to avoid:** Download static weight TTF files directly from the Noto Sans Arabic GitHub releases or Google Fonts "Download family" ZIP. Verify the file extension is `.ttf` before Font.register().
**Warning signs:** PDF renders but Arabic text shows as rectangles (missing glyphs), or the PDF fails to generate entirely with a font-related error in the console.

### Pitfall 2: Missing isSuspended Filter in Z-Report Aggregation
**What goes wrong:** The Z-Report shows inflated revenue because suspended-but-not-completed orders are counted.
**Why it happens:** This was the original bug fixed in Phase 2, but if the Z-Report snapshot endpoint is written from scratch, the developer may forget to copy the filter from ReportController.
**How to avoid:** Every DQL query in CloseSessionCommandHandler that touches Order must include `.andWhere('o.isSuspended != true OR o.isSuspended IS NULL')`. Cross-reference with the existing ReportController.php as the reference pattern.
**Warning signs:** Total orders count doesn't match the POS transaction count for the day.

### Pitfall 3: React-PDF Arabic Bidi Regression
**What goes wrong:** @react-pdf/renderer v3.4+ introduced bidi support that broke Arabic character rendering ("undefined glyph" errors from @react-pdf/textkit).
**Why it happens:** The bidi implementation interacts badly with certain Arabic fonts' OpenType glyph tables.
**How to avoid:** Run the mandatory smoke-test (prior decision): install @react-pdf/renderer, create a minimal Document with one Arabic Text node using Noto Sans Arabic, verify it generates correctly BEFORE building ZReportDocument.tsx. If it fails, pin to v3.3.5 (confirmed stable for Arabic) or use the `bidi-react-pdf` fork.
**Warning signs:** PDF generation hangs indefinitely, or the browser console shows "Cannot read glyph UNIFEA3" type errors.

### Pitfall 4: zReportNumber Race Condition
**What goes wrong:** Two MANAGER users close two different terminals at the same millisecond and both get the same zReportNumber.
**Why it happens:** `MAX(id) + 1` is not atomic without locking.
**How to avoid:** Wrap the number assignment in a Doctrine transaction. In the close endpoint handler: `$this->em->beginTransaction()` → `SELECT MAX(zReportNumber) FOR UPDATE` (native query) → set and flush → `$this->em->commit()`. For a single-terminal store (typical case), this is unlikely to matter, but the implementation must still be correct.
**Warning signs:** Two Closing records share the same zReportNumber.

### Pitfall 5: Category JOIN Duplicates Revenue
**What goes wrong:** A product belonging to 2 categories appears in both category groups, doubling its revenue contribution in the category report.
**Why it happens:** Product.categories is a ManyToMany relationship. A JOIN without deduplication multiplies rows.
**How to avoid:** Two options: (a) use `GROUP BY cat.id` with `SUM(op.price * op.quantity)` which will correctly attribute the full order-product revenue to EACH category (intentional double-counting for category analytics), or (b) use DISTINCT. Decide which semantics make sense for RAPT-05 — most retail systems attribute the full sale to each category the product belongs to.
**Warning signs:** Category totals sum to more than total revenue.

### Pitfall 6: Denomination Input Missing from Closing UI
**What goes wrong:** The closing form in sale.closing.tsx does not currently have denomination count inputs. Closing.denominations is stored but it's currently just a freeform JSON blob.
**Why it happens:** The denomination count UI was never built; the field exists as a placeholder.
**How to avoid:** The closing form must be extended with denomination input fields for each MRU denomination value (500, 200, 100, 50, 20, 10, 5, 1 ouguiya) before the Z-Report can satisfy ZRPT-05. This is a frontend form addition, not just a PDF task.
**Warning signs:** zReportSnapshot.denominations is null or empty in generated Z-Reports.

---

## Code Examples

### Z-Report Endpoint Pattern (Backend)

```php
// Source: ReportController.php existing pattern + Closing entity analysis
// New endpoint: POST /admin/closing/{id}/close
/**
 * @Route("/{id}/close", methods={"POST"}, name="close")
 */
public function close(
    int $id,
    ApiResponseFactory $responseFactory,
    CloseSessionCommandHandlerInterface $handler
): JsonResponse {
    $this->denyAccessUnlessGranted(ClosingVoter::MANAGE); // Already covers ROLE_MANAGER + ROLE_ADMIN

    $command = new CloseSessionCommand();
    $command->setId($id);
    $command->setClosedBy($this->getUser());

    $result = $handler->handle($command);

    if ($result->isNotFound()) {
        return $responseFactory->notFound('Closing not found');
    }
    if ($result->isAlreadyClosed()) {
        return $responseFactory->validationError('Session already closed');
    }

    return $responseFactory->json(
        SelectClosingResponseDto::createFromClosing($result->getClosing())
    );
}
```

### Migration: Add zReportNumber and zReportSnapshot

```php
// Source: back/migrations/ pattern (Version20260217231742.php)
public function up(Schema $schema): void
{
    $this->addSql('ALTER TABLE closing ADD z_report_number INT DEFAULT NULL');
    $this->addSql('ALTER TABLE closing ADD z_report_snapshot JSON DEFAULT NULL');
    // Unique constraint to prevent duplicates
    $this->addSql('CREATE UNIQUE INDEX uniq_closing_z_report_number ON closing (z_report_number)');
}
```

### Denominations MRU

```typescript
// Source: MRU currency knowledge (Mauritanian Ouguiya denominations)
export const MRU_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 1] as const;

interface DenominationCount {
  value: number;
  count: number;
  total: number; // value * count
}
```

### Font Registration (Frontend)

```typescript
// Source: react-pdf.org/fonts + issue #2638 workaround
import { Font } from '@react-pdf/renderer';

// Must be called at module level, outside of components
Font.register({
  family: 'NotoSansArabic',
  fonts: [
    { src: '/NotoSansArabic-Regular.ttf', fontWeight: 400 },
    { src: '/NotoSansArabic-Bold.ttf',    fontWeight: 700 },
  ],
});

// Smoke-test component (run this before building ZReportDocument)
const ArabicSmokeTest = () => (
  <Document>
    <Page size="A4">
      <Text style={{ fontFamily: 'NotoSansArabic', direction: 'rtl', textAlign: 'right' }}>
        {'\u202B'}تقرير اليوم
      </Text>
    </Page>
  </Document>
);
```

### DQL for Z-Report Aggregation (scoped to session)

```php
// Source: ReportController.php adapted for session scope
// Pass closing.dateFrom, closing.dateTo, closing.terminal as parameters
$qb->select(
    'COUNT(DISTINCT o.id) as totalOrders',
    'COALESCE(SUM(CASE WHEN o.isReturned = false THEN 1 ELSE 0 END), 0) as completedOrders',
    'COALESCE(SUM(CASE WHEN o.isReturned = true THEN 1 ELSE 0 END), 0) as returnedOrders'
)
->from(Order::class, 'o')
->where('o.createdAt >= :dateFrom')
->andWhere('o.createdAt <= :dateTo')
->andWhere('o.terminal = :terminal')  // KEY: scope to this terminal's session
->andWhere('o.isDeleted = false')
->andWhere('o.isSuspended != true OR o.isSuspended IS NULL')
->setParameter('dateFrom', $closing->getDateFrom())
->setParameter('dateTo', $closing->getDateTo())
->setParameter('terminal', $closing->getTerminal());
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| window.print() in sales-report.tsx | @react-pdf/renderer PDF | This phase | Proper embeddable PDF vs browser print dialog |
| Closing.data freeform JSON | Closing.zReportSnapshot structured JSON | This phase | Enables immutable, versioned Z-Report data |
| No sequential Z-Report number | Closing.zReportNumber INT UNIQUE | This phase | Compliance with retail Z-Report regulations |
| Denomination as opaque JSON | Structured DenominationCount[] | This phase | Enables denomination table in PDF |
| Payment breakdown by name only | Payment breakdown by name + category | Phase 4 DONE | Enables cash/mobile/credit bucketing in Z-Report |
| float columns in Closing | decimal(20,2) | Phase 2 DONE | Eliminates rounding errors in cash reconciliation |
| costAtSale missing | costAtSale on OrderProduct | Phase 2 DONE | RAPT-02 profit per product is now accurate |

**Deprecated/outdated:**
- `window.print()` in reports: Was the temporary print mechanism; replace with `PDFDownloadLink` for Z-Report; keep for existing ad-hoc reports if no spec change
- `Closing.data` field: Was a freeform data bag; now superseded by `zReportSnapshot` with typed structure; the old field can be deprecated (but kept for backward compat)

---

## Open Questions

1. **Arabic smoke-test outcome**
   - What we know: react-pdf v3.4+ has known Arabic bidi regressions (issue #2638); v4.3.2 CHANGELOG has no Arabic fix mention
   - What's unclear: Whether v4.3.2 works with Noto Sans Arabic TTF static files specifically
   - Recommendation: Make the smoke-test the FIRST task of the PDF plan; if it fails, pin to @react-pdf/renderer@3.3.5 before proceeding

2. **Denomination input placement**
   - What we know: The denomination entry is currently absent from sale.closing.tsx; ZRPT-05 requires it
   - What's unclear: Whether it belongs in the existing SaleClosing modal (POS) or a new Admin closing page
   - Recommendation: Add denomination input to the existing POS closing modal (where the cashier physically counts bills); the admin Z-Report page can read the stored counts from the snapshot

3. **Category double-counting semantics**
   - What we know: Product.categories is ManyToMany; one product can be in multiple categories
   - What's unclear: RAPT-05 says "ventes et bénéfice par catégorie" — full revenue attributed to each category (double-count), or proportional split?
   - Recommendation: Use full attribution (each category gets the full order-product amount); document this in the UI as "revenue includes products belonging to this category"

4. **J-1 comparison in daily report (RAPT-03)**
   - What we know: The daily report needs "comparaison J-1"; ReportController /daily exists but has no comparison
   - What's unclear: Whether J-1 is "yesterday" (calendar day -1) or "last business day" (skipping weekends)
   - Recommendation: Use simple calendar day -1 (yesterday); add a second DQL run with `date = :yesterday` and return both date results; frontend computes delta %

5. **Z-Report PDF bilingual document**
   - What we know: ZRPT-07 requires both FR and AR; PDFDownloadLink generates one document at a time
   - What's unclear: Does "FR et AR" mean one document with both languages, or two separate PDFs?
   - Recommendation: Two separate PDF downloads (one FR button, one AR button); a single bilingual PDF with mixed RTL/LTR sections is much more complex and provides less value

---

## Sources

### Primary (HIGH confidence)
- Codebase: `/back/src/Entity/Closing.php` — entity structure with denominations, data, zReportNumber absent
- Codebase: `/back/src/Entity/Payment.php` — Payment.category (cash/mobile/credit) confirmed present (Phase 4)
- Codebase: `/back/src/Entity/OrderProduct.php` — costAtSale confirmed present (Phase 2)
- Codebase: `/back/src/Controller/Api/Admin/ReportController.php` — all existing aggregation patterns
- Codebase: `/back/src/Security/Voter/ClosingVoter.php` — CLOSING_MANAGE grants ROLE_MANAGER (includes ADMIN via hierarchy)
- Codebase: `/front/src/duck/auth/hooks/useHasRole.ts` — role hierarchy: ADMIN > MANAGER > VENDEUR
- Codebase: `/front/package.json` — @react-pdf/renderer NOT installed; need to add
- Codebase: `.planning/migrations/Version20260217224033.php` — Phase 2 DONE confirmation
- Codebase: `.planning/migrations/Version20260217231742.php` — Phase 4 Payment.category DONE confirmation
- [react-pdf.org/fonts](https://react-pdf.org/fonts) — Font.register() API, TTF/WOFF only, no variable fonts
- [react-pdf.org/components](https://react-pdf.org/components) — No native RTL props in any component

### Secondary (MEDIUM confidence)
- [GitHub diegomura/react-pdf releases](https://github.com/diegomura/react-pdf/releases) — v4.3.2 latest (Dec 2025), no Arabic/RTL fix in release notes
- [GitHub issue #2638](https://github.com/diegomura/react-pdf/issues/2638) — Arabic undefined glyph errors since bidi; workaround: downgrade to 3.3.5 or fix font lock
- [GitHub discussion #2306](https://github.com/diegomura/react-pdf/discussions/2306) — Working workaround: `direction:'rtl'` + `textAlign:'right'` + U+202B prefix

### Tertiary (LOW confidence - needs validation)
- [WebSearch result] — @react-pdf/renderer@4.3.2 is latest as of 2025; unverified whether Arabic bidi is fixed vs 3.x
- [GitHub issue #2424](https://github.com/diegomura/react-pdf/issues/2424) — Arabic OpenType features not correctly applied (Cairo, IBM Plex); suggests Noto Sans Arabic may be safer

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @react-pdf/renderer is the clear standard; font support verified via official docs
- Architecture: HIGH — based on direct codebase reading; all prerequisite columns confirmed present
- Arabic RTL pitfall: MEDIUM — multiple sources confirm issue; workaround documented but not regression-tested on v4.3.2 specifically
- Z-Report snapshot design: HIGH — straightforward extension of existing Closing entity and command pattern
- Report aggregations: HIGH — DQL patterns directly copied from existing working ReportController.php

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable domain; react-pdf releases infrequently)
