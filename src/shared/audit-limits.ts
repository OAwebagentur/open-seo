// Per-audit page bounds. Shared so the launch form, the input schema, and the
// server-side tier gate all read the same numbers and can't drift apart.
export const MIN_AUDIT_PAGES = 10;
export const DEFAULT_AUDIT_PAGES = 50;
export const FREE_MAX_AUDIT_PAGES = 50;
export const PAID_MAX_AUDIT_PAGES = 10_000;

// Gehostete Tiers behalten die 10k-Grenze. Self-hosted laeuft auf der Compute
// des Betreibers und erbt deshalb kein kommerzielles Abuse-Limit; die effektive
// Grenze wird pro Tier in `resolveMaxPagesPerAudit` aufgeloest und laesst sich
// per Env `OPENSEO_MAX_AUDIT_PAGES` wieder senken. Bewusst endlich, damit ein
// Tippfehler im Formular keinen Runaway-Crawl einreiht.
export const SELF_HOSTED_MAX_AUDIT_PAGES = 1_000_000;
export const MAX_AUDIT_PAGES_CEILING = SELF_HOSTED_MAX_AUDIT_PAGES;
