import type { getAuditResults } from "@/serverFunctions/audit";

export type AuditResultsData = Awaited<ReturnType<typeof getAuditResults>>;

/**
 * Audit result tables hold every row client-side (filtering, sorting and
 * export all work on the full array); pagination only bounds how many rows
 * are in the DOM at once.
 */
export const AUDIT_TABLE_PAGE_SIZES = [50, 100, 250, 500] as const;
