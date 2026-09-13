/** Normaliza lista de procedimientos de una cita. */
export function normalizeProcedures(
  input: unknown,
  fallbackType?: string | null,
): string[] {
  const fromArray = (arr: unknown[]): string[] => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of arr) {
      const name = String(item ?? "").trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      out.push(name);
    }
    return out;
  };

  if (Array.isArray(input)) {
    const list = fromArray(input);
    if (list.length > 0) return list;
  }

  if (typeof input === "string" && input.trim()) {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (Array.isArray(parsed)) {
        const list = fromArray(parsed);
        if (list.length > 0) return list;
      }
    } catch {
      // no es JSON
    }
    // Compat: "A · B" o "A + B"
    const parts = input
      .split(/\s*[·+|]\s*|\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 1) return fromArray(parts);
    return fromArray([input]);
  }

  const fallback = (fallbackType ?? "").trim();
  return fallback ? [fallback] : [];
}

export function proceduresLabel(procedures: string[]): string {
  if (procedures.length === 0) return "Consulta";
  return procedures.join(" · ");
}

export function appointmentProcedures(a: {
  type?: string | null;
  procedures?: unknown;
}): string[] {
  return normalizeProcedures(a.procedures, a.type);
}
