"use client";

import { useEffect, useState } from "react";
import { Patient } from "@prisma/client";

export default function MensajeriaPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [messageByPatient, setMessageByPatient] = useState<Record<string, string>>(
    {},
  );
  const [targetByPatient, setTargetByPatient] = useState<
    Record<string, "phone" | "emergency">
  >({});
  const [searchName, setSearchName] = useState("");
  const [searchDni, setSearchDni] = useState("");

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then(setPatients)
      .catch(console.error);
  }, []);

  const filteredPatients = patients.filter((p) => {
    const matchesName = searchName
      ? p.fullName.toLowerCase().includes(searchName.toLowerCase())
      : true;
    const matchesDni = searchDni ? p.dni.includes(searchDni) : true;
    return matchesName && matchesDni;
  });

  function handleSendWhatsapp(patient: Patient) {
    const custom = messageByPatient[patient.id] || "";
    const target = targetByPatient[patient.id] || "phone";

    const rawNumber =
      target === "emergency"
        ? (patient.emergencyContactPhone as string | null)
        : patient.phone;

    const digitsOnly = (rawNumber || "").replace(/\D/g, "");

    if (!digitsOnly) {
      alert("No hay número de WhatsApp válido para este paciente.");
      return;
    }

    if (!custom.trim()) {
      alert("Escribe un mensaje antes de enviar.");
      return;
    }

    const fullMessage = `Consultorio Dra Leidy Rosales, Buen día: Sr(a) ${patient.fullName} le hacemos saber que: ${custom}`;

    // Asumimos Perú (+51). Ajusta el prefijo si lo necesitas.
    const waNumber = digitsOnly.startsWith("51") ? digitsOnly : `51${digitsOnly}`;
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(fullMessage)}`;
    window.open(url, "_blank");
  }

  return (
    <main className="space-y-4 p-6 text-sm">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Mensajería</h1>
        <p className="text-sm text-slate-600">
          Hoja de contactos para enviar mensajes rápidos por WhatsApp a pacientes o
          contactos de emergencia.
        </p>
      </header>

      {patients.length === 0 ? (
        <p className="text-sm text-slate-500">
          No hay pacientes registrados todavía. Registra pacientes en la sección
          &quot;Pacientes&quot; para poder enviar mensajes.
        </p>
      ) : (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Hoja de contactos
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
                  Buscar DNI
                </span>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs sm:w-32"
                  placeholder="DNI"
                  value={searchDni}
                  onChange={(e) => {
                    const soloDigitos = e.target.value.replace(/\D/g, "").slice(0, 8);
                    setSearchDni(soloDigitos);
                  }}
                  inputMode="numeric"
                  maxLength={8}
                />
              </div>
            </div>
          </div>
          <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="border-b border-slate-200 px-2 py-1">Nombre</th>
                  <th className="border-b border-slate-200 px-2 py-1">DNI</th>
                  <th className="border-b border-slate-200 px-2 py-1">Celular</th>
                  <th className="border-b border-slate-200 px-2 py-1">
                    Tel. Emergencia
                  </th>
                  <th className="w-64 border-b border-slate-200 px-2 py-1">
                    Mensaje
                  </th>
                  <th className="border-b border-slate-200 px-2 py-1">
                    Enviar a
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
                      {p.dni}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      {p.phone}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      {p.emergencyContactPhone || "—"}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      <input
                        className="w-full rounded border border-slate-300 px-2 py-1"
                        placeholder="Escribe el mensaje…"
                        value={messageByPatient[p.id] || ""}
                        onChange={(e) =>
                          setMessageByPatient((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1">
                      <select
                        className="rounded border border-slate-300 px-2 py-1"
                        value={targetByPatient[p.id] || "phone"}
                        onChange={(e) =>
                          setTargetByPatient((prev) => ({
                            ...prev,
                            [p.id]: e.target.value as "phone" | "emergency",
                          }))
                        }
                      >
                        <option value="phone">Celular</option>
                        <option value="emergency">Contacto emergencia</option>
                      </select>
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

