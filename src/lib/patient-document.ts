export const DOCUMENT_TYPES = ["dni", "cedula", "carnet", "pasaporte"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  dni: "DNI",
  cedula: "Cédula",
  carnet: "Carnet",
  pasaporte: "Pasaporte",
};

export function isDocumentType(s: string): s is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(s);
}

export function normalizeDocumentType(
  v: string | null | undefined,
): DocumentType {
  const s = String(v ?? "").toLowerCase();
  if (isDocumentType(s)) return s;
  return "dni";
}

export function formatPatientDocument(p: {
  documentType?: string | null;
  dni: string;
}): string {
  const t = normalizeDocumentType(p.documentType);
  return `${DOCUMENT_TYPE_LABELS[t]} ${p.dni}`;
}

export function validatePatientDocument(
  documentTypeRaw: string,
  rawNumber: string,
):
  | { ok: true; documentType: DocumentType; number: string }
  | { ok: false; error: string } {
  const typeNorm = String(documentTypeRaw ?? "").toLowerCase();
  if (!isDocumentType(typeNorm)) {
    return { ok: false, error: "Tipo de documento no válido." };
  }
  const n = rawNumber.trim();
  if (!n) {
    return { ok: false, error: "El número de documento es obligatorio." };
  }
  if (typeNorm === "dni") {
    if (!/^\d{8}$/.test(n)) {
      return { ok: false, error: "El DNI debe tener 8 dígitos." };
    }
    return { ok: true, documentType: "dni", number: n };
  }
  if (n.length < 4 || n.length > 32) {
    return {
      ok: false,
      error: "El documento debe tener entre 4 y 32 caracteres.",
    };
  }
  if (!/^[\dA-Za-zÁÉÍÓÚÑáéíóúñ.\-\s]+$/.test(n)) {
    return {
      ok: false,
      error: "El número de documento contiene caracteres no permitidos.",
    };
  }
  const collapsed = n.replace(/\s+/g, " ").trim();
  return { ok: true, documentType: typeNorm, number: collapsed };
}
