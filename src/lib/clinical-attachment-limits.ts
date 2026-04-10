/** Límite alineado con la API `/api/clinical-notes/attachments/upload`. */
export const CLINICAL_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

export const CLINICAL_ATTACHMENT_MAX_LABEL = "15 MB";

export function clinicalAttachmentSizeErrorMessage(actualBytes?: number): string {
  const tail =
    "Reduce el tamaño o comprime el PDF o la imagen antes de volver a intentarlo.";
  if (
    actualBytes != null &&
    actualBytes > CLINICAL_ATTACHMENT_MAX_BYTES
  ) {
    const mb = (actualBytes / (1024 * 1024)).toLocaleString("es-PE", {
      maximumFractionDigits: 1,
    });
    return `El archivo es demasiado grande (aprox. ${mb} MB). El máximo permitido es ${CLINICAL_ATTACHMENT_MAX_LABEL}. ${tail}`;
  }
  return `El archivo es demasiado grande (máx. ${CLINICAL_ATTACHMENT_MAX_LABEL}). ${tail}`;
}

export function isClinicalAttachmentOverLimit(sizeBytes: number): boolean {
  return sizeBytes > CLINICAL_ATTACHMENT_MAX_BYTES;
}
