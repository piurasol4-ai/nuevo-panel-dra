"use client";

import Link from "next/link";

import { formatPatientDocument } from "@/lib/patient-document";

export type PatientNameEntry = {
  id: string;
  fullName: string;
  documentType?: string;
  dni: string;
  registeredAt?: string | null;
};

type PatientNamesDialogProps = {
  open: boolean;
  title: string;
  patients: PatientNameEntry[];
  onClose: () => void;
};

export default function PatientNamesDialog({
  open,
  title,
  patients,
  onClose,
}: PatientNamesDialogProps) {
  if (!open) return null;

  const sorted = [...patients].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "es"),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-names-dialog-title"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2
              id="patient-names-dialog-title"
              className="text-sm font-semibold text-slate-900"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {sorted.length} paciente{sorted.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {sorted.length === 0 ? (
            <p className="px-2 py-4 text-sm text-slate-500">
              No hay pacientes en esta categoría.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sorted.map((p) => (
                <li key={p.id} className="px-2 py-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/historias?patientId=${encodeURIComponent(p.id)}`}
                      className="text-sm font-medium text-amber-800 underline hover:text-amber-900"
                      onClick={onClose}
                    >
                      {p.fullName}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {formatPatientDocument({
                        documentType: p.documentType ?? "dni",
                        dni: p.dni,
                      } as { documentType: string; dni: string })}
                    </span>
                  </div>
                  {p.registeredAt && (
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Registrado:{" "}
                      {new Date(p.registeredAt).toLocaleDateString("es-PE", {
                        dateStyle: "medium",
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
