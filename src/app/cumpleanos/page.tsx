"use client";

import { useEffect, useMemo, useState } from "react";
import { Patient } from "@prisma/client";

import { formatPatientDocument } from "@/lib/patient-document";

export default function CumpleanosPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [messageByPatient, setMessageByPatient] = useState<
    Record<string, string>
  >({});
  const [searchName, setSearchName] = useState("");
  const [searchDni, setSearchDni] = useState("");

  useEffect(() => {
    fetch("/api/birthdays")
      .then((r) => r.json())
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesName = searchName
        ? p.fullName.toLowerCase().includes(searchName.toLowerCase())
        : true;
      const matchesDni = searchDni
        ? formatPatientDocument(p).toLowerCase().includes(searchDni.toLowerCase()) ||
          p.dni.toLowerCase().includes(searchDni.toLowerCase())
        : true;
      return matchesName && matchesDni;
    });
  }, [patients, searchName, searchDni]);

  function handleSendWhatsapp(patient: Patient) {
    const rawNumber = patient.phone;
    const digitsOnly = (rawNumber || "").replace(/\D/g, "");

    if (!digitsOnly) {
      alert("No hay número de WhatsApp válido para este paciente.");
      return;
    }

    const defaultMessage = `Hamonia CenterH., ¡Feliz Cumpleaños! Sr(a) ${patient.fullName}. Le deseamos un maravilloso día.`;
    const custom = messageByPatient[patient.id] || "";

    const fullMessage = custom.trim() ? custom.trim() : defaultMessage;

    // Asumimos Perú (+51).
    const waNumber = digitsOnly.startsWith("51")
      ? digitsOnly
      : `51${digitsOnly}`;
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(
      fullMessage,
    )}`;
    window.open(url, "_blank");
  }

  return (
    <main className="space-y-4 p-4 text-sm sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Cumpleaños</h1>
        <p className="text-sm text-slate-600">
          Pacientes que cumplen años hoy y acceso rápido para enviar
          felicitaciones por WhatsApp.
        </p>
      </header>

      {patients.length === 0 ? (
        <p className="text-sm text-slate-500">
          No hay pacientes con cumpleaños hoy.
        </p>
      ) : (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Lista de cumpleaños de hoy
            </h2>
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600 whitespace-nowrap">
                  Buscar nombre
                </span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs sm:w-40"
                  placeholder="Nombre o apellido"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600 whitespace-nowrap">
                  Buscar documento
                </span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs sm:w-36"
                  placeholder="Número"
                  value={searchDni}
                  onChange={(e) => setSearchDni(e.target.value)}
                  maxLength={32}
                />
              </div>
            </div>
          </div>

          <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
            <table className="min-w-[760px] border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="border-b border-slate-200 px-2 py-1">Nombre</th>
                  <th className="border-b border-slate-200 px-2 py-1">
                    Documento
                  </th>
                  <th className="border-b border-slate-200 px-2 py-1">
                    Celular
                  </th>
                  <th className="w-64 border-b border-slate-200 px-2 py-1">
                    Mensaje
                  </th>
                  <th className="border-b border-slate-200 px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.slice(0, 15).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-2 py-1">
                      {p.fullName}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      {formatPatientDocument(p)}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      {p.phone}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      <input
                        className="min-w-[220px] w-full rounded border border-slate-300 px-2 py-1"
                        value={
                          messageByPatient[p.id] ??
                          `Hamonia CenterH., ¡Feliz Cumpleaños! Sr(a) ${p.fullName}. Le deseamos un maravilloso día.`
                        }
                        onChange={(e) =>
                          setMessageByPatient((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsapp(p)}
                        className="rounded bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600"
                      >
                        WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

