# Phase 6: RTL and Arabic Completion - Research

**Researched:** 2026-02-18
**Domain:** RTL layout, i18n translation completeness, TailwindCSS logical properties, Bootstrap RTL, Ant Design ConfigProvider
**Confidence:** HIGH (codebase verified directly; library APIs confirmed via i18next/Tailwind source + official docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| I18N-01 | Toutes les clés de traduction existantes sont traduites en arabe | Audit shows 2 missing top-level keys (available, in cart) and 0 empty values — gap is small and precisely located |
| I18N-02 | Toutes les nouvelles fonctionnalités (rapports, alertes, rôles, Z-Report) sont traduites en arabe | 20 keys missing from Phase 1-5 components — exact list documented below |
| I18N-03 | Le layout RTL fonctionne correctement sur tous les écrans (TailwindCSS logical properties) | Tailwind 3.1.8 lacks ms-*/me-*/ps-*/pe-* — upgrade to 3.3.x required; 76 occurrences of ml-*/mr-* in TSX/TS to migrate |
| I18N-04 | Ant Design utilise ConfigProvider direction="rtl" en mode arabe | antd 5.4.7 installed; ConfigProvider wraps via index.tsx; direction prop confirmed in API |
</phase_requirements>

---

## Summary

Phase 6 is a systematic completion phase — no new features, only making what exists work correctly in Arabic. It has two distinct tracks: infrastructure (Tailwind upgrade, Bootstrap local asset, RTL switching mechanism) and content (translation gap fill, logical CSS class migration).

The current RTL implementation is partially functional but fragile. Bootstrap swapping uses CDN references in both index.html and two runtime switching functions (topbar.right.tsx, navbar.tsx) — if the CDN is unreachable at switch time, the user sees the wrong layout. The inline script in index.html correctly sets `dir="rtl"` before React mounts, but `document.dir` rather than `document.documentElement.dir` is used at runtime, which is less reliable. The Tailwind upgrade from 3.1.8 to ≥3.3.0 is required to unlock ms-/me-/ps-/pe- utilities; the current installed version generates none of these classes.

The translation gap is smaller than feared. The FR/AR files are nearly in sync (470 vs 468 top-level keys), but 20 keys added in Phases 1-5 are missing from lang.ar.json. Ant Design's actual footprint in the admin is zero (it uses Bootstrap/NiceAdmin template); antd components (Tooltip, notification, Badge, Popover, message) live in the POS frontend. ConfigProvider direction="rtl" must be added at the root (index.tsx) so all antd overlays — notifications, tooltips, popover arrows — flip to RTL.

**Primary recommendation:** Upgrade Tailwind first (unlocks ms-/me-*/ps-/pe-* classes), then install Bootstrap locally and update the two CDN references, then add ConfigProvider, then fill translations, then do the systematic ml-/mr-* → ms-/me-* class migration.

---

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Installed Version | Purpose | Note |
|---------|------------------|---------|------|
| tailwindcss | 3.1.8 (upgrade to ≥3.3.0) | Utility CSS for POS frontend | ms-*/me-*/ps-*/pe-* only in ≥3.3.0 |
| bootstrap | CDN 5.2.0 (install as npm dep) | POS + Admin CSS framework | RTL CSS file must come from local build, not CDN |
| antd | 5.4.7 | Tooltip/Badge/notification/Popover in POS | ConfigProvider direction prop is stable |
| i18next | 21.8.16 | Translation framework | Has `i18n.dir(lng)` API returning 'rtl'/'ltr' |
| react-i18next | 11.18.3 | React bindings for i18next | `useTranslation()` hook gives `i18n` instance |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| NotoSansArabic TTF | local asset | Arabic web font for UI (not PDF) | Must be declared in ltr.scss as @font-face for Arabic body text |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| npm install bootstrap | Keep CDN | CDN is the problem — runtime swap introduces network dependency at language-switch time |
| Tailwind rtl: variants | Logical ms-/me-*/ps-/pe- utilities | Variants require writing `rtl:mr-2 ltr:ml-2` on every element; logical properties are a single class that adapts automatically |
| ConfigProvider at root | Per-component direction | Root wrapping is simpler; per-component approach misses notifications/tooltips which render in portals |

### Installation

```bash
# In front/
npm install tailwindcss@^3.3.0   # upgrade, no API changes between 3.1.8 and 3.3.x
npm install bootstrap@5.2.0       # pin to existing version for local copy
```

---

## Architecture Patterns

### Recommended Project Structure (changes only)

```
front/
├── public/
│   └── css/
│       ├── bootstrap.min.css        # NEW: local Bootstrap 5.2.0 LTR
│       └── bootstrap.rtl.min.css   # NEW: local Bootstrap 5.2.0 RTL
├── src/
│   ├── css/
│   │   └── ltr.scss                # ADD: @font-face NotoSansArabic for web
│   ├── language/
│   │   └── lang.ar.json            # FILL: 20 missing keys
│   ├── index.tsx                   # ADD: ConfigProvider wrapper
│   └── i18next.ts                  # OPTIONAL: add onLanguageChanged listener
└── index.html                      # UPDATE: href → /css/bootstrap[.rtl].min.css
```

### Pattern 1: Tailwind Logical Properties (RTL-safe spacing)

**What:** Replace physical direction classes with logical equivalents that flip automatically based on `dir` attribute on `<html>`.

**When to use:** Every instance of `ml-*`, `mr-*`, `pl-*`, `pr-*` in JSX className strings.

**Mapping:**
| Old (physical) | New (logical) | Behavior |
|----------------|---------------|---------|
| `ml-*` | `ms-*` | margin-inline-start → left in LTR, right in RTL |
| `mr-*` | `me-*` | margin-inline-end → right in LTR, left in RTL |
| `pl-*` | `ps-*` | padding-inline-start |
| `pr-*` | `pe-*` | padding-inline-end |

**Example (confirmed in TailwindCSS v3.3 release notes):**

```tsx
// Before — wrong direction in RTL
<FontAwesomeIcon icon={faCheck} className="mr-2" />

// After — auto-flips in RTL
<FontAwesomeIcon icon={faCheck} className="me-2" />
```

**Source:** https://tailwindcss.com/blog/tailwindcss-v3-3 — "Simplified RTL support with logical properties"

### Pattern 2: Bootstrap RTL Local Asset

**What:** Serve `bootstrap.min.css` and `bootstrap.rtl.min.css` from Vite's `public/` folder instead of CDN. Vite copies `public/` to build root unchanged.

**Why:** The current CDN swap (`document.getElementById('bootstrap-css').setAttribute('href', '...')`) triggers a network request at language-switch time. If the CDN is slow or unreachable, the page renders with wrong direction for several seconds (FOUC). Local files are already cached by the browser on first load.

**Implementation:**

```html
<!-- index.html — update href to local path -->
<link id="bootstrap-css" rel="stylesheet" href="/css/bootstrap.min.css" />
<script>
  (function() {
    var locale = localStorage.getItem('locale');
    if (locale === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
      document.getElementById('bootstrap-css').setAttribute('href', '/css/bootstrap.rtl.min.css');
    } else {
      document.documentElement.setAttribute('lang', 'fr');
    }
  })();
</script>
```

Note: Use `document.documentElement.setAttribute('dir', 'rtl')` (sets `<html dir>`) rather than `document.dir` (sets `<body dir>`). The `<html dir>` attribute is the standard for RTL and controls Bootstrap RTL behavior.

**Copy command to place files:**
```bash
cp node_modules/bootstrap/dist/css/bootstrap.min.css public/css/bootstrap.min.css
cp node_modules/bootstrap/dist/css/bootstrap.rtl.min.css public/css/bootstrap.rtl.min.css
```

### Pattern 3: Ant Design ConfigProvider direction

**What:** Wrap the root render tree in `<ConfigProvider direction={direction}>` where `direction` is `"rtl"` when Arabic is active.

**When to use:** The antd components in this project that are affected by direction: `Tooltip` (arrow flips), `notification.open` (placement defaults), `Badge` (offset), `Popover` (arrow direction), `message`.

**Example:**

```tsx
// src/index.tsx — add ConfigProvider around the whole tree
import { ConfigProvider } from 'antd';
import { useEffect, useState } from 'react';
import i18n from './i18next';

const AppRoot = () => {
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(
    i18n.dir(localStorage.getItem('locale') ?? 'fr') as 'ltr' | 'rtl'
  );

  useEffect(() => {
    const handler = (lng: string) => {
      setDirection(i18n.dir(lng) as 'ltr' | 'rtl');
    };
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);

  return (
    <ConfigProvider direction={direction}>
      {/* existing providers */}
    </ConfigProvider>
  );
};
```

**i18n.dir() API:** `i18n.dir(lng?: string): 'ltr' | 'rtl'` — confirmed present in i18next 21.x (`index.d.ts` line 1108). Arabic ('ar') returns 'rtl'.

**Source:** Ant Design ConfigProvider docs — https://ant.design/components/config-provider/

### Pattern 4: RTL switching — unified function

**Current problem:** The RTL switch logic is duplicated in two places:
- `src/app-frontend/components/modes/topbar.right.tsx` (POS app)
- `src/app-admin/containers/layout/navbar.tsx` (Admin app)

Both do identical CDN URL swapping plus `document.dir = ...`. The proper location is to centralize in i18n's `languageChanged` event (or keep in both but update both consistently).

**Recommended approach:** Keep in each component but extract the document manipulation into a shared utility:

```ts
// src/lib/rtl.ts
import i18n from '../i18next';

export function applyLocale(lang: string) {
  localStorage.setItem('locale', lang);
  i18n.changeLanguage(lang);
  const dir = i18n.dir(lang);
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
  const css = document.getElementById('bootstrap-css');
  if (css) {
    css.setAttribute('href', lang === 'ar'
      ? '/css/bootstrap.rtl.min.css'
      : '/css/bootstrap.min.css');
  }
}
```

### Pattern 5: Arabic web font for UI

The Noto Sans Arabic TTF files already exist in `src/assets/fonts/` (added in Phase 5-03 for @react-pdf/renderer). They must also be declared as a web `@font-face` in `ltr.scss` and applied via CSS when `dir="rtl"`:

```scss
// src/css/ltr.scss — add after existing @font-face declarations
@font-face {
  font-family: 'NotoSansArabic';
  src: url('../assets/fonts/NotoSansArabic-Regular.ttf') format('truetype');
  font-weight: 400;
}

@font-face {
  font-family: 'NotoSansArabic';
  src: url('../assets/fonts/NotoSansArabic-Bold.ttf') format('truetype');
  font-weight: 700;
}
```

Then in `index.scss`, apply inside the `[dir="rtl"]` block:

```scss
[dir="rtl"] {
  html, body, button, input, optgroup, select, textarea {
    font-family: 'NotoSansArabic', sans-serif;
  }
  // ... existing RTL overrides ...
}
```

### Anti-Patterns to Avoid

- **Using `document.dir` instead of `document.documentElement.dir`:** The `<html>` element controls Bootstrap RTL behavior; `<body>` does not. Current code uses `document.dir` (which sets `<body dir>`) — this is incorrect.
- **Keeping `text-left` / `text-right` if they need to flip:** For any text that should flip direction in RTL, use `text-start` / `text-end` (Tailwind logical) or Bootstrap's `text-start`/`text-end` utilities. However, `text-left`/`text-right` are valid if the text alignment is INTENTIONALLY fixed (e.g., a currency display always right-aligned regardless of language).
- **Replacing Bootstrap ms-/me-/ps-/pe- utilities:** The admin already uses Bootstrap's logical utilities (`ms-auto`, `pe-3`, `ps-2`, `ps-3`). These are already RTL-aware in `bootstrap.rtl.min.css`. Do NOT replace them.
- **Adding ConfigProvider without the languageChanged listener:** A static `direction="ltr"` wrapped around the tree will not update when the user switches language at runtime. The listener pattern is required.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RTL direction detection for Arabic | Custom `isArabic()` function | `i18n.dir(lng)` | i18next maintains an authoritative RTL language list; custom lists miss edge cases (ar-EG, ar-MA, etc.) |
| Logical CSS properties for RTL | Manual `[dir='rtl'] .foo { margin-left: ... }` in SCSS | Tailwind ms-/me-/ps-/pe- | The existing `[dir="rtl"]` override block in index.scss is a hack workaround; proper fix is logical properties |
| Antd Tooltip direction flip | CSS transform hack | ConfigProvider direction="rtl" | Tooltips render in portals outside the component tree; only ConfigProvider at root reaches them |

**Key insight:** The existing `[dir="rtl"]` CSS override block in `src/css/index.scss` (lines 445-493) is a symptom of not having logical properties. After migrating to ms-/me-/ps-/pe- classes, most of this block becomes redundant and can be removed or greatly reduced.

---

## Common Pitfalls

### Pitfall 1: Tailwind Upgrade Breaks Nothing (Confirmed)

**What goes wrong:** Developers fear upgrading Tailwind 3.1.8 → 3.3.x will introduce breaking changes.

**Why it happens:** Major version bumps in other ecosystems are breaking; Tailwind 3.x minor releases are not.

**How to avoid:** There are no breaking changes between 3.1.8 and 3.3.x. The upgrade adds new utilities (ms-*, me-*, ps-*, pe-*) without removing existing ones. Run `npm install tailwindcss@^3.3.0` and the build will succeed unchanged.

**Warning signs:** None — but verify after upgrade that the tailwind build output includes `ms-` utilities by checking a dev build.

### Pitfall 2: CDN Swap Triggers FOUC at Language Switch

**What goes wrong:** User switches to Arabic; the app calls `setAttribute('href', '...')` on the Bootstrap link tag; the browser fetches the RTL CSS from CDN; during the fetch (even 200ms), Bootstrap layout is broken.

**Why it happens:** External CDN requests are uncached on first switch, and network latency causes a visible flash.

**How to avoid:** Serve both Bootstrap CSS files from `public/css/`. The browser caches them on first page load. The `setAttribute` swap is then instant (local cache hit).

**Warning signs:** Testing on slow network or with cache disabled reveals visible layout flash when switching language.

### Pitfall 3: `document.dir` vs `document.documentElement.dir`

**What goes wrong:** Current code sets `document.dir = 'rtl'` which targets `<body>`. Bootstrap RTL and TailwindCSS logical properties both key off the `<html>` element's `dir` attribute.

**Why it happens:** `document.dir` is a shortcut that browsers may or may not propagate to `<html>`.

**How to avoid:** Always use `document.documentElement.setAttribute('dir', 'rtl')` or `document.documentElement.dir = 'rtl'`. Also update the lang attribute: `document.documentElement.setAttribute('lang', 'ar')`.

**Warning signs:** Bootstrap sidebar does not flip, or Tailwind logical properties (ms-*) do not activate, despite setting `document.dir`.

### Pitfall 4: ml-/mr-* in SCSS files vs in JSX className

**What goes wrong:** Replacing `ml-` and `mr-` only in TSX files misses the occurrences in `ltr.scss` (3 occurrences) and `index.scss` (2 occurrences in the RTL override block).

**Why it happens:** The search often uses `--include="*.tsx"` only.

**How to avoid:** Run the audit across all file types: `grep -rn "\bml-[0-9]\|\bmr-[0-9]" src/` without type filter. The SCSS occurrences in `ltr.scss` (lines 808, 813, 928) are in Bootstrap-style custom utility definitions; treat them differently (they may need to stay as-is or be converted to logical SCSS).

**Warning signs:** Icon spacing next to buttons is wrong in RTL even after migrating all TSX files.

### Pitfall 5: Missing Arabic Font Causes Garbled Text

**What goes wrong:** The app renders Arabic text in the default `Manrope` font (a Latin font). Arabic glyphs from Manrope are not properly shaped — characters appear as disconnected boxes or unjoined letters.

**Why it happens:** The Noto Sans Arabic TTF files exist in assets (for PDF), but no `@font-face` declaration or CSS rule applies them to the web UI.

**How to avoid:** Add `@font-face` declarations for NotoSansArabic in `ltr.scss` and apply in `[dir="rtl"]` block.

**Warning signs:** Arabic text visible in the app but characters look disconnected or unshaped.

### Pitfall 6: Scope of Tailwind ml-/mr-* Migration

**What goes wrong:** STATE.md mentions "185+ occurrences" — but the actual count in the codebase today is 73-76 occurrences across ~44 files.

**Why it happens:** The "185+" estimate was likely made at a different point in the project's history or counted differently (including commented code, or double-counting).

**How to avoid:** Always run a fresh grep audit before planning the migration scope. Current confirmed count: **76 occurrences** in TSX/TS/SCSS files. Breakdown: ~68 in TSX/TS, ~8 in SCSS. Only the TSX/TS occurrences need Tailwind logical class replacement; SCSS occurrences need case-by-case evaluation.

---

## Code Examples

Verified patterns from codebase inspection and official sources:

### i18next.dir() API usage

```typescript
// Source: i18next/index.d.ts line 1108 (v21.8.16)
// Returns 'rtl' | 'ltr' based on language code
import i18n from './i18next';
const dir = i18n.dir('ar');  // returns 'rtl'
const dir2 = i18n.dir('fr'); // returns 'ltr'
```

### Ant Design ConfigProvider direction (reactive to language change)

```tsx
// Source: Ant Design docs — https://ant.design/components/config-provider/
import { ConfigProvider } from 'antd';
import { useState, useEffect } from 'react';
import i18n from './i18next';

// In root render (index.tsx), wrap entire app
const [direction, setDirection] = useState<'ltr' | 'rtl'>(
  i18n.dir(localStorage.getItem('locale') ?? 'fr') as 'ltr' | 'rtl'
);

useEffect(() => {
  i18n.on('languageChanged', (lng) => {
    setDirection(i18n.dir(lng) as 'ltr' | 'rtl');
  });
}, []);

// Then in JSX:
<ConfigProvider direction={direction}>
  {/* all app providers */}
</ConfigProvider>
```

### Tailwind logical property upgrade (3.1.8 → 3.3.x)

```bash
# front/
npm install tailwindcss@^3.3.0
# No tailwind.config.js changes needed — ms-*/me-*/ps-*/pe-* are built-in
```

```tsx
// Before (3.1.8 — physical):
<FontAwesomeIcon icon={faPlus} className="mr-2" />
<span className="ml-3 btn btn-success">...</span>

// After (3.3.x — logical):
<FontAwesomeIcon icon={faPlus} className="me-2" />
<span className="ms-3 btn btn-success">...</span>
```

### Bootstrap local files setup

```html
<!-- index.html — after change -->
<link id="bootstrap-css" rel="stylesheet" href="/css/bootstrap.min.css" />
<script>
  (function() {
    var locale = localStorage.getItem('locale');
    if (locale === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
      document.getElementById('bootstrap-css').setAttribute('href', '/css/bootstrap.rtl.min.css');
    } else {
      document.documentElement.setAttribute('lang', 'fr');
    }
  })();
</script>
```

### Runtime locale switch (unified utility — proposed)

```typescript
// src/lib/rtl.ts
import i18n from '../i18next';

export async function applyLocale(lang: string) {
  localStorage.setItem('locale', lang);
  await i18n.changeLanguage(lang);
  const dir = i18n.dir(lang);
  document.documentElement.dir = dir;           // correct: targets <html>
  document.documentElement.lang = lang;
  const css = document.getElementById('bootstrap-css');
  if (css) {
    css.setAttribute('href', lang === 'ar'
      ? '/css/bootstrap.rtl.min.css'
      : '/css/bootstrap.min.css'
    );
  }
}
```

---

## Translation Gap — Exact Inventory

This is the authoritative gap list derived from direct file comparison (2026-02-18):

### Missing from lang.ar.json — Phase 1-5 new keys (20 total)

| Key | Component | Suggested Arabic |
|-----|-----------|-----------------|
| `Z-Report` | z-report-page.tsx | تقرير Z |
| `Z-Reports` | z-report-page.tsx, sidebar.tsx | تقارير Z |
| `Closed By` | z-report-page.tsx | أُغلق بواسطة |
| `Closed Sessions` | z-report-page.tsx | الجلسات المغلقة |
| `No closed sessions found` | z-report-page.tsx | لا توجد جلسات مغلقة |
| `Date Range` | report pages | نطاق التاريخ |
| `Vendor Report` | vendor-report.tsx, sidebar.tsx | تقرير المورد |
| `Vendor` | vendor-report.tsx | المورد |
| `Vendor Performance` | vendor-report.tsx | أداء الموردين |
| `Top Vendors` | vendor-report.tsx | أفضل الموردين |
| `Category Report` | category-report.tsx, sidebar.tsx | تقرير الفئات |
| `Category Performance` | category-report.tsx | أداء الفئات |
| `Margin` | profit-report.tsx | هامش الربح |
| `Comparison J-1` | daily-report.tsx | مقارنة يوم -1 |
| `Avg Basket` | report pages | متوسط السلة |
| `Change` | daily-report.tsx | التغيير |
| `Yesterday` | daily-report.tsx | أمس |
| `T` | (abbreviation column header) | ت |
| `available` | POS stock (Phase 4) | متوفر |
| `in cart` | POS cart (Phase 4) | في السلة |

### Missing from lang.ar.json — pre-existing keys not in AR (2 total)

These were in FR but never added to AR:

| Key | FR value |
|-----|---------|
| `available` | disponible |
| `in cart` | dans le panier |

*(These overlap with the table above — total unique missing keys: 20)*

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ltr:ml-2 rtl:mr-2` Tailwind variant stacking | `ms-2` logical property | TailwindCSS v3.3 (March 2023) | Single class instead of two; eliminates need for rtl: variant prefix |
| CDN Bootstrap RTL swap | Local file swap | Best practice 2023+ | Eliminates network dependency at language switch time |
| `document.dir = 'rtl'` | `document.documentElement.dir = 'rtl'` | N/A (always correct) | `<html dir>` is the correct target per HTML spec |
| Physical margin/padding in SCSS | Bootstrap built-in ms-/me-/ps-/pe- + `[dir="rtl"]` overrides | Bootstrap 5.0 (2021) | Bootstrap 5 handles RTL natively; override hacks become unnecessary |

**Deprecated/outdated in this codebase:**
- The `[dir="rtl"]` SCSS override block (index.scss lines 445-493): Partially redundant once logical Tailwind classes are applied. The block should be audited and reduced — only custom component overrides (`.pos-topbar-actions`, `.image-upload-preview`) should remain.
- `document.dir = 'rtl'` usage in topbar.right.tsx and navbar.tsx: Correct to `document.documentElement.dir`.

---

## Codebase Audit Results

These are measured facts from the codebase, not estimates:

### Tailwind Physical → Logical Class Count

| Class Type | Count (TSX/TS) | Count (SCSS) | Total |
|------------|----------------|--------------|-------|
| `ml-*` | ~50 | 3 (ltr.scss) | ~53 |
| `mr-*` | ~18 | 2 (ltr.scss) + 2 (index.scss) | ~22 |
| `pl-*` | 1 | 0 | 1 |
| `pr-*` | 1 | 0 | 1 |
| **Total** | **~70** | **7** | **~77** |

The STATE.md estimate of "185+" was inaccurate. The true scope is ~77 occurrences.

### Files with Most ml-/mr- Usage (Top targets for migration)

1. `app-frontend/components/settings/items/item.tsx` — 6 occurrences
2. `app-frontend/components/sale/sale.history.tsx` — 6 occurrences
3. `app-frontend/components/modes/topbar.right.tsx` — 3 occurrences
4. `css/ltr.scss` — 3 occurrences (SCSS, case-by-case)
5. `app-frontend/components/cart/order.totals.tsx` — 3 occurrences

### Ant Design Components Requiring direction RTL

The admin app uses Bootstrap/NiceAdmin template — NOT Ant Design components in its layouts. Ant Design is used only in the POS frontend app:

| Component | File | RTL Impact |
|-----------|------|------------|
| `Tooltip` | topbar.right.tsx, sale.history.tsx, sale.closing.tsx, more.tsx, pos.tsx, logout.tsx, sale.categories.tsx, sale.brands.tsx, search.table.tsx, sale.departments.tsx, shortcuts.tsx | Arrow direction flips |
| `Badge` | stock.alert.badge.tsx | Offset coordinates flip |
| `notification` | notification.ts, create.terminal.tsx | Placement default changes |
| `message` | use.load.data.ts, more.tsx | Position changes |
| `Popover` | confirm.alert.tsx | Arrow direction flips |

All are addressed by a single ConfigProvider at root — no per-component changes needed.

---

## Open Questions

1. **SCSS ml-/mr- in ltr.scss — migrate or keep?**
   - What we know: 3 occurrences in ltr.scss, used in custom component CSS (not Tailwind utilities in JSX)
   - What's unclear: Whether these SCSS rules will even be processed by Tailwind's `ms-`/`me-` utility substitution
   - Recommendation: Keep SCSS physical properties but add a corresponding `[dir="rtl"]` CSS rule for each, OR convert them to CSS logical properties directly (`margin-inline-end: ...`). Do NOT try to use Tailwind utility classes inside SCSS.

2. **Bootstrap version: stay at 5.2.0 or upgrade to 5.3.x?**
   - What we know: CDN currently loads 5.2.0; Bootstrap 5.3.x is the latest stable (5.3.8)
   - What's unclear: Whether the admin's NiceAdmin template CSS is compatible with 5.3.x
   - Recommendation: Stay at 5.2.0 (as specified in plans 06-01). Upgrading Bootstrap CSS is out of scope for this phase. Download 5.2.0 RTL+LTR from npm registry.

3. **text-left / text-right in TSX — should they be migrated?**
   - What we know: 95 occurrences of text-left/text-right in TSX/TS
   - What's unclear: Whether these all need to flip in RTL (many may be intentional fixed alignment — e.g., prices always right-aligned)
   - Recommendation: Only migrate text-left/text-right instances that are part of UI layout (not data formatting). This is out of scope for plan 06-02 unless specifically causing visible RTL bugs. Flag for audit but do not bulk-replace.

---

## Sources

### Primary (HIGH confidence)

- Codebase direct audit — `/front/src/language/lang.ar.json` vs `lang.fr.json` (key comparison via Python script, 2026-02-18)
- Codebase direct audit — `grep` counts of ml-/mr- across all source files (2026-02-18)
- `/front/node_modules/i18next/index.d.ts` line 1108 — `dir(lng?: string): 'ltr' | 'rtl'` confirmed in installed v21.8.16
- `/front/node_modules/antd/package.json` — version 5.4.7 confirmed installed
- `/front/src/css/index.scss` lines 445-493 — existing [dir="rtl"] block reviewed
- `/front/index.html` — CDN Bootstrap swap mechanism reviewed
- `/front/src/app-frontend/components/modes/topbar.right.tsx` — runtime CDN swap reviewed
- `/front/src/app-admin/containers/layout/navbar.tsx` — admin runtime CDN swap reviewed

### Secondary (MEDIUM confidence)

- TailwindCSS v3.3 official blog post (https://tailwindcss.com/blog/tailwindcss-v3-3) — confirmed ms-/me-/ps-/pe-* added in v3.3.0, March 28, 2023
- WebSearch summary of Ant Design ConfigProvider direction RTL (https://ant.design/components/config-provider/) — confirmed direction prop API

### Tertiary (LOW confidence)

- WebSearch summary about Bootstrap local vs CDN tradeoffs — general principle, not Bootstrap-specific documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions confirmed from installed node_modules
- Architecture: HIGH — patterns derived from existing codebase + verified library APIs
- Translation gap: HIGH — derived from direct file comparison (2026-02-18)
- ml-/mr- scope: HIGH — verified via grep across all source files
- Pitfalls: HIGH (pitfalls 1-5 verified from code); MEDIUM (pitfall 6 — 185+ estimate discrepancy explained)

**Research date:** 2026-02-18
**Valid until:** 2026-03-20 (stable domain, 30-day window)
