const LIMA_OFFSET = "-05:00";

/** Inicio del día (00:00) en hora de Lima para una fecha ISO local YYYY-MM-DD. */
export function limaDayStartUTC(isoDate: string): Date | null {
  const trimmed = isoDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00${LIMA_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Fin del día (23:59:59.999) en hora de Lima para una fecha ISO local YYYY-MM-DD. */
export function limaDayEndUTC(isoDate: string): Date | null {
  const trimmed = isoDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T23:59:59.999${LIMA_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toLocalISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createdAtRangeWhere(
  dateFrom?: string | null,
  dateTo?: string | null,
): { createdAt?: { gte?: Date; lte?: Date } } {
  const range: { gte?: Date; lte?: Date } = {};
  if (dateFrom?.trim()) {
    const start = limaDayStartUTC(dateFrom);
    if (start) range.gte = start;
  }
  if (dateTo?.trim()) {
    const end = limaDayEndUTC(dateTo);
    if (end) range.lte = end;
  }
  if (!range.gte && !range.lte) return {};
  return { createdAt: range };
}

/** Compara una fecha ISO (createdAt) contra un rango local YYYY-MM-DD. */
export function isIsoDateInLocalRange(
  isoDateTime: string,
  dateFrom: string,
  dateTo: string,
): boolean {
  const day = isoDateTime.slice(0, 10);
  if (dateFrom && day < dateFrom) return false;
  if (dateTo && day > dateTo) return false;
  return true;
}

export function buildDateRangeQuery(
  dateFrom: string,
  dateTo: string,
): string {
  const params = new URLSearchParams();
  if (dateFrom.trim()) params.set("dateFrom", dateFrom.trim());
  if (dateTo.trim()) params.set("dateTo", dateTo.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
