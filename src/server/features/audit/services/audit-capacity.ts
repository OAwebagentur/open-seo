import type { LighthouseStrategy } from "@/server/lib/audit/types";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import {
  DEFAULT_AUDIT_PAGES,
  FREE_MAX_AUDIT_PAGES,
  MIN_AUDIT_PAGES,
  PAID_MAX_AUDIT_PAGES,
  SELF_HOSTED_MAX_AUDIT_PAGES,
} from "@/shared/audit-limits";

export type AuditLimitTier = "free" | "paid" | "self_hosted";

// The crawler runs on our Workers compute and isn't credit-metered, so these
// per-tier bounds are the abuse control: free accounts cost nothing to create,
// so they get one small audit at a time and a modest total budget. Paid gets
// bounds sized for real sites rather than abuse (a payment method on file is
// the deterrent). The cumulative bound is a hosted commercial policy, while
// the per-audit page limit is also a technical Workflow/database ceiling.
// Self-hosted is neither: it runs on the operator's own compute, so its
// per-audit page bound is only the runaway-crawl backstop and can be lowered
// again via `OPENSEO_MAX_AUDIT_PAGES` (see `resolveMaxPagesPerAudit`).
export const AUDIT_LIMITS: Record<
  AuditLimitTier,
  {
    maxPagesPerAudit: number;
    maxCapacityUnits: number;
    maxRunningAudits: number;
  }
> = {
  free: {
    maxPagesPerAudit: FREE_MAX_AUDIT_PAGES,
    maxCapacityUnits: 2_000,
    maxRunningAudits: 1,
  },
  paid: {
    maxPagesPerAudit: PAID_MAX_AUDIT_PAGES,
    maxCapacityUnits: 100_000,
    maxRunningAudits: Number.POSITIVE_INFINITY,
  },
  self_hosted: {
    maxPagesPerAudit: SELF_HOSTED_MAX_AUDIT_PAGES,
    maxCapacityUnits: Number.POSITIVE_INFINITY,
    maxRunningAudits: Number.POSITIVE_INFINITY,
  },
};

export function clampAuditMaxPages(
  maxPages?: number,
  ceiling: number = PAID_MAX_AUDIT_PAGES,
) {
  return Math.min(
    Math.max(maxPages ?? DEFAULT_AUDIT_PAGES, MIN_AUDIT_PAGES),
    ceiling,
  );
}

/**
 * Effective per-audit page bound for a tier. Hosted tiers are the static table
 * above; self-hosted defaults to the runaway backstop and honours an operator
 * override via `OPENSEO_MAX_AUDIT_PAGES` (clamped into the supported range, and
 * ignored when it isn't a finite number).
 */
export async function resolveMaxPagesPerAudit(
  tier: AuditLimitTier,
): Promise<number> {
  if (tier !== "self_hosted") return AUDIT_LIMITS[tier].maxPagesPerAudit;

  const configured = await getOptionalEnvValue("OPENSEO_MAX_AUDIT_PAGES");
  const parsed = Number.parseInt(configured ?? "", 10);
  if (!Number.isFinite(parsed)) return SELF_HOSTED_MAX_AUDIT_PAGES;

  return Math.min(
    Math.max(parsed, MIN_AUDIT_PAGES),
    SELF_HOSTED_MAX_AUDIT_PAGES,
  );
}

export function getEstimatedAuditCapacity(input: {
  maxPages?: number;
  lighthouseStrategy?: LighthouseStrategy;
  ceiling?: number;
}) {
  const pagesTotal = clampAuditMaxPages(input.maxPages, input.ceiling);
  const lighthouseStrategy = input.lighthouseStrategy ?? "auto";
  // "auto" samples up to 10 pages, checked on mobile + desktop.
  const lighthouseChecks = lighthouseStrategy === "auto" ? 20 : 0;

  return {
    pagesTotal,
    lighthouseTotal: lighthouseChecks,
    total: pagesTotal + lighthouseChecks,
  };
}
