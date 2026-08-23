import {
  DEFAULT_AUDIT_PAGES,
  FREE_MAX_AUDIT_PAGES,
  MAX_AUDIT_PAGES_CEILING,
  MIN_AUDIT_PAGES,
} from "@/shared/audit-limits";

export const MIN_PAGES = MIN_AUDIT_PAGES;

export function getMaxPagesLimit(isFreePlan: boolean) {
  return isFreePlan ? FREE_MAX_AUDIT_PAGES : MAX_AUDIT_PAGES_CEILING;
}

export type LaunchFormValues = {
  url: string;
  maxPagesInput: string;
  runLighthouse: boolean;
};

export const DEFAULT_LAUNCH_FORM_VALUES: LaunchFormValues = {
  url: "",
  maxPagesInput: String(DEFAULT_AUDIT_PAGES),
  runLighthouse: false,
};
