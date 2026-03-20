"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Appointment, Patient } from "@prisma/client";
import DatePicker from "react-datepicker";
import { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale/es";
import { useSearchParams } from "next/navigation";

import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

type AppointmentWithPatient = Appointment & { patient: Patient };

type ClinicalHistorySnapshot = {
  id: string;
  visitDate: string | null;
  createdAt: string;
  consultationReason: string | null;
  currentIllness: string | null;
  physicalExam: string | null;
  diagnostics: string | null;
  diagnosis: string | null;
  treatmentPlan: string | null;
  evolutionNotes: string | null;
  nursingNotes: string | null;
  treatmentNotes: string | null;
  weight: string | null;
  height: string | null;
  bodyTemperature: string | null;
  bloodPressure: string | null;
  oxygenSaturation: string | null;
  heartRate: string | null;
  respiratoryRate: string | null;
  glucose: string | null;
};

function safeJsonParse<T>(text: string, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function mergeRecipeIntoTreatmentNotes(
  currentNotes: string | null | undefined,
  recipeText: string,
) {
  const recipe = recipeText.trim();
  if (!recipe) return currentNotes ?? null;

  const normalizedCurrent = (currentNotes ?? "").trim();
  const block = `Receta:\n${recipe}`;
  if (!normalizedCurrent) return block;
  if (normalizedCurrent.includes(block)) return normalizedCurrent;
  return `${normalizedCurrent}\n\n${block}`;
}

function AgendaPageInner() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [procedure, setProcedure] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [appointmentFormDate, setAppointmentFormDate] = useState<Date>(
    new Date(),
  );
  const [nowTickMs, setNowTickMs] = useState(() => Date.now());
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [procedures, setProcedures] = useState<{ name: string; price: string }[]>(
    [],
  );
  const [proceduresSource, setProceduresSource] = useState<
    "lista-precios" | "respaldo"
  >("lista-precios");

  const searchParams = useSearchParams();
  const patientIdFromQuery = searchParams.get("patientId");

  // Mantiene actualizada la hora para validar citas “desde el futuro”.
  useEffect(() => {
    const i = window.setInterval(() => setNowTickMs(Date.now()), 10_000);
    return () => window.clearInterval(i);
  }, []);

  const DEFAULT_PROCEDURES: { name: string; price: string }[] = [
    // Dejamos CONSULTA MEDICA como primera opción para agilizar la inscripción
    { name: "CONSULTA MEDICA", price: "S/ 150.00" },
    { name: "AUTOHEMOC MAYOR", price: "S/ 150.00" },
    { name: "HIDROCOLON POR SESION", price: "S/ 200.00" },
    { name: "SUERO OZONIZADO", price: "S/ 100.00" },
    { name: "AUTOHEMOC MENOR", price: "S/ 80.00" },
    { name: "TERAPIA NEURAL", price: "S/ 100.00" },
    { name: "ACUPUNTURA", price: "S/ 70.00" },
    { name: "OZONO RECTAL", price: "S/ 50.00" },
    { name: "OZONO VAGINAL", price: "S/ 80.00" },
    { name: "OZONO URETRAL", price: "S/ 80.00" },
    { name: "AUTO HEMOTERAPIA MAYOR", price: "S/ 200.00" },
    { name: "AUTO HEMOTERAPIA MENOR", price: "S/ 80.00" },
    { name: "OZONO PARAVERTEBRAL", price: "S/ 100.00" },
    { name: "OZONO INTRAARTICULAR 1 APLICACION", price: "S/ 100.00" },
    { name: "OZONO INTRAARTICULAR 2 APLICACIONES", price: "S/ 120.00" },
    { name: "OZONO INTRAARTICULAR 3 APLICACIONES", price: "S/ 150.00" },
    { name: "OZONO INTRAMUSCULAR", price: "S/ 80.00" },
    { name: "PLASMA RICO EN PLAQUETAS (1 ARTICULACIÓN) 4 TUBOS", price: "S/ 250.00" },
    { name: "PLASMA RICO EN PLAQUETAS (1 ARTICULACIÓN) 3 TUBOS", price: "S/ 200.00" },
    { name: "PLASMA RICO EN PLAQUETAS (2 ARTICULACIONES) 4 TUBOS", price: "S/ 300.00" },
    { name: "PLASMA RICO EN PLAQUETAS (2 ARTICULACIONES) 3 TUBOS", price: "S/ 250.00" },
    { name: "DISCOLISIS", price: "S/ 8,000.00" },
    { name: "HIDROTERAPIA DE COLON", price: "S/ 300.00" },
  ];

  function toLocalISODate(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function roundUpToNextMinute(d: Date) {
    const ms = d.getTime();
    const roundedMs = Math.ceil(ms / 60000) * 60000; // siguiente minuto completo
    return new Date(roundedMs);
  }

  function formatHHMM(d: Date) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  const todayISO = useMemo(
    () => toLocalISODate(new Date(nowTickMs)),
    [nowTickMs],
  );
  const earliestStart = useMemo(
    () => roundUpToNextMinute(new Date(nowTickMs)),
    [nowTickMs],
  );
  const earliestStartHHMM = useMemo(
    () => formatHHMM(earliestStart),
    [earliestStart],
  );
  const isAppointmentDateToday = useMemo(
    () => toLocalISODate(appointmentFormDate) === todayISO,
    [appointmentFormDate, todayISO],
  );

  function parseSolesToNumber(value: string) {
    const cleaned = value
      .replace(/S\/\s*/gi, "")
      .replace(/\s/g, "")
      .replace(/,/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function formatSoles(n: number) {
    return `S/ ${n.toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  type TicketProductLine = {
    lineId: string;
    productId: number;
    name: string;
    unitPriceSoles: number;
    quantity: number;
  };

  type TicketStored = {
    id: string;
    ticketNumber: number;
    createdAt: string;
    dateISO: string;
    appointmentId: string;
    patientId: string;
    patientName: string;
    patientDni: string;
    procedureName: string;
    procedureUnitPriceSoles: number;
    paymentEfectivoSoles: number;
    paymentYapeSoles: number;
    paymentPlinSoles: number;
    paymentTransferenciaSoles: number;
    paymentTotalSoles: number;
    items: Array<{
      productId: number;
      name: string;
      unitPriceSoles: number;
      quantity: number;
      lineTotalSoles: number;
    }>;
    totalSoles: number;
  };

  const selectedDateISO = useMemo(
    () => selectedDate.toISOString().slice(0, 10),
    [selectedDate],
  );

  const appointmentFormDateISO = useMemo(
    () => {
      const y = appointmentFormDate.getFullYear();
      const m = String(appointmentFormDate.getMonth() + 1).padStart(2, "0");
      const d = String(appointmentFormDate.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    },
    [appointmentFormDate],
  );

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then(setPatients)
      .catch(console.error);
  }, []);

  // Mientras el formulario esté abierto en "hoy", aseguramos que la hora mínima
  // sea a partir del siguiente minuto (ej. 13:41 -> 13:42).
  useEffect(() => {
    if (!showForm) return;
    if (!isAppointmentDateToday) return;

    const [h, m] = startTime.split(":").map((n) => Number(n));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return;

    const candidate = new Date(
      appointmentFormDate.getFullYear(),
      appointmentFormDate.getMonth(),
      appointmentFormDate.getDate(),
      h,
      m,
      0,
      0,
    );

    if (candidate.getTime() < earliestStart.getTime()) {
      setStartTime(earliestStartHHMM);

      const endCandidate = new Date(earliestStart.getTime() + 30 * 60_000);
      if (toLocalISODate(endCandidate) === todayISO) {
        setEndTime(formatHHMM(endCandidate));
      }
    }
  }, [
    showForm,
    isAppointmentDateToday,
    startTime,
    appointmentFormDate,
    earliestStart,
    earliestStartHHMM,
    todayISO,
  ]);

  // Si vienes desde `Pacientes` con `?patientId=...`, abrimos el formulario y preseleccionamos.
  useEffect(() => {
    if (!patientIdFromQuery) return;

    const now = new Date();
    setEditingId(null);
    setPatientId(patientIdFromQuery);
    setProcedure("");
    setShowForm(true);
    // También alineamos el calendario al "día de hoy".
    setSelectedDate(now);
    setAppointmentFormDate(now);
    setStartTime("09:00");
    setEndTime("09:30");
    setReason("");
    setFormError(null);
    loadProceduresFromStorage();
  }, [patientIdFromQuery]);

  async function loadProceduresFromStorage() {
    try {
      const res = await fetch("/api/procedures");
      const json = (await res.json()) as unknown;
      let fromLista = Array.isArray(json) ? (json as Array<{ name: string; price: string }>) : [];

      // Aseguramos que "CONSULTA MEDICA" aparezca primero si existe
      const idxConsulta = fromLista.findIndex(
        (p) => p.name.toLowerCase() === "consulta medica",
      );
      if (idxConsulta > 0) {
        const [consulta] = fromLista.splice(idxConsulta, 1);
        fromLista = [consulta, ...fromLista];
      }

      if (fromLista.length > 0) {
        setProcedures(fromLista);
        setProceduresSource("lista-precios");
      } else {
        setProcedures(DEFAULT_PROCEDURES);
        setProceduresSource("respaldo");
      }
    } catch {
      setProcedures(DEFAULT_PROCEDURES);
      setProceduresSource("respaldo");
    }
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildRecipePrintHtml(params: {
    recipe: Recipe;
    patient: Patient;
    appt: AppointmentWithPatient;
    logoUrl: string;
    fechaCreacion: string;
    fechaImpresion: string;
    edadTexto: string;
  }) {
    const { recipe, patient, appt, logoUrl, fechaCreacion, fechaImpresion, edadTexto } =
      params;

    const nombre = escapeHtml(patient.fullName);
    const dni = escapeHtml(patient.dni);
    const telefono = escapeHtml(patient.phone);
    const motivoInicial = escapeHtml(patient.notes ?? "");
    const alergias = escapeHtml(patient.allergyNotes ?? "");

    const diagnostico = escapeHtml(recipe.diagnosis ?? "");
    const plan = escapeHtml(recipe.workPlan ?? "");
    const receta = escapeHtml(recipe.prescriptionText ?? "");

    return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Receta</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111827; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
      .clinic-info { display: flex; align-items: center; gap: 10px; }
      .clinic-name { font-weight: 700; font-size: 18px; }
      .clinic-subtitle { font-size: 12px; color: #fbbf24; margin-top: 2px; }
      .meta { font-size: 12px; color: #4b5563; }
      .label { font-weight: 600; }
      .section-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; margin-top: 8px; }
      .block { font-size: 13px; white-space: pre-wrap; }
      .logo { height: 52px; }
      .footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; gap: 18px; }
      .line { height: 1px; background: #9ca3af; margin-top: 34px; }
      .sign-label { margin-top: 6px; font-size: 12px; color: #4b5563; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 16px; margin-top: 18px; margin-bottom: 4px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="clinic-info">
        <img src="${logoUrl}" alt="Logo Harmonia Center" class="logo" />
        <div>
          <div class="clinic-name">Harmonia Center</div>
          <div class="clinic-subtitle">Medicina Alternativa Complementaria</div>
          <div class="meta">Receta N.º ${recipe.recipeNumber}</div>
        </div>
      </div>
      <div class="meta">
        <div><span class="label">Fecha y hora de creación:</span> ${fechaCreacion}</div>
        <div><span class="label">Fecha y hora de impresión:</span> ${fechaImpresion}</div>
      </div>
    </div>

    <h1>Datos del paciente</h1>
    <div class="section-box">
      <div><span class="label">Nombre:</span> ${nombre}</div>
      <div><span class="label">DNI:</span> ${dni}</div>
      <div><span class="label">Teléfono:</span> ${telefono}</div>
      <div><span class="label">Edad:</span> ${escapeHtml(edadTexto)}</div>
      ${
        motivoInicial
          ? `<div><span class="label">Motivo Inicial de Consulta:</span> ${motivoInicial}</div>`
          : ""
      }
      ${
        alergias
          ? `<div><span class="label">Alergias (inscripción):</span> ${alergias}</div>`
          : ""
      }
      <div><span class="label">Procedimiento:</span> ${escapeHtml(appt.type ?? "")}</div>
    </div>

    <h2>Diagnóstico</h2>
    <div class="section-box block">${diagnostico}</div>

    <h2>Plan de trabajo</h2>
    <div class="section-box block">${plan}</div>

    <h2>Receta</h2>
    <div class="section-box block">${receta}</div>

    <div class="footer">
      <div class="sign">
        <div class="line"></div>
        <div class="sign-label">Dra. Leidy Rosales Jiménez</div>
      </div>
      <div class="sign">
        <div class="line"></div>
        <div class="sign-label">Firma del paciente</div>
      </div>
    </div>
  </body>
</html>`;
  }

  function handlePrintRecipe(recipe: Recipe, appt: AppointmentWithPatient) {
    if (typeof window === "undefined") return;

    const patient = appt.patient;
    const win = window.open("", "_blank");
    if (!win) return;
    try {
      win.opener = null;
    } catch {
      // ignore
    }

    const fechaCreacion = new Date(recipe.createdAt).toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const fechaImpresion = new Date().toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const edadTexto = calcularEdadDetallada(
      patient.birthDate as unknown as string,
    );

    const logoUrl = new URL("/logo-harmonia.png", window.location.origin).href;

    const html = buildRecipePrintHtml({
      recipe,
      patient,
      appt,
      logoUrl,
      fechaCreacion,
      fechaImpresion,
      edadTexto,
    });

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 300);
  }

  function handleSendRecipeWhatsapp(
    recipe: Recipe,
    appt: AppointmentWithPatient,
  ) {
    if (typeof window === "undefined") return;

    const patient = appt.patient;
    const phoneDigits = String(patient.phone ?? "").replace(/\D/g, "");
    if (!phoneDigits) {
      setAttentionError("El paciente no tiene un número de WhatsApp/telefono.");
      return;
    }

    const waNumber = phoneDigits.startsWith("51")
      ? phoneDigits
      : `51${phoneDigits}`;

    const receta = recipe.prescriptionText ?? "";

    const texto = receta ? `Receta: ${receta}` : "";

    const fullMessage = `Hamonia CenterH., Buen día: Sr(a) ${patient.fullName} le hacemos saber que: ${texto}`;

    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(
      fullMessage,
    )}`;
    window.open(url, "_blank");
  }

  function handleSendAppointmentReminderWhatsapp(
    appt: AppointmentWithPatient,
  ) {
    if (typeof window === "undefined") return;

    const patient = appt.patient;
    const phoneDigits = String(patient.phone ?? "").replace(/\D/g, "");
    if (!phoneDigits) {
      alert("El paciente no tiene un número de WhatsApp/telefono.");
      return;
    }

    const waNumber = phoneDigits.startsWith("51")
      ? phoneDigits
      : `51${phoneDigits}`;

    const time = appt.startAt
      ? new Date(appt.startAt).toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    const dateText = appt.startAt
      ? new Date(appt.startAt).toLocaleDateString("es-PE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";

    const procedure = appt.type ? String(appt.type) : "Consulta médica";

    const texto = `le recordamos su cita médica para el ${dateText} a las ${time} (${procedure}).`;
    const fullMessage = `Hamonia CenterH., Buen día: Sr(a) ${patient.fullName} le hacemos saber que: ${texto}`;

    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(
      fullMessage,
    )}`;
    window.open(url, "_blank");
  }

  useEffect(() => {
    fetch(`/api/appointments?date=${selectedDateISO}`)
      .then((r) => r.json())
      .then(setAppointments)
      .catch(console.error);
  }, [selectedDateISO]);

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();

    if (!patientId) {
      setFormError("Selecciona un paciente.");
      return;
    }
    if (!procedure) {
      setFormError("Selecciona un procedimiento de la lista de precios.");
      return;
    }

    // Construimos la fecha/hora usando componentes locales para evitar desfases
    // (toISOString()/UTC puede mover la hora o incluso el día según la zona horaria).
    const [startH, startM] = startTime.split(":").map((n) => Number(n));
    const [endH, endM] = endTime.split(":").map((n) => Number(n));
    if (
      Number.isNaN(startH) ||
      Number.isNaN(startM) ||
      Number.isNaN(endH) ||
      Number.isNaN(endM)
    ) {
      setFormError("Hora inválida.");
      return;
    }
    const d = appointmentFormDate;
    const appointmentDateISO = toLocalISODate(d);
    const currentDateISO = toLocalISODate(new Date());

    if (appointmentDateISO < currentDateISO) {
      setFormError("No se pueden crear citas en el pasado.");
      return;
    }

    const startAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startH, startM, 0, 0);
    const endAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), endH, endM, 0, 0);

    if (appointmentDateISO === currentDateISO) {
      const earliestStartAt = roundUpToNextMinute(new Date());
      if (startAt.getTime() < earliestStartAt.getTime()) {
        setFormError(
          `La hora mínima para hoy es ${formatHHMM(earliestStartAt)} (desde el siguiente minuto).`,
        );
        return;
      }
    }

    if (endAt <= startAt) {
      setFormError("La hora de fin debe ser mayor que la de inicio.");
      return;
    }

    setFormError(null);

    const isEditing = Boolean(editingId);
    const res = await fetch("/api/appointments", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId ?? undefined,
        patientId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        type: procedure,
        status: "pendiente",
        reason: reason || null,
      }),
    });

    const rawText = await res.text();
    const created = (() => {
      if (!rawText) return null;
      try {
        return JSON.parse(rawText);
      } catch {
        return { error: rawText };
      }
    })();

    if (!res.ok) {
      const msg =
        created && typeof created === "object" && "error" in created
          ? String((created as { error?: unknown }).error ?? "")
          : "";
      setFormError(msg || "No se pudo crear la cita. Revisa la consola del servidor.");
      return;
    }

    if (created) {
      // Si cambiamos la fecha, recargamos el día para evitar inconsistencias.
      const sameLocalDay =
        appointmentFormDate.getFullYear() === selectedDate.getFullYear() &&
        appointmentFormDate.getMonth() === selectedDate.getMonth() &&
        appointmentFormDate.getDate() === selectedDate.getDate();

      if (!sameLocalDay) {
        setSelectedDate(appointmentFormDate);
      } else {
        setAppointments((prev) =>
          isEditing
            ? prev.map((a) => (a.id === created.id ? created : a))
            : [...prev, created].sort((a, b) =>
                a.startAt < b.startAt ? -1 : 1,
              ),
        );
      }
    }
    setEditingId(null);
    setShowForm(false);
    setPatientId("");
    setProcedure("");
    setStartTime("09:00");
    setEndTime("09:30");
    setReason("");
  }

  async function handleDeleteAppointment(id: string) {
    if (!window.confirm("¿Deseas eliminar esta cita?")) return;
    try {
      const res = await fetch(`/api/appointments?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(
          (payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error ?? "")
            : "") || "No se pudo eliminar la cita.",
        );
        return;
      }
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      setFormError("No se pudo eliminar la cita.");
    }
  }

  type Recipe = {
    id: string;
    patientId: string;
    appointmentId: string | null;
    recipeNumber: number;
    createdAt: string;
    diagnosis: string | null;
    workPlan: string | null;
    prescriptionText: string | null;
  };

  const [showAttention, setShowAttention] = useState(false);
  const [attentionAppointmentId, setAttentionAppointmentId] = useState<string>(
    "",
  );
  const [attentionTab, setAttentionTab] = useState<
    "nueva" | "registradas"
  >("nueva");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [attentionDiagnosis, setAttentionDiagnosis] = useState("");
  const [attentionWorkPlan, setAttentionWorkPlan] = useState("");
  const [attentionPrescription, setAttentionPrescription] = useState("");
  const [attentionError, setAttentionError] = useState<string | null>(null);
  const [attentionClinicalSnapshot, setAttentionClinicalSnapshot] =
    useState<ClinicalHistorySnapshot | null>(null);
  const [attentionClinicalLoading, setAttentionClinicalLoading] = useState(false);

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketAppointment, setTicketAppointment] =
    useState<AppointmentWithPatient | null>(null);
  const [ticketDateISO, setTicketDateISO] = useState("");

  const [ticketProcedureName, setTicketProcedureName] = useState("");
  const [ticketProcedureUnitPriceSoles, setTicketProcedureUnitPriceSoles] =
    useState<number>(0);

  const [ticketPagoEfectivoSoles, setTicketPagoEfectivoSoles] =
    useState<number>(0);
  const [ticketPagoYapeSoles, setTicketPagoYapeSoles] = useState<number>(0);
  const [ticketPagoPlinSoles, setTicketPagoPlinSoles] = useState<number>(0);
  const [ticketPagoTransferenciaSoles, setTicketPagoTransferenciaSoles] =
    useState<number>(0);
  const [ticketPagosManual, setTicketPagosManual] = useState(false);

  const [productCatalog, setProductCatalog] = useState<
    Array<{ productId: number; name: string; unitPriceSoles: number }>
  >([]);
  const [ticketProductIdToAdd, setTicketProductIdToAdd] = useState<number | "">("");
  const [ticketProductQtyToAdd, setTicketProductQtyToAdd] = useState<string>("1");
  const [ticketExtraDetailToAdd, setTicketExtraDetailToAdd] = useState<string>(
    "",
  );
  const [ticketExtraUnitPriceToAdd, setTicketExtraUnitPriceToAdd] = useState<number>(
    0,
  );
  const [ticketExtraQtyToAdd, setTicketExtraQtyToAdd] = useState<number>(1);
  const [ticketItems, setTicketItems] = useState<TicketProductLine[]>([]);

  const [ticketSaving, setTicketSaving] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  function calcularEdadDetallada(fechaISO: string | Date) {
    const fecha =
      typeof fechaISO === "string" ? new Date(fechaISO) : (fechaISO as Date);
    if (Number.isNaN(fecha.getTime())) return "";
    const hoy = new Date();
    let años = hoy.getFullYear() - fecha.getFullYear();
    let meses = hoy.getMonth() - fecha.getMonth();
    let dias = hoy.getDate() - fecha.getDate();
    if (dias < 0) {
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

  async function openAttentionForAppointment(a: AppointmentWithPatient) {
    setAttentionError(null);
    setAttentionAppointmentId(a.id);
    setShowAttention(true);
    setAttentionTab("nueva");
    setAttentionClinicalSnapshot(null);
    setAttentionClinicalLoading(true);

    // Cargamos recetas de la cita y última historia clínica del paciente.
    const [recipesRes, historyRes] = await Promise.allSettled([
      fetch(`/api/recipes?appointmentId=${a.id}`),
      fetch(`/api/clinical-notes?patientId=${encodeURIComponent(a.patientId)}`),
    ]);

    if (recipesRes.status === "fulfilled") {
      try {
        const data = (await recipesRes.value.json()) as Recipe[];
        setRecipes(Array.isArray(data) ? data : []);
      } catch {
        setRecipes([]);
      }
    } else {
      setRecipes([]);
    }

    if (historyRes.status === "fulfilled") {
      try {
        const raw = (await historyRes.value.json()) as unknown;
        const visits = Array.isArray(raw) ? (raw as ClinicalHistorySnapshot[]) : [];
        setAttentionClinicalSnapshot(visits[0] ?? null);
      } catch {
        setAttentionClinicalSnapshot(null);
      }
    } else {
      setAttentionClinicalSnapshot(null);
    }
    setAttentionClinicalLoading(false);

    setAttentionDiagnosis("");
    setAttentionWorkPlan("");
    setAttentionPrescription("");
  }

  async function openTicketForAppointment(a: AppointmentWithPatient) {
    setTicketError(null);
    setTicketSaving(false);

    const dateISO = toLocalISODate(new Date(a.startAt));
    setTicketAppointment(a);
    setTicketDateISO(dateISO);

    const procName = a.type || "CONSULTA MEDICA";
    setTicketProcedureName(procName);

    const proc = procedures.find(
      (p) => p.name.toLowerCase() === String(procName).toLowerCase(),
    );
    const unitPrice = proc ? parseSolesToNumber(proc.price) ?? 0 : 0;
    setTicketProcedureUnitPriceSoles(unitPrice);

    // Por defecto, colocamos el total del procedimiento en Efectivo.
    setTicketPagoEfectivoSoles(unitPrice);
    setTicketPagoYapeSoles(0);
    setTicketPagoPlinSoles(0);
    setTicketPagoTransferenciaSoles(0);
    setTicketPagosManual(false);

    // Cargar catálogo de productos (para poder agregarlos al ticket)
    let mappedProds: Array<{ productId: number; name: string; unitPriceSoles: number }> =
      [];
    try {
      const res = await fetch("/api/products");
      const json = (await res.json()) as unknown;
      type ProductApiLike = { id: unknown; name: unknown; price: unknown };
      const list = Array.isArray(json) ? (json as ProductApiLike[]) : [];
      mappedProds = list
        .map((p) => ({
          productId: Number(p.id),
          name: String(p.name ?? ""),
          unitPriceSoles: parseSolesToNumber(String(p.price ?? "")) ?? 0,
        }))
        .filter((x) => x.name && Number.isFinite(x.productId));
      setProductCatalog(mappedProds);
    } catch {
      setProductCatalog([]);
    }

    setTicketItems([]);
    setTicketProductIdToAdd("");
    setTicketProductQtyToAdd("1");

    // Si ya existe un ticket guardado para esta cita, lo cargamos en el modal.
    try {
      const res = await fetch(
        `/api/tickets?appointmentId=${encodeURIComponent(a.id)}`,
      );
      type TicketLineApiLike = {
        productId: unknown;
        name: unknown;
        unitPriceCents: unknown;
        quantity: unknown;
      };
      type TicketApiLike = {
        id: unknown;
        procedureName: unknown;
        procedureUnitPriceCents: unknown;
        paymentEfectivoCents: unknown;
        paymentYapeCents: unknown;
        paymentPlinCents: unknown;
        paymentTransferenciaCents: unknown;
        ticketLines?: TicketLineApiLike[];
      };

      const json = (await res.json()) as {
        tickets?: unknown[];
        ok?: boolean;
      };
      const saved = Array.isArray(json.tickets)
        ? (json.tickets[0] as TicketApiLike | undefined)
        : undefined;

      if (saved) {
        setTicketProcedureName(String(saved.procedureName ?? procName));
        setTicketProcedureUnitPriceSoles(
          Number(saved.procedureUnitPriceCents) / 100,
        );
        setTicketPagoEfectivoSoles(
          Number(saved.paymentEfectivoCents) / 100,
        );
        setTicketPagoYapeSoles(Number(saved.paymentYapeCents) / 100);
        setTicketPagoPlinSoles(Number(saved.paymentPlinCents) / 100);
        setTicketPagoTransferenciaSoles(
          Number(saved.paymentTransferenciaCents) / 100,
        );
        setTicketPagosManual(true);

        const lines = Array.isArray(saved.ticketLines)
          ? saved.ticketLines
          : [];
        setTicketItems(
          lines.map((l, idx) => ({
            lineId: `saved_${String(saved.id)}_${idx}`,
            productId: l.productId == null ? -1 * (idx + 1) : Number(l.productId),
            name: String(l.name ?? ""),
            unitPriceSoles: Number(l.unitPriceCents) / 100,
            quantity: Number(l.quantity),
          })),
        );
      }
    } catch {
      // Si falla la lectura, dejamos el modal en blanco.
    }

    setTicketExtraDetailToAdd("");
    setTicketExtraUnitPriceToAdd(0);
    setTicketExtraQtyToAdd(1);

    if (mappedProds.length === 0) {
      setTicketError(
        "No hay productos en la Lista de productos. Abre 'Lista de productos' y guarda para que aparezcan aquí.",
      );
    }

    setShowTicketModal(true);
  }

  function handleAddTicketProduct() {
    if (!productCatalog.length) return;
    if (ticketProductIdToAdd === "") return;

    const product = productCatalog.find((p) => p.productId === ticketProductIdToAdd);
    if (!product) return;

    const qty = Number.parseInt(ticketProductQtyToAdd, 10);
    if (!Number.isFinite(qty) || qty <= 0) return;

    const existing = ticketItems.find(
      (l) => l.productId === product.productId && l.name === product.name,
    );

    // Evitamos cambios de cálculos: un producto solo se agrega una vez.
    if (existing) {
      setTicketError(
        `Este producto ya está agregado: ${existing.name}.`,
      );
      setTicketSaving(false);
      return;
    }

    const lineId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `line_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    setTicketItems((prev) => [
      ...prev,
      {
        lineId,
        productId: product.productId,
        name: product.name,
        unitPriceSoles: product.unitPriceSoles,
        quantity: Math.floor(qty),
      },
    ]);
    setTicketProductQtyToAdd("1");
  }

  function handleAddExtraProductLine() {
    const detail = ticketExtraDetailToAdd.trim();
    if (!detail) return;

    const qty = Number(ticketExtraQtyToAdd);
    if (!Number.isFinite(qty) || qty <= 0) return;

    const unitPrice = Number(ticketExtraUnitPriceToAdd);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return;

    const lineId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `line_extra_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    // Usamos productId negativo para diferenciar líneas “extra” de los productos de catálogo.
    const extraProductId = -1 * Date.now();

    setTicketItems((prev) => [
      ...prev,
      {
        lineId,
        productId: extraProductId,
        name: detail,
        unitPriceSoles: unitPrice,
        quantity: Math.floor(qty),
      },
    ]);

    setTicketExtraDetailToAdd("");
    setTicketExtraUnitPriceToAdd(0);
    setTicketExtraQtyToAdd(1);
  }

  async function handleSaveTicket() {
    if (!ticketAppointment) return;

    setTicketSaving(true);
    setTicketError(null);

    const procedurePrice = Number(ticketProcedureUnitPriceSoles);
    if (!Number.isFinite(procedurePrice) || procedurePrice < 0) {
      setTicketError("El precio del procedimiento no es válido.");
      setTicketSaving(false);
      return;
    }

    const items = ticketItems
      .filter((x) => x.quantity > 0 && x.unitPriceSoles >= 0)
      .map((x) => ({
        productId: x.productId,
        name: x.name,
        unitPriceSoles: x.unitPriceSoles,
        quantity: x.quantity,
        lineTotalSoles: x.unitPriceSoles * x.quantity,
      }));

    if (items.length === 0 && procedurePrice === 0) {
      setTicketError("El Ticket/Boleta no tiene ningún monto para guardar.");
      setTicketSaving(false);
      return;
    }

    try {
      // Persistencia y decremento de stock se hacen en DB vía POST /api/tickets.

      const ticketProductsTotal = items.reduce(
        (acc, x) => acc + x.lineTotalSoles,
        0,
      );

      const totalSoles = procedurePrice + ticketProductsTotal;

      const pagosEfectivo = ticketPagoEfectivoSoles;
      const pagosYape = ticketPagoYapeSoles;
      const pagosPlin = ticketPagoPlinSoles;
      const pagosTransferencia = ticketPagoTransferenciaSoles;

      const pagosSum =
        pagosEfectivo + pagosYape + pagosPlin + pagosTransferencia;

      const pagosValid =
        [pagosEfectivo, pagosYape, pagosPlin, pagosTransferencia].every(
          (n) => Number.isFinite(n) && n >= 0,
        );

      if (!pagosValid) {
        setTicketError(
          "Revisa los montos de pago: deben ser valores numéricos y no negativos.",
        );
        setTicketSaving(false);
        return;
      }

      if (totalSoles > 0 && pagosSum <= 0) {
        setTicketError("Indica el pago para el Ticket/Boleta.");
        setTicketSaving(false);
        return;
      }

      // Regla: la suma de pagos debe igualar el total del ticket.
      const epsilon = 0.01;
      if (Math.abs(pagosSum - totalSoles) > epsilon) {
        setTicketError(
          `La suma de pagos (${formatSoles(pagosSum)}) debe ser igual al total (${formatSoles(
            totalSoles,
          )}).`,
        );
        setTicketSaving(false);
        return;
      }

      // Guardar en DB (stock y unicidad por appointmentId se validan en el backend)
      try {
        type TicketLineApiLike = {
          id?: unknown;
          productId: unknown;
          name: unknown;
          quantity: unknown;
          unitPriceCents: unknown;
          lineTotalCents: unknown;
        };
        type TicketApiLike = {
          id: unknown;
          ticketNumber: unknown;
          createdAt: unknown;
          dateISO: unknown;
          appointmentId: unknown;
          patientId: unknown;
          patientName: unknown;
          patientDni: unknown;
          procedureName: unknown;
          procedureUnitPriceCents: unknown;
          paymentEfectivoCents: unknown;
          paymentYapeCents: unknown;
          paymentPlinCents: unknown;
          paymentTransferenciaCents: unknown;
          paymentTotalCents: unknown;
          totalCents: unknown;
          ticketLines?: TicketLineApiLike[];
        };

        const payloadItems = items.map((x) => ({
          productId: x.productId > 0 ? x.productId : null,
          name: x.name,
          quantity: x.quantity,
          unitPriceSoles: x.unitPriceSoles,
        }));

        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appointmentId: ticketAppointment.id,
            procedureUnitPriceSoles: procedurePrice,
            paymentEfectivoSoles: pagosEfectivo,
            paymentYapeSoles: pagosYape,
            paymentPlinSoles: pagosPlin,
            paymentTransferenciaSoles: pagosTransferencia,
            items: payloadItems,
          }),
        });

        const json = (await res.json().catch(() => null)) as
          | { error?: string; ticket?: TicketApiLike }
          | null;

        if (!res.ok || !json?.ticket) {
          throw new Error(json?.error ?? "No se pudo guardar el Ticket/Boleta.");
        }

        const created = json.ticket;

        const ticketToPrint: TicketStored = {
          id: String(created.id),
          ticketNumber: Number(created.ticketNumber),
          createdAt: String(created.createdAt),
          dateISO: String(created.dateISO),
          appointmentId: String(created.appointmentId ?? ticketAppointment.id),
          patientId: String(created.patientId ?? ticketAppointment.patientId),
          patientName: String(created.patientName),
          patientDni: String(created.patientDni),
          procedureName: String(created.procedureName ?? ticketProcedureName),
          procedureUnitPriceSoles: Number(created.procedureUnitPriceCents) / 100,
          paymentEfectivoSoles: Number(created.paymentEfectivoCents) / 100,
          paymentYapeSoles: Number(created.paymentYapeCents) / 100,
          paymentPlinSoles: Number(created.paymentPlinCents) / 100,
          paymentTransferenciaSoles:
            Number(created.paymentTransferenciaCents) / 100,
          paymentTotalSoles: Number(created.paymentTotalCents) / 100,
          items: Array.isArray(created.ticketLines)
            ? created.ticketLines.map((l, idx) => ({
                productId: l.productId == null ? -(idx + 1) : Number(l.productId),
                name: String(l.name),
                unitPriceSoles: Number(l.unitPriceCents) / 100,
                quantity: Number(l.quantity),
                lineTotalSoles: Number(l.lineTotalCents) / 100,
              }))
            : items.map((x) => ({
                productId: x.productId,
                name: x.name,
                unitPriceSoles: x.unitPriceSoles,
                quantity: x.quantity,
                lineTotalSoles: x.lineTotalSoles,
              })),
          totalSoles: Number(created.totalCents) / 100,
        };

        // Guardado listo: imprimimos y cerramos modal
        handlePrintTicket(ticketToPrint);
        setShowTicketModal(false);
        setTicketAppointment(null);
        setTicketItems([]);
        setTicketError(null);
        return;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "No se pudo guardar el Ticket/Boleta.";
        setTicketError(msg);
        setTicketSaving(false);
        return;
      }

      // Nota: la persistencia y el descuento de stock se hacen en DB mediante
      // POST /api/tickets. No se utiliza localStorage.
    } catch {
      setTicketError("No se pudo guardar el Ticket/Boleta.");
    } finally {
      setTicketSaving(false);
    }
  }

  function buildTicketPrintHtml(params: {
    ticket: TicketStored;
    logoUrl: string;
    fechaCreacion: string;
    fechaImpresion: string;
  }) {
    const { ticket, logoUrl, fechaCreacion, fechaImpresion } = params;

    const nombre = escapeHtml(ticket.patientName);
    const dni = escapeHtml(ticket.patientDni);
    const procedimiento = escapeHtml(ticket.procedureName);

    const itemsHtml = ticket.items
      .filter((x) => x.quantity > 0)
      .map((x) => {
        const nombreItem = escapeHtml(x.name);
        const qty = x.quantity;
        const unit = formatSoles(x.unitPriceSoles);
        const total = formatSoles(x.lineTotalSoles);
        return `<tr>
          <td style="padding:6px 0;">${nombreItem}</td>
          <td style="padding:6px 0; text-align:right;">${qty}</td>
          <td style="padding:6px 0; text-align:right;">${unit}</td>
          <td style="padding:6px 0; text-align:right;">${total}</td>
        </tr>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ticket/Boleta</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #111827; }
      .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #e5e7eb; padding-bottom:10px; margin-bottom:14px; gap:16px;}
      .clinic-info { display:flex; align-items:center; gap:10px;}
      .logo { height:52px; }
      .clinic-name { font-weight:800; font-size:18px;}
      .clinic-sub { font-size:12px; color:#fbbf24; margin-top:2px;}
      .meta { font-size:12px; color:#4b5563;}
      .label { font-weight:600; }
      .section { border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; margin-top:10px;}
      .section-title { font-weight:700; margin-bottom:6px; font-size:13px;}
      table { width:100%; border-collapse:collapse; margin-top:6px;}
      th { text-align:left; font-size:12px; color:#374151; border-bottom:1px solid #e5e7eb; padding:6px 0;}
      td { font-size:12px; color:#111827; }
      .total-row { font-size:14px; font-weight:800;}
      .footer { margin-top:18px; padding-top:10px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; gap:18px;}
      .sign { flex:1; }
      .line { height:1px; background:#9ca3af; margin-top:26px; }
      .sign-label { margin-top:6px; font-size:12px; color:#4b5563;}
    </style>
  </head>
  <body>
    <div class="header">
      <div class="clinic-info">
        <img src="${logoUrl}" alt="Logo Harmonia Center" class="logo" />
        <div>
          <div class="clinic-name">Harmonia Center</div>
          <div class="clinic-sub">Medicina Alternativa Complementaria</div>
          <div class="meta">Ticket N.º ${ticket.ticketNumber}</div>
        </div>
      </div>
      <div class="meta">
        <div><span class="label">Fecha y hora de creación:</span> ${fechaCreacion}</div>
        <div><span class="label">Fecha y hora de impresión:</span> ${fechaImpresion}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Datos del paciente</div>
      <div class="meta"><span class="label">Nombre:</span> ${nombre}</div>
      <div class="meta"><span class="label">DNI:</span> ${dni}</div>
    </div>

    <div class="section">
      <div class="section-title">Detalle</div>
      <div class="meta"><span class="label">Procedimiento:</span> ${procedimiento}</div>
      <div class="meta"><span class="label">Precio del procedimiento:</span> ${formatSoles(ticket.procedureUnitPriceSoles)}</div>

      <table>
        <thead>
          <tr>
            <th>Producto/Extra</th>
            <th style="text-align:right;">Cant.</th>
            <th style="text-align:right;">Precio unit.</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || `<tr><td colspan="4" style="padding:6px 0; color:#6b7280;">Sin productos/extra</td></tr>`}
        </tbody>
      </table>

      <div class="total-row" style="margin-top:10px; text-align:right;">
        Total: ${formatSoles(ticket.totalSoles)}
      </div>
    </div>

    <div class="section" style="margin-top:10px;">
      <div class="section-title">Pagos</div>
      <div class="meta"><span class="label">Efectivo:</span> ${formatSoles(ticket.paymentEfectivoSoles ?? 0)}</div>
      <div class="meta"><span class="label">Yape:</span> ${formatSoles(ticket.paymentYapeSoles ?? 0)}</div>
      <div class="meta"><span class="label">Plin:</span> ${formatSoles(ticket.paymentPlinSoles ?? 0)}</div>
      <div class="meta"><span class="label">Transferencia:</span> ${formatSoles(ticket.paymentTransferenciaSoles ?? 0)}</div>
    </div>

    <!-- Sin firmas en Ticket/Boleta -->
  </body>
</html>`;
  }

  function handlePrintTicket(ticketToPrint: TicketStored) {
    if (typeof window === "undefined") return;

    const logoUrl = new URL("/logo-harmonia.png", window.location.origin).href;
    const now = new Date();
    const fechaCreacion = now.toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const fechaImpresion = now.toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const html = buildTicketPrintHtml({
      ticket: ticketToPrint,
      logoUrl,
      fechaCreacion,
      fechaImpresion,
    });

    const win = window.open("", "_blank");
    if (!win) return;
    try {
      win.opener = null;
    } catch {
      // ignore
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 300);
  }

  async function handleSaveRecipe(e: React.FormEvent) {
    e.preventDefault();
    setAttentionError(null);
    if (!attentionAppointmentId) {
      setAttentionError("Selecciona una cita primero.");
      return;
    }

    const appt = appointments.find((x) => x.id === attentionAppointmentId);
    if (!appt) {
      setAttentionError("No se encontró la cita.");
      return;
    }

    if (!attentionDiagnosis.trim()) {
      setAttentionError("El diagnóstico es obligatorio.");
      return;
    }
    if (!attentionPrescription.trim()) {
      setAttentionError("La receta es obligatoria.");
      return;
    }

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: appt.patientId,
          appointmentId: appt.id,
          diagnosis: attentionDiagnosis,
          workPlan: attentionWorkPlan || null,
          prescriptionText: attentionPrescription,
        }),
      });
      const payloadUnknown = await res.json();
      if (!res.ok) {
        const maybeError = payloadUnknown as { error?: unknown };
        setAttentionError(
          typeof maybeError.error === "string"
            ? maybeError.error
            : "No se pudo crear la receta.",
        );
        return;
      }

      const payload = payloadUnknown as Recipe;
      setRecipes((prev) => [payload, ...prev]);

      // Sincroniza el diagnóstico de Atención con la historia clínica del día.
      try {
        const targetVisitDate = toLocalISODate(new Date(appt.startAt));
        const notesRes = await fetch(
          `/api/clinical-notes?patientId=${encodeURIComponent(appt.patientId)}`,
        );
        const notesTxt = await notesRes.text();
        const notesData = safeJsonParse<ClinicalHistorySnapshot[] | { error?: string }>(
          notesTxt,
          [],
        );

        if (notesRes.ok && Array.isArray(notesData)) {
          const sameDayVisit = notesData.find((n) => n.visitDate === targetVisitDate);

          if (sameDayVisit) {
            await fetch("/api/clinical-notes", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: sameDayVisit.id,
                patientId: appt.patientId,
                diagnosis: attentionDiagnosis.trim(),
                treatmentPlan: attentionWorkPlan.trim() || null,
                treatmentNotes: mergeRecipeIntoTreatmentNotes(
                  sameDayVisit.treatmentNotes,
                  attentionPrescription,
                ),
              }),
            });
          } else {
            await fetch("/api/clinical-notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                patientId: appt.patientId,
                visitDate: targetVisitDate,
                appointmentId: appt.id,
                diagnosis: attentionDiagnosis.trim(),
                treatmentPlan: attentionWorkPlan.trim() || null,
                treatmentNotes: mergeRecipeIntoTreatmentNotes(
                  null,
                  attentionPrescription,
                ),
              }),
            });
          }
        }
      } catch {
        // No bloqueamos la receta si falla la sincronización de historia.
      }

      // Actualizar estado de la cita en pantalla (verde) al concluir con receta
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appt.id ? { ...a, status: "Concluida" } : a,
        ),
      );
      setAttentionTab("registradas");
      setAttentionDiagnosis("");
      setAttentionWorkPlan("");
      setAttentionPrescription("");
    } catch {
      setAttentionError("No se pudo crear la receta.");
    }
  }

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    // Calcular hora de fin automática 30 minutos después
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return;
    const [h, m] = value.split(":").map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const base = new Date(appointmentFormDate);
    base.setHours(h, m, 0, 0);
    base.setMinutes(base.getMinutes() + 30);
    const hh = String(base.getHours()).padStart(2, "0");
    const mm = String(base.getMinutes()).padStart(2, "0");
    setEndTime(`${hh}:${mm}`);
  }

  const ticketProductsSubtotalSoles = useMemo(
    () => ticketItems.reduce((acc, l) => acc + l.unitPriceSoles * l.quantity, 0),
    [ticketItems],
  );
  const ticketTotalSoles = ticketProcedureUnitPriceSoles + ticketProductsSubtotalSoles;

  const ticketPagosSumaSoles = useMemo(
    () =>
      ticketPagoEfectivoSoles +
      ticketPagoYapeSoles +
      ticketPagoPlinSoles +
      ticketPagoTransferenciaSoles,
    [
      ticketPagoEfectivoSoles,
      ticketPagoYapeSoles,
      ticketPagoPlinSoles,
      ticketPagoTransferenciaSoles,
    ],
  );

  const ticketFaltaPagoSoles = ticketTotalSoles - ticketPagosSumaSoles;

  // Si el usuario no editó manualmente los pagos, ajustamos Efectivo al nuevo total
  // cuando cambian los productos/servicios.
  useEffect(() => {
    if (ticketPagosManual) return;
    setTicketPagoEfectivoSoles(ticketTotalSoles);
    setTicketPagoYapeSoles(0);
    setTicketPagoPlinSoles(0);
    setTicketPagoTransferenciaSoles(0);
  }, [ticketTotalSoles, ticketPagosManual]);

  return (
    <main className="flex flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-slate-600">
            Agenda del día. Selecciona una fecha y programa nuevas citas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadProceduresFromStorage();
            setShowForm(true);
            setAppointmentFormDate(selectedDate);
          }}
          className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow hover:bg-amber-600"
        >
          Nueva cita
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Calendario</h2>
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => {
              if (!date) return;
              setSelectedDate(date);
            }}
            inline
            locale="es"
          />
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Citas del {selectedDate.toLocaleDateString("es-PE")}
          </h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-slate-500">No hay citas para este día.</p>
          ) : (
            <div
              className="max-h-[520px] overflow-y-auto rounded-xl border border-amber-100 bg-[#fbf7ee] p-3 shadow-inner"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, rgba(0,0,0,0.0) 0px, rgba(0,0,0,0.0) 26px, rgba(148,163,184,0.35) 27px, rgba(148,163,184,0.35) 28px)",
              }}
            >
              <ul className="space-y-2 text-sm">
              {appointments.slice(0, 15).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between rounded-lg border border-amber-200/60 bg-white/70 px-3 py-2 backdrop-blur"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {new Date(a.startAt).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(a.endAt).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {a.patient.fullName}
                    </p>
                    {a.type && a.type !== "Consulta" && (
                      <p className="text-xs text-slate-700">
                        Procedimiento: <span className="font-semibold">{a.type}</span>
                      </p>
                    )}
                    {a.reason && (
                      <p className="text-xs text-slate-600">
                        Observaciones: {a.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={
                        a.status === "Concluida"
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700"
                          : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
                      }
                    >
                      {a.status}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openAttentionForAppointment(a)}
                        className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        Atención
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `/historias?patientId=${encodeURIComponent(
                            a.patientId,
                          )}`;
                        }}
                        className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-900 hover:bg-indigo-100"
                      >
                        Historia Clínica
                      </button>
                      <button
                        type="button"
                        onClick={() => void openTicketForAppointment(a)}
                        className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-900 hover:bg-sky-100"
                      >
                        Ticket/Boleta
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSendAppointmentReminderWhatsapp(a)
                        }
                        className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 hover:bg-emerald-100"
                      >
                        Recordar WA
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(a.id);
                          setPatientId(a.patientId);
                          setProcedure(a.type || "");
                          const dt = new Date(a.startAt);
                          setAppointmentFormDate(
                            new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()),
                          );
                          setStartTime(
                            `${String(dt.getHours()).padStart(2, "0")}:${String(
                              dt.getMinutes(),
                            ).padStart(2, "0")}`,
                          );
                          setEndTime(
                            (() => {
                              const dte = new Date(a.endAt);
                              return `${String(dte.getHours()).padStart(2, "0")}:${String(
                                dte.getMinutes(),
                              ).padStart(2, "0")}`;
                            })(),
                          );
                          setReason(a.reason || "");
                          loadProceduresFromStorage();
                          setShowForm(true);
                        }}
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-800 hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAppointment(a.id)}
                        className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? "Editar cita médica" : "Nueva cita médica"}
              </h2>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => setShowForm(false)}
              >
                Cerrar
              </button>
            </div>
            <form className="space-y-3" onSubmit={handleCreateAppointment}>
              <div className="space-y-1 text-sm">
                <label className="block text-xs text-slate-600">Fecha</label>
                <input
                  type="date"
                  min={todayISO}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={appointmentFormDateISO}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const [yy, mm, dd] = v.split("-").map((n) => Number(n));
                    if (!yy || !mm || !dd) return;
                    // Usamos hora local (constructor con year/month/day)
                    setAppointmentFormDate(new Date(yy, mm - 1, dd));
                  }}
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="block text-xs text-slate-600">Paciente</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                >
                  <option value="">Selecciona un paciente…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} · DNI {p.dni}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 text-sm">
                <label className="block text-xs text-slate-600">
                  Procedimiento (lista de precios)
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                >
                  <option value="">Selecciona un procedimiento…</option>
                  {procedures.map((p, idx) => (
                    <option key={`${p.name}-${idx}`} value={p.name}>
                      {p.name} {p.price ? `· ${p.price}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Fuente:{" "}
                  <span className="font-semibold">
                    {proceduresSource === "lista-precios"
                      ? "Lista de precios (guardada)"
                      : "Respaldo (temporal)"}
                  </span>
                  . Si editas la{" "}
                  <span className="font-semibold">Lista de precios</span>, vuelve a
                  abrir este formulario para actualizar la lista.
                </p>
                {proceduresSource === "respaldo" && (
                  <p className="text-[11px] text-amber-700">
                    Para que jale tu lista personalizada, entra a{" "}
                    <span className="font-semibold">Lista de precios</span> una vez
                    (así se guarda en este navegador) y luego vuelve aquí.
                  </p>
                )}
              </div>
              <div className="flex gap-3 text-sm">
                <div className="flex-1 space-y-1">
                  <label className="block text-xs text-slate-600">Hora inicio</label>
                  <input
                    type="time"
                    min={isAppointmentDateToday ? earliestStartHHMM : "00:00"}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block text-xs text-slate-600">Hora fin</label>
                  <input
                    type="time"
                    min={isAppointmentDateToday ? startTime : "00:00"}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <label className="block text-xs text-slate-600">
                  Observaciones (opcional)
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder="Ej: control, resultados, indicaciones…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              {formError && (
                <p className="text-xs text-red-600">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormError(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-600"
                >
                  {editingId ? "Guardar cambios" : "Guardar cita"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAttention && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Atención médica
              </h2>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setShowAttention(false);
                  setAttentionAppointmentId("");
                  setAttentionTab("nueva");
                  setAttentionError(null);
                }}
              >
                Cerrar
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAttentionTab("nueva")}
                  className={
                    "rounded border px-3 py-1.5 text-xs font-semibold " +
                    (attentionTab === "nueva"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                  }
                >
                  Nueva receta
                </button>
                <button
                  type="button"
                  onClick={() => setAttentionTab("registradas")}
                  className={
                    "rounded border px-3 py-1.5 text-xs font-semibold " +
                    (attentionTab === "registradas"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                  }
                >
                  Recetas registradas
                </button>
              </div>

              {(() => {
                const appt = appointments.find(
                  (x) => x.id === attentionAppointmentId,
                );
                if (!appt) {
                  return (
                    <p className="text-sm text-slate-600">
                      No se encontró la cita.
                    </p>
                  );
                }

                const patient = appt.patient;
                return (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 mb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {patient.fullName}
                          </p>
                          <p className="text-xs text-slate-600">
                            DNI {patient.dni} · Tel. {patient.phone}
                          </p>
                          <p className="text-xs text-slate-600">
                            Edad:{" "}
                            {calcularEdadDetallada(
                              patient.birthDate as unknown as string,
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-600">
                            Procedimiento
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {appt.type}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                        Datos previos de historia clínica
                      </p>
                      {attentionClinicalLoading ? (
                        <p className="mt-1 text-xs text-slate-600">
                          Cargando última atención...
                        </p>
                      ) : (() => {
                          const snapshot = attentionClinicalSnapshot;
                          if (!snapshot) {
                            return (
                              <p className="mt-1 text-xs text-slate-600">
                                Este paciente aún no tiene datos previos en su historia clínica.
                              </p>
                            );
                          }

                          const fields = [
                            ["Fecha de atención", snapshot.visitDate],
                            ["Motivo de consulta", snapshot.consultationReason],
                            ["Enfermedad actual", snapshot.currentIllness],
                            ["Examen físico", snapshot.physicalExam],
                            ["Diagnóstico", snapshot.diagnosis],
                            ["Plan de tratamiento", snapshot.treatmentPlan],
                            ["Evolución", snapshot.evolutionNotes],
                            ["Notas de Enfermería", snapshot.nursingNotes],
                            ["Notas de tratamiento", snapshot.treatmentNotes],
                            ["Peso", snapshot.weight],
                            ["Talla", snapshot.height],
                            ["Temperatura corporal", snapshot.bodyTemperature],
                            ["Presión arterial", snapshot.bloodPressure],
                            ["Saturación", snapshot.oxygenSaturation],
                            ["Frecuencia cardíaca", snapshot.heartRate],
                            ["Frecuencia respiratoria", snapshot.respiratoryRate],
                            ["Glucosa", snapshot.glucose],
                          ].filter(([, value]) => {
                            if (value == null) return false;
                            return String(value).trim().length > 0;
                          });

                          if (!fields.length) {
                            return (
                              <p className="mt-1 text-xs text-slate-600">
                                La última atención no tiene campos llenados para mostrar.
                              </p>
                            );
                          }

                          return (
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              {fields.map(([label, value]) => (
                                <div
                                  key={label}
                                  className="rounded-lg border border-indigo-100 bg-white px-2 py-1.5"
                                >
                                  <p className="text-[11px] font-semibold text-indigo-800">
                                    {label}
                                  </p>
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap">
                                    {value}
                                  </p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                    </div>

                    {attentionTab === "nueva" ? (
                      <form onSubmit={handleSaveRecipe} className="space-y-3">
                        <div className="grid gap-3 lg:grid-cols-2">
                          <div className="space-y-1">
                            <label className="block text-xs text-slate-600">
                              Diagnóstico
                            </label>
                            <textarea
                              className="min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                              value={attentionDiagnosis}
                              onChange={(e) =>
                                setAttentionDiagnosis(e.target.value)
                              }
                              placeholder="Diagnóstico principal y/o observaciones clínicas…"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs text-slate-600">
                              Plan de Trabajo
                            </label>
                            <textarea
                              className="min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                              value={attentionWorkPlan}
                              onChange={(e) =>
                                setAttentionWorkPlan(e.target.value)
                              }
                              placeholder="Procedimientos, terapias, controles…"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs text-slate-600">
                            Receta
                          </label>
                          <textarea
                            className="min-h-[100px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            value={attentionPrescription}
                            onChange={(e) =>
                              setAttentionPrescription(e.target.value)
                            }
                            placeholder="Escribe la receta con formato: medicamento, dosis, frecuencia y duración…"
                          />
                        </div>

                        {attentionError && (
                          <p className="text-xs text-red-600">{attentionError}</p>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => setAttentionTab("registradas")}
                          >
                            Ver recetas
                          </button>
                          <button
                            type="submit"
                            className="rounded bg-amber-500 px-4 py-2 text-xs font-semibold text-black hover:bg-amber-600"
                          >
                            Guardar receta
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div>
                        {recipes.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            Aún no hay recetas registradas para esta cita.
                          </p>
                        ) : (
                          <div className="max-h-[420px] overflow-y-auto space-y-2">
                            {recipes.slice(0, 15).map((r) => (
                              <article
                                key={r.id}
                                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-500">
                                      N.º Receta: {r.recipeNumber}
                                    </p>
                                    <p className="font-semibold text-slate-900">
                                      {new Date(r.createdAt).toLocaleString(
                                        "es-PE",
                                        { dateStyle: "medium", timeStyle: "short" },
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handlePrintRecipe(r, appt)}
                                      className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                      Imprimir
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSendRecipeWhatsapp(r, appt)}
                                      className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                                    >
                                      WhatsApp
                                    </button>
                                  </div>
                                </div>
                                {r.diagnosis && (
                                  <p className="mt-1 text-slate-700">
                                    <span className="font-semibold">Diagnóstico:</span>{" "}
                                    {r.diagnosis}
                                  </p>
                                )}
                                {r.workPlan && (
                                  <p className="mt-1 text-slate-700">
                                    <span className="font-semibold">
                                      Plan de Trabajo:
                                    </span>{" "}
                                    {r.workPlan}
                                  </p>
                                )}
                                {r.prescriptionText && (
                                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                                    <span className="font-semibold">Receta:</span>{" "}
                                    {r.prescriptionText}
                                  </p>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showTicketModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Ticket/Boleta
              </h2>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => {
                  setShowTicketModal(false);
                  setTicketAppointment(null);
                  setTicketItems([]);
                  setTicketError(null);
                  setTicketPagoEfectivoSoles(0);
                  setTicketPagoYapeSoles(0);
                  setTicketPagoPlinSoles(0);
                  setTicketPagoTransferenciaSoles(0);
                  setTicketExtraDetailToAdd("");
                  setTicketExtraUnitPriceToAdd(0);
                  setTicketExtraQtyToAdd(1);
                }}
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-3 p-3 flex-1 overflow-y-auto">
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {ticketAppointment?.patient.fullName ?? "—"}
                  </div>
                  <div className="text-xs text-slate-600">
                    DNI {ticketAppointment?.patient.dni ?? "—"}
                  </div>
                  <div className="text-xs text-slate-600">
                    Fecha: {ticketDateISO || "—"}
                  </div>
                  <div className="text-xs text-slate-600">
                    Procedimiento:{" "}
                    <span className="font-semibold">
                      {ticketProcedureName || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Precio del procedimiento
                    </p>
                    <p className="text-[11px] text-slate-500">
                      (editable)
                    </p>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={Number.isFinite(ticketProcedureUnitPriceSoles) ? ticketProcedureUnitPriceSoles : 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setTicketProcedureUnitPriceSoles(Number.isFinite(v) ? v : 0);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Productos (lista de productos)
                </h3>

                {productCatalog.length === 0 ? (
                  <p className="text-sm text-amber-700">
                    No hay productos disponibles. Guarda primero la Lista de
                    productos.
                  </p>
                ) : (
                  <div className="grid gap-2 md:grid-cols-[1fr,110px,120px]">
                    <select
                      value={ticketProductIdToAdd}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTicketProductIdToAdd(v ? Number(v) : "");
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecciona producto…</option>
                      {productCatalog.map((p) => (
                        <option key={p.productId} value={p.productId}>
                          {p.name} · {formatSoles(p.unitPriceSoles)}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={ticketProductQtyToAdd}
                      onChange={(e) => {
                        const normalized = e.target.value
                          .replace(/[^\d]/g, "")
                          .replace(/^0+(?=\d)/, "");
                        setTicketProductQtyToAdd(normalized);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />

                    <button
                      type="button"
                      onClick={handleAddTicketProduct}
                      className="rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
                    >
                      Agregar
                    </button>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Producto extra (detalle y precio)
                  </h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      type="text"
                      value={ticketExtraDetailToAdd}
                      onChange={(e) => setTicketExtraDetailToAdd(e.target.value)}
                      placeholder="Ej: Curación / insumo / detalle..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">
                        S/
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          ticketExtraUnitPriceToAdd > 0
                            ? ticketExtraUnitPriceToAdd
                            : ""
                        }
                        onChange={(e) => {
                          if (e.target.value === "") {
                            setTicketExtraUnitPriceToAdd(0);
                            return;
                          }
                          const v = Number(e.target.value);
                          setTicketExtraUnitPriceToAdd(
                            Number.isFinite(v) ? v : 0,
                          );
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder="Precio extra"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Cantidad</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={ticketExtraQtyToAdd}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTicketExtraQtyToAdd(Number.isFinite(v) ? v : 1);
                        }}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddExtraProductLine}
                      className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                    >
                      Agregar extra
                    </button>
                  </div>
                </div>

                {ticketItems.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="max-h-[220px] overflow-y-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                              Producto
                            </th>
                            <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                              Cant.
                            </th>
                            <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                              Precio unit.
                            </th>
                            <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                              Total
                            </th>
                            <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                              Acc.
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ticketItems.map((line) => (
                            <tr key={line.lineId} className="border-b border-slate-100">
                              <td className="px-2 py-2 text-slate-800">
                                {line.name}
                              </td>
                              <td className="px-2 py-2 text-right">
                                <span className="text-sm text-right">
                                  {line.quantity}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right">
                                <span className="text-sm text-right">
                                  {formatSoles(line.unitPriceSoles)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right font-semibold text-slate-900">
                                {formatSoles(
                                  line.unitPriceSoles * line.quantity,
                                )}
                              </td>
                              <td className="px-2 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTicketItems((prev) =>
                                      prev.filter((x) => x.lineId !== line.lineId),
                                    )
                                  }
                                  className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                                >
                                  Quitar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Aún no agregas productos.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Total</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatSoles(ticketTotalSoles)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Formas de pago
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600">
                      Efectivo
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        ticketPagoEfectivoSoles > 0
                          ? ticketPagoEfectivoSoles
                          : ""
                      }
                      onChange={(e) => {
                        setTicketPagosManual(true);
                        if (e.target.value === "") {
                          setTicketPagoEfectivoSoles(0);
                          return;
                        }
                        const v = Number(e.target.value);
                        setTicketPagoEfectivoSoles(Number.isFinite(v) ? v : 0);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600">
                      Yape
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        ticketPagoYapeSoles > 0 ? ticketPagoYapeSoles : ""
                      }
                      onChange={(e) => {
                        setTicketPagosManual(true);
                        if (e.target.value === "") {
                          setTicketPagoYapeSoles(0);
                          return;
                        }
                        const v = Number(e.target.value);
                        setTicketPagoYapeSoles(Number.isFinite(v) ? v : 0);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600">
                      Plin
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        ticketPagoPlinSoles > 0 ? ticketPagoPlinSoles : ""
                      }
                      onChange={(e) => {
                        setTicketPagosManual(true);
                        if (e.target.value === "") {
                          setTicketPagoPlinSoles(0);
                          return;
                        }
                        const v = Number(e.target.value);
                        setTicketPagoPlinSoles(Number.isFinite(v) ? v : 0);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs text-slate-600">
                      Transferencia
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        ticketPagoTransferenciaSoles > 0
                          ? ticketPagoTransferenciaSoles
                          : ""
                      }
                      onChange={(e) => {
                        setTicketPagosManual(true);
                        if (e.target.value === "") {
                          setTicketPagoTransferenciaSoles(0);
                          return;
                        }
                        const v = Number(e.target.value);
                        setTicketPagoTransferenciaSoles(Number.isFinite(v) ? v : 0);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  Pagado:{" "}
                  <span className="font-semibold">
                    {formatSoles(ticketPagosSumaSoles)}
                  </span>
                  {" · "}Falta:{" "}
                  <span className="font-semibold">
                    {formatSoles(ticketFaltaPagoSoles)}
                  </span>
                </div>
              </div>

              {ticketError && (
                <p className="text-sm text-red-600">{ticketError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
                  onClick={() => {
                    setShowTicketModal(false);
                    setTicketAppointment(null);
                    setTicketItems([]);
                    setTicketError(null);
                    setTicketExtraDetailToAdd("");
                    setTicketExtraUnitPriceToAdd(0);
                    setTicketExtraQtyToAdd(1);
                    setTicketPagoEfectivoSoles(0);
                    setTicketPagoYapeSoles(0);
                    setTicketPagoPlinSoles(0);
                    setTicketPagoTransferenciaSoles(0);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={ticketSaving}
                  onClick={handleSaveTicket}
                  className="rounded bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-60"
                >
                  Guardar / Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AgendaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-600">
          Cargando…
        </div>
      }
    >
      <AgendaPageInner />
    </Suspense>
  );
}

