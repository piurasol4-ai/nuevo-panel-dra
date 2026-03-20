export function parseSolesToCents(value: unknown): number {
  const text = String(value ?? "").trim();
  if (!text) return 0;

  // Ejemplos aceptados:
  // - "S/ 2.50"
  // - "2.50"
  // - "2,50"
  const normalized = text
    .replace(/^S\/\s*/i, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.]/g, "");

  if (!normalized) return 0;

  // Evita múltiples dots (toma la primera parte decimal).
  const parts = normalized.split(".");
  const intPart = parts[0] ?? "0";
  const decPart = (parts[1] ?? "").slice(0, 2).padEnd(2, "0");

  const dec = Number(decPart);
  const int = Number(intPart);
  if (!Number.isFinite(int) || !Number.isFinite(dec)) return 0;

  return int * 100 + dec;
}

export function centsToSoles(cents: number): string {
  const x = Number.isFinite(cents) ? cents : 0;
  const soles = x / 100;
  return soles.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function centsToDisplay(cents: number): string {
  return `S/ ${centsToSoles(cents)}`;
}

