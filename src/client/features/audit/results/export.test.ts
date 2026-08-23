/* oxlint-disable typescript/no-unsafe-type-assertion -- fixtures carry only the columns the exporters read */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditResultsData } from "@/client/features/audit/results/types";
import type * as CsvModule from "@/client/lib/csv";

const copyTableToClipboard = vi.fn(
  async (_headers: string[], _rows: CsvModule.CsvValue[][]) => {},
);
const copyTextToClipboard = vi.fn(async (_text: string) => {});
const downloadFile = vi.fn(
  (_content: string, _fileName: string, _mimeType: string) => {},
);
const downloadCsv = vi.fn((_fileName: string, _content: string) => {});
const captureClientEvent = vi.fn(
  (_event: string, _properties?: Record<string, unknown>) => {},
);
const toastSuccess = vi.fn((_message: string) => {});
const toastError = vi.fn((_message: string) => {});
const toastWarning = vi.fn((_message: string) => {});

vi.mock("@/client/lib/clipboard", () => ({
  copyTableToClipboard,
  copyTextToClipboard,
}));
vi.mock("@/client/lib/download", () => ({ downloadFile }));
vi.mock("@/client/lib/csv", async (importOriginal) => ({
  ...(await importOriginal<typeof CsvModule>()),
  downloadCsv,
}));
vi.mock("@/client/lib/posthog", () => ({ captureClientEvent }));
vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError, warning: toastWarning },
}));

const { exportIssues, exportPages, exportPerformance, MAX_CLIPBOARD_ROWS } =
  await import("@/client/features/audit/results/export");

type Page = AuditResultsData["pages"][number];
type Issue = AuditResultsData["issues"][number];
type Lighthouse = AuditResultsData["lighthouse"][number];

function makePage(index: number): Page {
  return {
    id: `page-${index}`,
    url: `https://example.com/page-${index}`,
    statusCode: 200,
    title: `Page ${index}`,
    h1Count: 1,
    wordCount: 500 + index,
    imagesTotal: 3,
    imagesMissingAlt: 1,
    responseTimeMs: 120 + index,
  } as unknown as Page;
}

function makeIssue(index: number): Issue {
  return {
    id: `issue-${index}`,
    issueType: "missing_title",
    severity: "critical",
    pageUrl: `https://example.com/page-${index}`,
    detailsJson: JSON.stringify({ index }),
  } as unknown as Issue;
}

function makeLighthouse(index: number): Lighthouse {
  return {
    id: `lh-${index}`,
    pageId: `page-${index}`,
    strategy: "mobile",
    performanceScore: 80,
    accessibilityScore: 90,
    seoScore: 95,
    lcpMs: 2100,
    cls: 0.05,
    inpMs: 180,
    ttfbMs: 300,
  } as unknown as Lighthouse;
}

// The tables paginate at 50 rows; every fixture is larger so a copy that
// silently used the visible page instead of the full array would be caught.
const pages = Array.from({ length: 120 }, (_, index) => makePage(index));
const issues = Array.from({ length: 120 }, (_, index) => makeIssue(index));
const lighthouse = Array.from({ length: 120 }, (_, index) =>
  makeLighthouse(index),
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("copy-tsv", () => {
  it("copies every issue row, not just the first table page", async () => {
    exportIssues(issues, "copy-tsv");
    await vi.waitFor(() => expect(copyTableToClipboard).toHaveBeenCalled());

    const [headers, rows] = copyTableToClipboard.mock.calls[0];
    expect(headers).toEqual([
      "Severity",
      "Issue",
      "URL",
      "Details",
      "How To Fix",
    ]);
    expect(rows).toHaveLength(120);
    expect(rows[119][2]).toBe("https://example.com/page-119");
    expect(toastSuccess).toHaveBeenCalledWith(
      "Copied 120 rows to your clipboard",
    );
    expect(captureClientEvent).toHaveBeenCalledWith("data:export_clipboard", {
      source_feature: "audit_issues",
      format: "tsv",
      result_count: 120,
    });
  });

  it("copies every page row", async () => {
    exportPages(pages, "copy-tsv");
    await vi.waitFor(() => expect(copyTableToClipboard).toHaveBeenCalled());

    const [, rows] = copyTableToClipboard.mock.calls[0];
    expect(rows).toHaveLength(120);
    expect(rows[119][0]).toBe("https://example.com/page-119");
  });

  it("copies every performance row", async () => {
    exportPerformance(lighthouse, pages, "copy-tsv");
    await vi.waitFor(() => expect(copyTableToClipboard).toHaveBeenCalled());

    const [, rows] = copyTableToClipboard.mock.calls[0];
    expect(rows).toHaveLength(120);
    expect(rows[119][0]).toBe("https://example.com/page-119");
  });

  it("reports an empty selection instead of copying", async () => {
    exportIssues([], "copy-tsv");
    await vi.waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(copyTableToClipboard).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("No data to copy");
  });

  it("surfaces a clipboard failure as an error toast", async () => {
    copyTableToClipboard.mockRejectedValueOnce(
      new Error("Clipboard API not available in this browser."),
    );
    exportPages(pages, "copy-tsv");
    await vi.waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith(
      "Clipboard API not available in this browser.",
    );
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe("copy-json", () => {
  it("copies exactly what the JSON download writes", async () => {
    exportPages(pages, "json");
    const downloaded = downloadFile.mock.calls[0][0];

    exportPages(pages, "copy-json");
    await vi.waitFor(() => expect(copyTextToClipboard).toHaveBeenCalled());

    expect(copyTextToClipboard.mock.calls[0][0]).toBe(downloaded);
    expect(toastSuccess).toHaveBeenCalledWith(
      "Copied 120 rows to your clipboard as JSON",
    );
    expect(captureClientEvent).toHaveBeenCalledWith("data:export_clipboard", {
      source_feature: "audit_pages",
      format: "json",
      result_count: 120,
    });
  });

  it("matches the issues download, parsed details included", async () => {
    exportIssues(issues, "json");
    const downloaded = downloadFile.mock.calls[0][0];

    exportIssues(issues, "copy-json");
    await vi.waitFor(() => expect(copyTextToClipboard).toHaveBeenCalled());

    const copied = copyTextToClipboard.mock.calls[0][0];
    expect(copied).toBe(downloaded);
    expect((JSON.parse(copied) as { details: unknown }[])[0].details).toEqual({
      index: 0,
    });
  });

  it("matches the performance download", async () => {
    exportPerformance(lighthouse, pages, "json");
    const downloaded = downloadFile.mock.calls[0][0];

    exportPerformance(lighthouse, pages, "copy-json");
    await vi.waitFor(() => expect(copyTextToClipboard).toHaveBeenCalled());

    expect(copyTextToClipboard.mock.calls[0][0]).toBe(downloaded);
  });

  it("reports an empty selection instead of copying", async () => {
    exportPerformance([], pages, "copy-json");
    await vi.waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(copyTextToClipboard).not.toHaveBeenCalled();
  });
});

describe("clipboard row limit", () => {
  // Der Guard liest nur die Laenge, deshalb reicht dieselbe Zeile n-mal.
  const overLimit = Array.from<Page>({ length: MAX_CLIPBOARD_ROWS + 1 }).fill(
    pages[0],
  );

  it("refuses to copy more rows than the limit instead of truncating", () => {
    exportPages(overLimit, "copy-tsv");
    exportPages(overLimit, "copy-json");

    expect(copyTableToClipboard).not.toHaveBeenCalled();
    expect(copyTextToClipboard).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(2);
    expect(toastError).toHaveBeenLastCalledWith(
      `Too many rows to copy: ${(MAX_CLIPBOARD_ROWS + 1).toLocaleString()} rows exceeds the clipboard limit of ${MAX_CLIPBOARD_ROWS.toLocaleString()} rows. Download the CSV or JSON export instead.`,
    );
  });

  it("leaves the download unlimited", () => {
    exportPages(overLimit, "csv");
    expect(downloadCsv).toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("unreadable issue details", () => {
  it("exports the raw text for the broken row and keeps the rest intact", async () => {
    const broken = [
      makeIssue(0),
      { ...makeIssue(1), detailsJson: "{not json" } as Issue,
      makeIssue(2),
    ];

    exportIssues(broken, "copy-json");
    await vi.waitFor(() => expect(copyTextToClipboard).toHaveBeenCalled());

    const copied = JSON.parse(copyTextToClipboard.mock.calls[0][0]) as {
      url: string;
      details: unknown;
    }[];
    expect(copied).toHaveLength(3);
    expect(copied[0].details).toEqual({ index: 0 });
    expect(copied[1].details).toBe("{not json");
    expect(copied[2]).toMatchObject({
      url: "https://example.com/page-2",
      details: { index: 2 },
    });
    expect(toastWarning).toHaveBeenCalledWith(
      "1 row had details that are not valid JSON; the raw text was exported instead.",
    );
  });
});

describe("existing formats", () => {
  it("still downloads CSV", () => {
    exportPages(pages, "csv");
    expect(downloadCsv).toHaveBeenCalledWith(
      "audit-pages.csv",
      expect.stringContaining("https://example.com/page-119"),
    );
    expect(copyTableToClipboard).not.toHaveBeenCalled();
  });
});
