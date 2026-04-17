export const HONEYPOT_FIELD = "order_nickname";
export const TIMESTAMP_FIELD = "order_started_at";

export const MIN_FILL_MS = 3_000;
export const MAX_FILL_MS = 60 * 60 * 1_000;

export function looksLikeBot(form: FormData): boolean {
  const honey = form.get(HONEYPOT_FIELD);
  if (typeof honey === "string" && honey.trim().length > 0) {
    return true;
  }

  const rawTs = form.get(TIMESTAMP_FIELD);
  if (typeof rawTs !== "string") return true;
  const ts = Number.parseInt(rawTs, 10);
  if (!Number.isFinite(ts)) return true;

  const delta = Date.now() - ts;
  if (delta < MIN_FILL_MS) return true;
  if (delta > MAX_FILL_MS) return true;

  return false;
}
