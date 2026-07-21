// Helpers for the @db.Date column: store dates at UTC midnight so the
// @@unique([userId, date, batchId]) constraint dedupes correctly per day
// regardless of server timezone.

export function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function parseDateOnly(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
