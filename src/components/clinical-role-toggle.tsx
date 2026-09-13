"use client";

import type { ClinicalEditorRole } from "@/lib/clinical-roles";

type Props = {
  role: ClinicalEditorRole;
  onChange: (role: ClinicalEditorRole) => void;
};

export default function ClinicalRoleToggle({ role, onChange }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-700">
        ¿Quién está escribiendo en este dispositivo?
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Misma ficha del paciente. Cada rol edita su sección para no borrarse entre
        sí si ambos tienen la ventana abierta.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("enfermeria")}
          className={
            "rounded-full px-3 py-1.5 text-xs font-semibold " +
            (role === "enfermeria"
              ? "bg-teal-600 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100")
          }
        >
          Enfermería
        </button>
        <button
          type="button"
          onClick={() => onChange("doctora")}
          className={
            "rounded-full px-3 py-1.5 text-xs font-semibold " +
            (role === "doctora"
              ? "bg-amber-500 text-black"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100")
          }
        >
          Doctora
        </button>
      </div>
    </div>
  );
}
