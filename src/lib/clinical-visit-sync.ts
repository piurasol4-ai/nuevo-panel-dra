const CHANNEL_NAME = "harmonia-clinical-visit";

export type ClinicalVisitSyncMessage = {
  patientId: string;
  visitId: string;
};

/** Avisa a otras pestañas (p. ej. Registro de atenciones) que la ficha cambió. */
export function notifyVisitUpdated(patientId: string, visitId: string) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ patientId, visitId } satisfies ClinicalVisitSyncMessage);
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
