# PR: Paginate audit result tables

- **Target:** `every-app/open-seo` ← `OAwebagentur/open-seo:feat/audit-table-pagination`
- **Title:** `Paginate audit result tables`

---

## Problem

The audit result tables render one DOM row per crawled page. There is no upper
bound: a 10,000-page audit produces a 10,000-row table. On large audits this
makes the results view slow to render and effectively unnavigable — the browser
spends its time laying out rows nobody is looking at, and reaching a specific
page means scrolling through everything before it.

## Solution

Client-side pagination for both result tables, built on the table primitives the
repository already ships — `useAppTable`, `AppDataTable` and `TablePagination` —
rather than a new mechanism:

- `PagesTable` and `ResultsTables` now render one page of rows at a time.
- **All rows stay in memory.** Pagination only bounds how many rows are in the
  DOM at once; filtering, sorting and CSV export keep operating on the full
  result set, so exports are unchanged and a filter still searches every row.
- Page size is selectable — `50 / 100 / 250 / 500`, defined once as
  `AUDIT_TABLE_PAGE_SIZES` in the shared results types module.
- Changing a filter resets the page index, so a narrowed result set cannot leave
  the user stranded on an empty page.

## Scope

Three files, client-only:

- `src/client/features/audit/results/PagesTable.tsx`
- `src/client/features/audit/results/ResultsTables.tsx`
- `src/client/features/audit/results/types.ts`

No server, schema or migration changes. No new dependencies. No change to the
audit payload or to any server function.

## Testing

- `tsc --noEmit` — clean.
- Test suite — no regressions.
- Verified manually against a self-hosted Docker build:
  - the pagination bar appears below the results tables;
  - with 10,000 rows the tables page correctly (page 2 of 200 at the default
    page size), and switching page size re-paginates as expected;
  - CSV export still contains **all** rows, not just the visible page.
