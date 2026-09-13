const CHANNEL_NAME = "harmonia-clinical-visit";

export type ClinicalVisitSyncMessage = {
  patientId: string;
  visitId: string;
  /** Campos tocados en este guardado (para no pisar otros en el otro dispositivo). */
  updatedKeys?: string[];
  role?: "enfermeria" | "doctora" | "unknown";
};

/** Avisa a otras pestañas/dispositivos del mismo navegador que la ficha cambió. */
export function notifyVisitUpdated(
  patientId: string,
  visitId: string,
  meta?: { updatedKeys?: string[]; role?: ClinicalVisitSyncMessage["role"] },
) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({
    patientId,
    visitId,
    updatedKeys: meta?.updatedKeys,
    role: meta?.role ?? "unknown",
  } satisfies ClinicalVisitSyncMessage);
  channel.close();
}

export function subscribeVisitUpdated(
  handler: (msg: ClinicalVisitSyncMessage) => void,
): () => void {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return () => {};
  }
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<ClinicalVisitSyncMessage>) => {
    const data = event.data;
    if (data?.patientId && data?.visitId) handler(data);
  };
  return () => channel.close();
}
