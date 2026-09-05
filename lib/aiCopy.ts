import { t } from "./i18n";
import type { AiFail } from "./aiTypes";

export function aiErrorText(error: AiFail["error"]) {
  if (error === "rate_limited") return t("ai.rateLimited");
  if (error === "bad_input") return t("ai.badInput");
  return t("ai.unavailable");
}
