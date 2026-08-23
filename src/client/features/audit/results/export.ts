import { toast } from "sonner";
import type { AuditResultsData } from "@/client/features/audit/results/types";
import { getIssueDescriptor } from "@/shared/audit-issues";
import { buildCsv, type CsvValue, downloadCsv } from "@/client/lib/csv";
import {
  copyTableToClipboard,
  copyTextToClipboard,
} from "@/client/lib/clipboard";
import { downloadFile } from "@/client/lib/download";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { captureClientEvent } from "@/client/lib/posthog";

/**
 * `copy-tsv` writes tab-separated text, not CSV: TSV pastes straight into
 * Excel/Sheets cells while a pasted CSV lands in a single column. `copy-json`
 * hands the same rows the JSON download produces to other tooling.
 */
export type ExportFormat = "csv" | "json" | "sheets" | "copy-tsv" | "copy-json";

function formatRowCount(count: number): string {
  return `${count.toLocaleString()} row${count === 1 ? "" : "s"}`;
}

async function copyRowsToClipboard(
  headers: string[],
  rows: CsvValue[][],
  feature: string,
) {
  if (rows.length === 0) {
    toast.error("No data to copy");
    return;
  }
  try {
    await copyTableToClipboard(headers, rows);
    captureClientEvent("data:export_clipboard", {
      source_feature: feature,
      format: "tsv",
      result_count: rows.length,
    });
    toast.success(`Copied ${formatRowCount(rows.length)} to your clipboard`);
  } catch (error) {
    toast.error(getStandardErrorMessage(error, "Could not copy to clipboard"));
  }
}

async function copyJsonToClipboard(rows: unknown[], feature: string) {
  if (rows.length === 0) {
    toast.error("No data to copy");
    return;
  }
  try {
    await copyTextToClipboard(JSON.stringify(rows, null, 2));
    captureClientEvent("data:export_clipboard", {
      source_feature: feature,
      format: "json",
      result_count: rows.length,
    });
    toast.success(
      `Copied ${formatRowCount(rows.length)} to your clipboard as JSON`,
    );
  } catch (error) {
    toast.error(getStandardErrorMessage(error, "Could not copy to clipboard"));
  }
}

const ISSUES_HEADERS = ["Severity", "Issue", "URL", "Details", "How To Fix"];

function issuesRows(issues: AuditResultsData["issues"]): CsvValue[][] {
  return issues.map((issue) => {
    const descriptor = getIssueDescriptor(issue.issueType);
    return [
      issue.severity,
      descriptor?.title ?? issue.issueType,
      issue.pageUrl,
      issue.detailsJson ?? "",
      descriptor?.howToFix ?? "",
    ];
  });
}

function issuesJson(issues: AuditResultsData["issues"]) {
  return issues.map((issue) => {
    const descriptor = getIssueDescriptor(issue.issueType);
    return {
      severity: issue.severity,
      issueType: issue.issueType,
      issue: descriptor?.title ?? issue.issueType,
      url: issue.pageUrl,
      details: issue.detailsJson
        ? (JSON.parse(issue.detailsJson) as unknown)
        : null,
      howToFix: descriptor?.howToFix ?? null,
    };
  });
}

export function exportIssues(
  issues: AuditResultsData["issues"],
  format: ExportFormat,
) {
  if (format === "json") {
    downloadFile(
      JSON.stringify(issuesJson(issues), null, 2),
      "audit-issues.json",
      "application/json",
    );
    return;
  }

  if (format === "copy-json") {
    void copyJsonToClipboard(issuesJson(issues), "audit_issues");
    return;
  }

  if (format === "copy-tsv") {
    void copyRowsToClipboard(
      ISSUES_HEADERS,
      issuesRows(issues),
      "audit_issues",
    );
    return;
  }

  if (format === "sheets") {
    void exportTableToSheets({
      headers: ISSUES_HEADERS,
      rows: issuesRows(issues),
      feature: "audit_issues",
    });
    return;
  }

  downloadCsv("audit-issues.csv", buildCsv(ISSUES_HEADERS, issuesRows(issues)));
}

const PAGES_HEADERS = [
  "URL",
  "Status",
  "Title",
  "H1",
  "Words",
  "Images",
  "Missing Alt",
  "Response Time (ms)",
];

function pagesRows(pages: AuditResultsData["pages"]): CsvValue[][] {
  return pages.map((page) => [
    page.url,
    page.statusCode,
    page.title ?? "",
    page.h1Count,
    page.wordCount,
    page.imagesTotal,
    page.imagesMissingAlt,
    page.responseTimeMs,
  ]);
}

function pagesJson(pages: AuditResultsData["pages"]) {
  return pages.map((page) => ({
    url: page.url,
    statusCode: page.statusCode,
    title: page.title ?? "",
    h1Count: page.h1Count,
    wordCount: page.wordCount,
    imagesTotal: page.imagesTotal,
    imagesMissingAlt: page.imagesMissingAlt,
    responseTimeMs: page.responseTimeMs,
  }));
}

const PERFORMANCE_HEADERS = [
  "URL",
  "Device",
  "Performance",
  "Accessibility",
  "SEO",
  "LCP (ms)",
  "CLS",
  "INP (ms)",
  "TTFB (ms)",
];

function performanceRows(
  lighthouse: AuditResultsData["lighthouse"],
  pages: AuditResultsData["pages"],
): CsvValue[][] {
  return lighthouse.map((result) => {
    const page = pages.find((candidate) => candidate.id === result.pageId);
    return [
      page?.url ?? "",
      result.strategy,
      result.performanceScore,
      result.accessibilityScore,
      result.seoScore,
      result.lcpMs,
      result.cls,
      result.inpMs,
      result.ttfbMs,
    ];
  });
}

function performanceJson(
  lighthouse: AuditResultsData["lighthouse"],
  pages: AuditResultsData["pages"],
) {
  return lighthouse.map((result) => {
    const page = pages.find((candidate) => candidate.id === result.pageId);
    return {
      url: page?.url ?? "",
      strategy: result.strategy,
      performance: result.performanceScore,
      accessibility: result.accessibilityScore,
      seo: result.seoScore,
      lcpMs: result.lcpMs,
      cls: result.cls,
      inpMs: result.inpMs,
      ttfbMs: result.ttfbMs,
    };
  });
}

export function exportPages(
  pages: AuditResultsData["pages"],
  format: ExportFormat,
) {
  if (format === "json") {
    downloadFile(
      JSON.stringify(pagesJson(pages), null, 2),
      "audit-pages.json",
      "application/json",
    );
    return;
  }

  if (format === "copy-json") {
    void copyJsonToClipboard(pagesJson(pages), "audit_pages");
    return;
  }

  if (format === "copy-tsv") {
    void copyRowsToClipboard(PAGES_HEADERS, pagesRows(pages), "audit_pages");
    return;
  }

  if (format === "sheets") {
    void exportTableToSheets({
      headers: PAGES_HEADERS,
      rows: pagesRows(pages),
      feature: "audit_pages",
    });
    return;
  }

  downloadCsv("audit-pages.csv", buildCsv(PAGES_HEADERS, pagesRows(pages)));
}

export function exportPerformance(
  lighthouse: AuditResultsData["lighthouse"],
  pages: AuditResultsData["pages"],
  format: ExportFormat,
) {
  if (format === "json") {
    downloadFile(
      JSON.stringify(performanceJson(lighthouse, pages), null, 2),
      "audit-performance.json",
      "application/json",
    );
    return;
  }

  if (format === "copy-json") {
    void copyJsonToClipboard(
      performanceJson(lighthouse, pages),
      "audit_performance",
    );
    return;
  }

  const rows = performanceRows(lighthouse, pages);

  if (format === "copy-tsv") {
    void copyRowsToClipboard(PERFORMANCE_HEADERS, rows, "audit_performance");
    return;
  }

  if (format === "sheets") {
    void exportTableToSheets({
      headers: PERFORMANCE_HEADERS,
      rows,
      feature: "audit_performance",
    });
    return;
  }

  downloadCsv("audit-performance.csv", buildCsv(PERFORMANCE_HEADERS, rows));
}
