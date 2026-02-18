# Phase 7: UI Redesign - Research

**Researched:** 2026-02-18
**Domain:** POS touch-optimized UI, admin dashboard KPIs, charting, responsive design
**Confidence:** HIGH

## Summary

This phase redesigns two distinct surfaces: the POS cashier screen (touch-optimized, professional, Square/Toast-inspired) and the admin dashboard (KPI cards, chart-based reports, user management with three-role system). The codebase already has a solid foundation -- the POS has a 3-panel grid layout with product grid, cart, and checkout; the admin has Bootstrap/NiceAdmin with dashboard, reports, sidebar, and RBAC guarding. The work is primarily CSS/component-level redesign, not architectural restructuring.

The most significant technical finding is that the installed Nivo chart packages (0.79.x) have peer dependency conflicts with React 18.2.0 -- they require `>= 16.14.0 < 18.0.0`. These MUST be upgraded to 0.87+ (latest is 0.99.0) before any chart work can proceed. The `@nivo/line` package is not installed at all and must be added. Additionally, the ProductGrid component currently uses inline styles for its design tokens instead of the CSS custom properties defined in `index.scss` -- this inconsistency should be resolved during the redesign.

The POS UI already has a design system with CSS custom properties (`--pos-*` variables in `index.scss`) and a ProductCard component with product images, stock badges, and price display. The admin already has KPI cards for sales/revenue/profit on the dashboard, but is missing the "average basket" and "low-stock count" cards required by UIADM-01. All report pages currently display raw tables -- they need chart visualizations added alongside or replacing the tables.

**Primary recommendation:** Upgrade Nivo to 0.87+ first, then redesign POS components using existing CSS variable system with 48px minimum touch targets, and add Nivo charts to admin report pages.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UIPOS-01 | POS screen design professionnel moderne (Square/Toast/Lightspeed) | POS layout already has 3-panel grid system in `index.scss`. Redesign product cards, refine topbar, improve cart table styling. Use existing `--pos-*` CSS variables. |
| UIPOS-02 | Product grid with professional image display | `ProductGrid` component exists with `ProductCard` rendering images via `/api/media/{id}/content`. Needs cleanup: move inline styles to CSS classes, improve image aspect ratios, add loading states. |
| UIPOS-03 | Cart, checkout, and payment buttons touch-optimized | Cart uses table-cell layout with small inputs. Payment buttons exist in `CloseSaleInline`. Need 48px minimum touch targets, larger payment type buttons, touch-friendly quantity controls. |
| UIPOS-04 | Responsive interface for tablet/touchscreen | POS layout uses `calc(100vh - 56px)` fixed height. Need tablet breakpoint (~768px) to stack panels vertically, enlarge touch targets. Tailwind `md:` breakpoint already at 768px. |
| UIADM-01 | Admin dashboard with real KPIs (CA du jour, tickets, panier moyen, stock bas) | Dashboard fetches from `REPORT_DAILY` API. Already shows totalOrders, netRevenue, grossProfit. Missing: averageBasket card, lowStockCount card. Backend already returns `averageBasket` in SalesData. |
| UIADM-02 | Report pages use professional charts (Nivo) | Nivo 0.79.x installed but has React 18 peer dep conflict. Upgrade to 0.87+, add `@nivo/line`. Reports have data shapes ready: payments array (bar), categories array (pie), daily trends (line). |
| UIADM-03 | User management integrates three-role system | Already implemented: `create.user.tsx` has ROLE_VENDEUR/ROLE_MANAGER/ROLE_ADMIN in role select. Admin app `Users` page at `/users` is a stub -- needs to replicate POS `Users` component with TableComponent. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TailwindCSS | 3.4.19 | POS app styling, utility classes | Already the primary CSS framework for POS |
| Bootstrap | 5.2.0 | Admin app styling (NiceAdmin template) | Admin uses Bootstrap grid/cards throughout |
| Ant Design | 5.4.7 | Tooltips, notifications, badges (POS) | Selectively used, not replacing |
| FontAwesome | 6.1.2 | Icons across both apps | Already installed with svg-core |
| Jotai | 2.4.3 | POS cart state management | Cart state atoms already established |
| react-hook-form | 7.34.0 | Form handling (user create, checkout) | Used across both apps |

### To Upgrade
| Library | Current | Target | Purpose | Why |
|---------|---------|--------|---------|-----|
| @nivo/core | 0.79.0 | ^0.87.0 | Chart engine base | 0.79.x has React 18 peer dep conflict |
| @nivo/bar | 0.79.1 | ^0.87.0 | Bar charts for payment breakdown | Same peer dep issue |
| @nivo/pie | 0.79.1 | ^0.87.0 | Pie charts for category distribution | Same peer dep issue |

### To Install
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nivo/line | ^0.87.0 | Line charts for daily trends | Daily/sales report trend visualizations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Nivo | Recharts | Nivo already in package.json, has richer styling/animation; Recharts is lighter but would require removing Nivo |
| Nivo | Chart.js | Chart.js is imperative, Nivo is declarative React-first; Nivo fits React patterns better |
| Bootstrap (admin) | Tailwind (admin) | Would require rewriting all admin pages; too risky for this phase |

**Installation:**
```bash
cd front
npm install @nivo/core@^0.87.0 @nivo/bar@^0.87.0 @nivo/pie@^0.87.0 @nivo/line@^0.87.0
```

**Note:** Use `--legacy-peer-deps` if needed during transition, but the upgrade to 0.87+ should resolve the React 18 incompatibility.

## Architecture Patterns

### Current Project Structure (relevant files)
```
front/src/
  app-frontend/              # POS cashier app (Tailwind + custom CSS)
    components/
      modes/pos.tsx           # Main POS screen (3-panel layout)
      modes/payment.tsx       # Payment mode screen
      modes/footer.tsx        # Bottom toolbar buttons
      modes/topbar.right.tsx  # Top-right actions
      cart/cart.container.tsx  # Cart table
      cart/cart.item.tsx       # Individual cart row
      cart/order.totals.tsx    # Order totals display
      sale/sale.inline.tsx     # Checkout/payment flow
      search/product.grid.tsx  # Product grid with cards
      settings/users/          # User CRUD (POS side)
  app-admin/                  # Admin dashboard (Bootstrap/NiceAdmin)
    containers/
      dashboard/dashboard.tsx  # KPI cards + quick links
      reports/                 # 5 report pages (tables only)
      layout/sidebar.tsx       # Navigation with role guards
      layout/navbar.tsx        # Top navigation
  css/
    index.scss                # POS design system (CSS vars + component styles)
    ltr.scss                  # Base styles, buttons, inputs, tables
```

### Pattern 1: POS CSS Custom Properties
**What:** The POS design system uses CSS custom properties defined in `:root` in `index.scss`
**When to use:** All POS component styling
**Example:**
```css
/* Source: front/src/css/index.scss */
:root {
  --pos-bg: #f0f2f5;
  --pos-surface: #ffffff;
  --pos-accent: #0d9488;
  --pos-accent-light: #ccfbf1;
  --pos-border: #e2e8f0;
  --pos-text: #1e293b;
  --pos-radius: 10px;
  --pos-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
```

**IMPORTANT:** The `ProductGrid` component (`product.grid.tsx`) duplicates these values as inline JS objects (the `T` constant). This must be refactored to use the CSS variables for consistency.

### Pattern 2: Admin Bootstrap Card Pattern
**What:** Admin uses Bootstrap card components with NiceAdmin-style info-card pattern
**When to use:** KPI cards, report containers
**Example:**
```tsx
// Source: front/src/app-admin/containers/dashboard/dashboard.tsx
<div className="card info-card sales-card">
  <div className="card-body">
    <h5 className="card-title">{t("Sales")} <span>| {t("Today")}</span></h5>
    <div className="d-flex align-items-center">
      <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
        <i className="bi bi-cart"></i>
      </div>
      <div className="ps-3">
        <h6>{data?.totalOrders ?? 0}</h6>
        <span className="text-muted small">{t('Completed Orders')}</span>
      </div>
    </div>
  </div>
</div>
```

### Pattern 3: Nivo Responsive Chart Wrapper
**What:** Nivo requires a parent container with explicit dimensions; use Responsive* variants
**When to use:** All chart implementations in admin reports
**Example:**
```tsx
// Nivo responsive pattern (official docs)
import { ResponsiveBar } from '@nivo/bar';

// Container MUST have explicit height
<div style={{ height: 400 }}>
  <ResponsiveBar
    data={data}
    keys={['amount']}
    indexBy="paymentType"
    margin={{ top: 20, right: 20, bottom: 50, left: 80 }}
    padding={0.3}
    colors={{ scheme: 'nivo' }}
    axisBottom={{ tickRotation: -45 }}
    enableLabel={false}
  />
</div>
```

### Pattern 4: Touch Target Sizing
**What:** POS buttons and interactive elements must meet 48px minimum for touch
**When to use:** All POS interactive elements (buttons, cart inputs, product cards)
**Example:**
```css
/* Touch-optimized button sizing */
.pos-btn-touch {
  min-height: 48px;
  min-width: 48px;
  padding: 12px 16px;
  font-size: 16px;  /* Prevents iOS zoom on input focus */
}

/* Touch-friendly quantity input */
.pos-quantity-input {
  min-height: 48px;
  font-size: 18px;
  text-align: center;
  width: 64px;
}
```

### Anti-Patterns to Avoid
- **Inline style objects for design tokens (ProductGrid):** Use CSS custom properties from `index.scss`, not inline `const T = {...}` objects. The current ProductGrid duplicates the design system values.
- **Table-cell layout for cart on touch devices:** The `display: table-cell` pattern is not touch-friendly; cart items need larger tap areas and simplified columns on tablet.
- **Fixed pixel widths without breakpoints:** POS layout uses `grid-template-columns: 2fr 2fr 1fr` with no tablet adaptation -- will be unusable on portrait tablets.
- **Mixing Bootstrap and Tailwind in the same component:** POS uses Tailwind, admin uses Bootstrap. Do not mix them within a single component.
- **Hard-coded LTR styles:** Use logical properties (`ms-*`/`me-*`, `start`/`end`) per Phase 6 decisions. The POS CSS already has RTL overrides in `index.scss`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart visualizations | Custom SVG/Canvas charts | Nivo (ResponsiveBar, ResponsivePie, ResponsiveLine) | D3-based, handles scales, axes, tooltips, responsive sizing, animations |
| Touch gesture detection | Custom touch event handlers | CSS `:active` states + existing button components | Browser handles touch; :active gives tactile feedback |
| Responsive grid adaptation | Custom JS resize listeners | Tailwind responsive prefixes (`md:`, `lg:`) + CSS media queries | Already configured, well-tested |
| Number formatting | Custom format functions | Existing `formatCurrency()` + `withCurrency()` + `Intl.NumberFormat` | Already used across both apps, handles locale |
| Role-based UI visibility | Custom permission checks | Existing `useHasRole()` hook + `RequireRole` component | Already implemented with hierarchy support |

**Key insight:** The codebase already has most infrastructure (design tokens, role guards, layout grids). This phase is primarily a visual polish and enhancement layer, not new architecture.

## Common Pitfalls

### Pitfall 1: Nivo Container Height
**What goes wrong:** Nivo responsive charts render as 0px height if parent container has no explicit height
**Why it happens:** `ResponsiveBar`/`ResponsivePie`/`ResponsiveLine` use parent dimensions via ResizeObserver; `height: auto` or `flex: 1` without a height ancestor resolves to 0
**How to avoid:** Always wrap Nivo charts in a container with explicit height: `<div style={{ height: 400 }}>` or use CSS `height: 400px`
**Warning signs:** Chart renders but is invisible; no errors in console

### Pitfall 2: Nivo 0.79.x React 18 Peer Dependency
**What goes wrong:** Current `@nivo/*@0.79.x` packages declare `peerDependencies: react >= 16.14.0 < 18.0.0` -- incompatible with React 18.2.0
**Why it happens:** Nivo 0.79 was released before React 18 support was added (added in ~0.87+)
**How to avoid:** Upgrade ALL @nivo packages together to ^0.87.0 or higher in one step. Do not mix 0.79 and 0.87 packages.
**Warning signs:** `npm ls` shows `invalid` peer dependency warnings (already visible in current install)

### Pitfall 3: ProductGrid Inline Style Duplication
**What goes wrong:** `product.grid.tsx` defines design tokens as a JS `const T = {...}` that duplicates CSS variables from `index.scss`, leading to drift
**Why it happens:** Component was likely written before the CSS custom property system was established
**How to avoid:** Refactor ProductGrid to use CSS classes that reference `var(--pos-*)` instead of inline styles. The `index.scss` already has `.product-grid-card`, `.product-grid-image`, `.product-grid-name`, `.product-grid-price` classes.
**Warning signs:** Visual inconsistency between ProductGrid and other POS panels

### Pitfall 4: Viewport Meta Tag Typo
**What goes wrong:** `index.html` has `content="width=device-width. initial-scale=1"` -- note the PERIOD instead of COMMA
**Why it happens:** Typo in the meta tag
**How to avoid:** Fix to `content="width=device-width, initial-scale=1"` -- this is critical for tablet/touch rendering
**Warning signs:** Mobile/tablet viewport may not scale correctly

### Pitfall 5: iOS Input Focus Zoom
**What goes wrong:** On iOS Safari, tapping an input with `font-size < 16px` triggers automatic page zoom
**Why it happens:** iOS "helpfully" zooms in on small inputs
**How to avoid:** Ensure all POS input elements have `font-size: 16px` or larger. The current cart inputs do not specify a minimum font size.
**Warning signs:** Page zooms unexpectedly when tapping search or quantity fields on iPad

### Pitfall 6: Bootstrap + Tailwind CSS Conflicts
**What goes wrong:** Bootstrap's `.table`, `.card`, `.btn` classes conflict with Tailwind or custom CSS definitions in `ltr.scss`
**Why it happens:** Both frameworks define same class names. The `ltr.scss` already has custom `.card`, `.btn`, `.table` styles.
**How to avoid:** Admin uses Bootstrap classes only; POS uses Tailwind + custom CSS only. Never add Tailwind utilities to admin components or Bootstrap classes to POS components.
**Warning signs:** Unexpected card/button styling after CSS order changes

### Pitfall 7: Admin Users Page is a Stub
**What goes wrong:** The admin `/users` page (`app-admin/containers/dashboard/users/index.tsx`) is a stub showing only "List" -- not the full table from POS `users.tsx`
**Why it happens:** User management was originally POS-only; admin stub was never completed
**How to avoid:** Port the POS-side `Users` component pattern (with `TableComponent`, `CreateUser` modal) to admin, or create a shared component
**Warning signs:** Admin "Users" page shows no data

## Code Examples

Verified patterns from the codebase:

### Nivo ResponsiveBar for Payment Breakdown
```tsx
// Use in admin report pages to replace payment tables
import { ResponsiveBar } from '@nivo/bar';

interface PaymentChartProps {
  payments: Array<{ paymentType: string; amount: number }>;
}

export const PaymentBarChart = ({ payments }: PaymentChartProps) => {
  const data = payments.map(p => ({
    paymentType: p.paymentType,
    amount: Number(p.amount),
  }));

  return (
    <div style={{ height: 300 }}>
      <ResponsiveBar
        data={data}
        keys={['amount']}
        indexBy="paymentType"
        margin={{ top: 10, right: 20, bottom: 50, left: 80 }}
        padding={0.3}
        colors={{ scheme: 'paired' }}
        axisBottom={{
          tickRotation: -45,
          legend: '',
          legendPosition: 'middle',
          legendOffset: 32,
        }}
        axisLeft={{
          format: (v: number) =>
            new Intl.NumberFormat('fr-FR').format(v) + ' MRU',
        }}
        enableLabel={false}
        tooltip={({ indexValue, value }) => (
          <div style={{ padding: 8, background: '#fff', border: '1px solid #ccc', borderRadius: 4 }}>
            <strong>{indexValue}</strong>: {new Intl.NumberFormat('fr-FR').format(value)} MRU
          </div>
        )}
      />
    </div>
  );
};
```

### Nivo ResponsivePie for Category Breakdown
```tsx
import { ResponsivePie } from '@nivo/pie';

interface CategoryPieProps {
  categories: Array<{ categoryName: string; netRevenue: number }>;
}

export const CategoryPieChart = ({ categories }: CategoryPieProps) => {
  const data = categories.map(c => ({
    id: c.categoryName,
    label: c.categoryName,
    value: c.netRevenue,
  }));

  return (
    <div style={{ height: 350 }}>
      <ResponsivePie
        data={data}
        margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        colors={{ scheme: 'paired' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLabelsSkipAngle={10}
      />
    </div>
  );
};
```

### KPI Card Component for Admin Dashboard
```tsx
// Extend existing pattern from dashboard.tsx
interface KPICardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  icon: string;          // Bootstrap icon class
  colorClass?: string;   // e.g. 'sales-card', 'revenue-card', 'customers-card'
  loading?: boolean;
}

export const KPICard = ({ title, subtitle, value, icon, colorClass = '', loading }: KPICardProps) => (
  <div className={`card info-card ${colorClass}`}>
    <div className="card-body">
      <h5 className="card-title">{title} {subtitle && <span>| {subtitle}</span>}</h5>
      <div className="d-flex align-items-center">
        <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
          <i className={`bi ${icon}`}></i>
        </div>
        <div className="ps-3">
          <h6>{loading ? '...' : value}</h6>
        </div>
      </div>
    </div>
  </div>
);
```

### Touch-Optimized POS Button
```scss
/* Add to index.scss */
.pos-payment-btn {
  min-height: 56px;
  min-width: 80px;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: 700;
  border-radius: var(--pos-radius);
  transition: all 0.12s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  &:active {
    transform: scale(0.96);
  }
}
```

### Responsive POS Layout for Tablet
```scss
/* Add to index.scss for tablet breakpoint */
@media (max-width: 1024px) {
  .pos-layout-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
  }

  .pos-topbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
  }

  .pos-topbar-search {
    order: -1;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .pos-layout-grid {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 8px;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nivo 0.79 (React < 18) | Nivo 0.87+ (React 18+) | ~2023 | Must upgrade to resolve peer dep conflicts |
| Inline style tokens (ProductGrid) | CSS custom properties (index.scss) | Already in codebase | Refactor ProductGrid to use CSS vars |
| Table layout for cart | CSS Grid/Flex with touch targets | Current best practice | Cart needs touch-optimized redesign |
| Raw data tables in reports | Charts + summary tables | Industry standard | UIADM-02 requires this change |
| Admin Users stub page | Full user management table | This phase | Admin Users page must be completed |

**Deprecated/outdated:**
- `react-table@7.8.0` (v7): Still used in PaymentMode for `KeyboardTable`; coexists with `@tanstack/react-table@8.9.2`. Do not add new table implementations using v7.
- `react-query@3.39.3` (v3): Coexists with `@tanstack/react-query@4.29.7`. New code should use v4 only.

## Open Questions

1. **Average Basket and Low-Stock Count API endpoints**
   - What we know: Dashboard fetches from `REPORT_DAILY` which returns `averageBasket` in the SalesData type. Stock alerts come from `STOCK_ALERTS` endpoint which returns `count`.
   - What's unclear: Whether the dashboard API already returns `averageBasket` (it returns `totalOrders`, `netRevenue`, `grossProfit` -- need to verify if `averageBasket` is included in the daily report response).
   - Recommendation: Check backend `REPORT_DAILY` response shape. If `averageBasket` is missing, it needs to be added (simple: netRevenue / totalOrders). For low-stock count, the `STOCK_ALERTS` endpoint already returns `count` -- just call it from the dashboard.

2. **Nivo version target: 0.87 vs 0.99**
   - What we know: 0.79 is incompatible with React 18. 0.87+ supports React 18. Latest is 0.99.
   - What's unclear: Whether there are breaking API changes between 0.79 and 0.99 that would require code changes.
   - Recommendation: Target `^0.87.0` in package.json (allows npm to resolve to latest compatible). Since no Nivo charts are currently rendered in the app (only installed), there is no migration risk.

3. **NiceAdmin template CSS source**
   - What we know: Admin uses Bootstrap + what appears to be NiceAdmin template styles (info-card, card-icon patterns). Bootstrap is served from `/css/bootstrap.min.css` locally.
   - What's unclear: Whether there is additional NiceAdmin CSS loaded (could be in `<link>` tags we haven't seen, or imported in admin components).
   - Recommendation: Verify all CSS sources in the admin app before modifying card styles. The `ltr.scss` already overrides `.card` styles which may conflict with NiceAdmin.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct reading of all relevant source files:
  - `front/package.json` - Dependency versions and peer dep conflicts
  - `front/src/css/index.scss` - POS design system (CSS custom properties)
  - `front/src/css/ltr.scss` - Base styles, buttons, inputs, tables
  - `front/src/app-frontend/components/modes/pos.tsx` - Main POS layout
  - `front/src/app-frontend/components/search/product.grid.tsx` - Product grid with inline styles
  - `front/src/app-frontend/components/cart/cart.container.tsx` - Cart table layout
  - `front/src/app-frontend/components/sale/sale.inline.tsx` - Checkout flow
  - `front/src/app-admin/containers/dashboard/dashboard.tsx` - Admin KPI cards
  - `front/src/app-admin/containers/reports/*.tsx` - All 5 report pages (data shapes)
  - `front/src/app-admin/containers/layout/sidebar.tsx` - Role-guarded navigation
  - `front/src/app-admin/app.tsx` - Admin routing with RequireRole guards
  - `front/tailwind.config.js` - Custom color palette
  - `front/index.html` - Viewport meta tag (typo found), Bootstrap loading

- **npm ls output** - Verified Nivo 0.79.x peer dependency conflicts with React 18.2.0

### Secondary (MEDIUM confidence)
- [Nivo official site](https://nivo.rocks/) - ResponsiveBar, ResponsivePie, ResponsiveLine API patterns
- [Nivo GitHub releases](https://github.com/plouc/nivo/releases) - Version 0.99.0 latest, React 18 support in 0.87+
- [npm @nivo/line](https://www.npmjs.com/package/@nivo/line) - Latest version 0.99.0
- [WCAG 2.5.8 Target Size](https://wcag.dock.codes/documentation/wcag258/) - 24px minimum (AA), 44px recommended
- [Tailwind CSS v3 Responsive Design](https://v3.tailwindcss.com/docs/responsive-design) - Mobile-first breakpoints, md: at 768px

### Tertiary (LOW confidence)
- Nivo exact version that first supported React 18 (estimated 0.87 based on timeline, not verified from changelog)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly verified from package.json and npm ls
- Architecture: HIGH - Read every relevant source file in both apps
- Pitfalls: HIGH - Found concrete issues (viewport typo, peer dep conflict, inline style duplication, stub page) through code analysis
- Chart patterns: MEDIUM - Nivo API patterns based on official docs, not Context7 verified
- Touch optimization: MEDIUM - Based on WCAG standards and platform guidelines, not POS-specific user testing

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days - stable domain, existing codebase)
