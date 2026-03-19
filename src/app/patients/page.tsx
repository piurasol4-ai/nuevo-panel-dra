"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Patient } from "@prisma/client";
import DatePicker from "react-datepicker";
import { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale/es";

import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

type PatientExtras = Patient & {
  referralSource?: string | null;
  status?: string | null;
  notes?: string | null;
  medicalHistory?: string | null;
  allergyNotes?: string | null;
};

function asPatientExtras(p: Patient): PatientExtras {
  return p as unknown as PatientExtras;
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fullName, setFullName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [status, setStatus] = useState("Estable");
  const [consultationReason, setConsultationReason] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [allergies, setAllergies] = useState("");
  const [lookingUpDni, setLookingUpDni] = useState(false);
  const [dniError, setDniError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{
    dni?: string;
    fullName?: string;
    birthDate?: string;
    phone?: string;
    emergencyPhone?: string;
  }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchDni, setSearchDni] = useState("");

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then(setPatients)
      .catch(console.error);
  }, []);

  function calcularEdad(fechaISO: string) {
    const fechaNac = new Date(fechaISO);
    if (Number.isNaN(fechaNac.getTime())) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const m = hoy.getMonth() - fechaNac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }
    return edad;
  }

  function calcularEdadDetallada(fecha: Date) {
    if (Number.isNaN(fecha.getTime())) return "";
    const hoy = new Date();

    let años = hoy.getFullYear() - fecha.getFullYear();
    let meses = hoy.getMonth() - fecha.getMonth();
    let dias = hoy.getDate() - fecha.getDate();

    if (dias < 0) {
      // Restamos un mes y sumamos los días del mes anterior
      meses -= 1;
      const previoMes = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      dias += previoMes.getDate();
    }

    if (meses < 0) {
      meses += 12;
      años -= 1;
    }

    if (años < 0) return "";

    return `${años} años, ${meses} meses y ${dias} días`;
  }

  async function handleBuscarDni() {
    if (!dni || dni.length !== 8) {
      setDniError("Ingresa un DNI de 8 dígitos.");
      return;
    }

    setDniError(null);
    setLookingUpDni(true);
    try {
      const res = await fetch(`/api/dni?dni=${dni}`);
      const raw = await res.json();

      // Algunas respuestas vienen envueltas en { data: {...} }
      const data = raw?.data ?? raw;

      if (!res.ok) {
        setDniError(data?.error || "Error de búsqueda.");
        return;
      }

      // Decolecta devuelve por ejemplo:
      // { "first_name": "...", "first_last_name": "...", "second_last_name": "...", "full_name": "..." }
      const nombreCompleto =
        (data?.first_last_name &&
          data?.second_last_name &&
          data?.first_name &&
          `${data.first_last_name} ${data.second_last_name} ${data.first_name}`) ||
        data?.full_name ||
        "";

      if (nombreCompleto) {
        setFullName(nombreCompleto);
      } else {
        console.log("Respuesta Decolecta sin nombres reconocidos:", raw);
        setDniError("DNI encontrado pero sin nombres disponibles.");
      }
    } catch (error) {
      console.error(error);
      setDniError("Error de conexión al consultar el DNI.");
    } finally {
      setLookingUpDni(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const newErrors: typeof formErrors = {};

    if (!dni || dni.length !== 8) {
      newErrors.dni = "El DNI debe tener 8 dígitos.";
    }
    if (!fullName.trim()) {
      newErrors.fullName = "El nombre es obligatorio.";
    }
    if (!birthDate) {
      newErrors.birthDate = "La fecha de nacimiento es obligatoria.";
    }
    if (!phone.trim()) {
      newErrors.phone = "El celular es obligatorio.";
    } else if (phone.length !== 9) {
      newErrors.phone = "El celular debe tener 9 dígitos.";
    }

    if (emergencyPhone && emergencyPhone.length !== 9) {
      newErrors.emergencyPhone = "El teléfono de emergencia debe tener 9 dígitos.";
    }

    setFormErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const isoBirthDate = birthDate!.toISOString().slice(0, 10);

    const isEditing = Boolean(editingId);

    const res = await fetch("/api/patients", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId ?? undefined,
        fullName,
        dni,
        phone,
        address,
        referralSource: referralSource || null,
        emergencyContactName: emergencyContact,
        emergencyContactPhone: emergencyPhone,
        status,
        notes: consultationReason || null,
        medicalHistory: medicalHistory || null,
        allergyNotes: allergies || null,
        birthDate: isoBirthDate,
      }),
    });

    const payload = await res.json();

    if (!res.ok) {
      if (res.status === 409 && payload?.error) {
        setFormErrors((prev) => ({ ...prev, dni: payload.error }));
      } else {
        setFormErrors((prev) => ({
          ...prev,
          dni: payload?.error || "No se pudo guardar el paciente.",
        }));
      }
      return;
    }

    setPatients((prev) =>
      isEditing
        ? prev.map((p) => (p.id === payload.id ? payload : p))
        : [payload, ...prev],
    );
    setFullName("");
    setDni("");
    setPhone("");
    setAddress("");
    setEmergencyContact("");
    setEmergencyPhone("");
    setBirthDate(null);
    setReferralSource("");
    setStatus("Estable");
    setConsultationReason("");
    setMedicalHistory("");
    setAllergies("");
    setFormErrors({});
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/patients?id=${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("No se pudo eliminar el paciente.");
      return;
    }

    setPatients((prev) => prev.filter((p) => p.id !== id));
  }

  function handleEdit(patient: Patient) {
    const extra = asPatientExtras(patient);
    setEditingId(patient.id);
    setFullName(patient.fullName);
    setDni(patient.dni);
    setPhone(patient.phone);
    setAddress(patient.address ?? "");
    setEmergencyContact(patient.emergencyContactName ?? "");
    setEmergencyPhone(patient.emergencyContactPhone ?? "");
    setReferralSource(extra.referralSource ?? "");
    setStatus(extra.status || "Estable");
    setConsultationReason(extra.notes ?? "");
    setMedicalHistory(extra.medicalHistory ?? "");
    setAllergies(extra.allergyNotes ?? "");
    setBirthDate(new Date(patient.birthDate as unknown as string));
    setFormErrors({});
    setDniError(null);
  }

  const filteredPatients = patients.filter((p) => {
    const matchesName = searchName
      ? p.fullName.toLowerCase().includes(searchName.toLowerCase())
      : true;
    const matchesDni = searchDni ? p.dni.includes(searchDni) : true;
    return matchesName && matchesDni;
  });

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        {editingId ? "Editar paciente" : "Paciente nuevo"}
      </h1>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-4 lg:grid-cols-2 lg:items-start"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">DNI</span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Número de documento"
              value={dni}
              onChange={(e) => {
                const soloDigitos = e.target.value.replace(/\D/g, "").slice(0, 8);
                setDni(soloDigitos);
              }}
              inputMode="numeric"
              maxLength={8}
            />
            <button
              type="button"
              onClick={handleBuscarDni}
              disabled={lookingUpDni}
              className="whitespace-nowrap rounded bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {lookingUpDni ? "Buscando..." : "Buscar DNI"}
            </button>
          </div>
          {(dniError || formErrors.dni) && (
            <p className="text-xs text-red-600">{dniError || formErrors.dni}</p>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              Nombre
            </span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          {formErrors.fullName && (
            <p className="text-xs text-red-600">{formErrors.fullName}</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 whitespace-nowrap">
                Fecha de Nacimiento
              </span>
              <DatePicker
                selected={birthDate}
                onChange={(date: Date | null) => setBirthDate(date)}
                dateFormat="dd/MM/yyyy"
                locale="es"
                placeholderText="dd/mm/aaaa"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black"
                maxDate={new Date()}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>
            {formErrors.birthDate && (
              <p className="text-xs text-red-600">{formErrors.birthDate}</p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 whitespace-nowrap">
                Edad
              </span>
              <input
                className="w-56 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                placeholder="años, meses y días"
                value={birthDate ? calcularEdadDetallada(birthDate) : ""}
                readOnly
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              Celular
            </span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Número de celular"
              value={phone}
              onChange={(e) => {
                const soloDigitos = e.target.value.replace(/\D/g, "").slice(0, 9);
                setPhone(soloDigitos);
              }}
              inputMode="numeric"
              maxLength={9}
            />
          </div>
          {formErrors.phone && (
            <p className="text-xs text-red-600">{formErrors.phone}</p>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              Estado
            </span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Estable">Estable</option>
              <option value="Seguimiento">Seguimiento</option>
              <option value="Continuador">Continuador</option>
              <option value="Estado Crítico">Estado Crítico</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              ¿Cómo nos conoció?
            </span>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
            >
              <option value="">Seleccionar origen…</option>
              <option value="Recomendación">Recomendación</option>
              <option value="Facebook">Facebook</option>
              <option value="YouTube">YouTube</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="X">X</option>
              <option value="Snapchat">Snapchat</option>
              <option value="Pinterest">Pinterest</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              Dirección
            </span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Dirección"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              Contacto Emergencia
            </span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Contacto"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              Teléfono de Emergencia
            </span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Número de teléfono de emergencia"
              value={emergencyPhone}
              onChange={(e) => {
                const soloDigitos = e.target.value.replace(/\D/g, "").slice(0, 9);
                setEmergencyPhone(soloDigitos);
              }}
              inputMode="numeric"
              maxLength={9}
            />
          </div>
          {formErrors.emergencyPhone && (
            <p className="text-xs text-red-600">{formErrors.emergencyPhone}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black"
              type="submit"
            >
              {editingId ? "Actualizar paciente" : "Guardar paciente"}
            </button>
            {editingId && (
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-2 text-xs text-slate-700"
                onClick={() => {
                  setEditingId(null);
                  setFullName("");
                  setDni("");
                  setPhone("");
                  setAddress("");
                  setEmergencyContact("");
                  setEmergencyPhone("");
                  setBirthDate(null);
                  setReferralSource("");
                  setStatus("Estable");
                  setConsultationReason("");
                  setMedicalHistory("");
                  setAllergies("");
                  setFormErrors({});
                  setDniError(null);
                }}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              Motivos de Consulta
            </span>
            <textarea
              className="min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Descripción breve del motivo de consulta"
              value={consultationReason}
              onChange={(e) => setConsultationReason(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              Antecedentes Médicos
            </span>
            <textarea
              className="min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Antecedentes relevantes del paciente"
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              Alergias
            </span>
            <textarea
              className="min-h-[110px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="Alergias conocidas del paciente"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
            />
          </div>
        </div>
      </form>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Lista de pacientes
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
        {patients.length === 0 ? (
          <p className="text-slate-500">Aún no hay pacientes registrados.</p>
        ) : (
          <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="border-b border-slate-200 px-2 py-1">Nombre</th>
                  <th className="border-b border-slate-200 px-2 py-1">DNI</th>
                  <th className="border-b border-slate-200 px-2 py-1">Teléfono</th>
                  <th className="border-b border-slate-200 px-2 py-1">Edad</th>
                  <th className="border-b border-slate-200 px-2 py-1 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.slice(0, 15).map((p) => {
                  const edad = calcularEdad(p.birthDate as unknown as string);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-900">
                        {p.fullName}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-xs text-slate-700">
                        {p.dni}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-xs text-slate-700">
                        {p.phone}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-xs text-slate-700">
                        {edad !== null ? `${edad} años` : "—"}
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/agenda?patientId=${encodeURIComponent(
                                p.id,
                              )}`,
                            )
                          }
                          className="mr-2 rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 hover:bg-sky-100"
                        >
                          Nueva Cita
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(p)}
                          className="mr-2 rounded border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-red-700"
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}