"use client";

import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale/es";

import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

type TicketStored = {
  id: string;
  ticketNumber: number;
  createdAt: string;
  dateISO: string;
  patientName: string;
  patientDni: string;
  procedureName: string;
  procedureUnitPriceSoles?: number;
  totalSoles: number;
  paymentEfectivoSoles?: number;
  paymentYapeSoles?: number;
  paymentPlinSoles?: number;
  paymentTransferenciaSoles?: number;
  paymentTotalSoles?: number;
  items?: Array<{
    productId: number;
    name: string;
    unitPriceSoles: number;
    quantity: number;
    lineTotalSoles: number;
  }>;
};

function toLocalISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSoles(n: number) {
  return `S/ ${n.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function FacturacionPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedDateISO = useMemo(
    () => toLocalISODate(selectedDate),
    [selectedDate],
  );

  const [tickets, setTickets] = useState<TicketStored[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/tickets?dateISO=${encodeURIComponent(selectedDateISO)}`,
        );
        const json = (await res.json()) as {
          ok?: boolean;
          tickets?: unknown[];
          error?: string;
        };

        if (!json.ok && json.error) {
          throw new Error(json.error);
        }

        type TicketApiLike = {
          id: unknown;
          ticketNumber: unknown;
          createdAt: unknown;
          dateISO: unknown;
          patientName: unknown;
          patientDni: unknown;
          procedureName: unknown;
          procedureUnitPriceCents: unknown;
          totalCents: unknown;
          paymentEfectivoCents: unknown;
          paymentYapeCents: unknown;
          paymentPlinCents: unknown;
          paymentTransferenciaCents: unknown;
          paymentTotalCents: unknown;
          ticketLines?: Array<{
            id: unknown;
            productId: unknown;
            name: unknown;
            quantity: unknown;
            unitPriceCents: unknown;
            lineTotalCents: unknown;
          }>;
        };

        const list = Array.isArray(json.tickets) ? json.tickets : [];
        const mapped: TicketStored[] = list.map((t) => {
          const x = t as TicketApiLike;
          return {
            id: String(x.id),
            ticketNumber: Number(x.ticketNumber),
            createdAt: String(x.createdAt),
            dateISO: String(x.dateISO),
            patientName: String(x.patientName),
            patientDni: String(x.patientDni),
            procedureName: String(x.procedureName ?? ""),
            procedureUnitPriceSoles: Number(x.procedureUnitPriceCents) / 100,
            totalSoles: Number(x.totalCents) / 100,
            paymentEfectivoSoles: Number(x.paymentEfectivoCents) / 100,
            paymentYapeSoles: Number(x.paymentYapeCents) / 100,
            paymentPlinSoles: Number(x.paymentPlinCents) / 100,
            paymentTransferenciaSoles: Number(x.paymentTransferenciaCents) / 100,
            paymentTotalSoles: Number(x.paymentTotalCents) / 100,
            items: (Array.isArray(x.ticketLines) ? x.ticketLines : []).map((l) => ({
              productId: typeof l.productId === "number" ? l.productId : -1,
              name: String(l.name),
              unitPriceSoles: Number(l.unitPriceCents) / 100,
              quantity: Number(l.quantity),
              lineTotalSoles: Number(l.lineTotalCents) / 100,
            })),
          };
        });

        mapped.sort((a, b) => b.ticketNumber - a.ticketNumber);
        setTickets(mapped);
      } catch {
        setTickets([]);
        setError("No se pudieron cargar los tickets/boletas.");
      } finally {
        setLoading(false);
      }
    });
  }, [selectedDateISO]);

  const totalFacturado = useMemo(
    () => tickets.reduce((acc, t) => acc + (Number.isFinite(t.totalSoles) ? t.totalSoles : 0), 0),
    [tickets],
  );

  function handleDeleteTicket(t: TicketStored) {
    const ok = window.confirm(
      `¿Deseas eliminar el Ticket N.º ${t.ticketNumber} de ${t.patientName}?`,
    );
    if (!ok) return;

    fetch(`/api/tickets?id=${encodeURIComponent(t.id)}`, { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(json?.error ?? "No se pudo eliminar el Ticket/Boleta.");
        }
      })
      .then(() => setTickets((prev) => prev.filter((x) => x.id !== t.id)))
      .catch(() => alert("No se pudo eliminar el Ticket/Boleta."));
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
    const procedimiento = escapeHtml(ticket.procedureName || "");

    const itemsHtml = (ticket.items ?? [])
      .filter((x) => Number.isFinite(x.quantity) && x.quantity > 0)
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
      <div class="meta"><span class="label">Documento:</span> ${dni}</div>
    </div>

    <div class="section">
      <div class="section-title">Detalle</div>
      <div class="meta"><span class="label">Procedimiento:</span> ${procedimiento}</div>
      <div class="meta"><span class="label">Precio del procedimiento:</span> ${formatSoles(ticket.procedureUnitPriceSoles ?? 0)}</div>

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
          ${
            itemsHtml ||
            `<tr><td colspan="4" style="padding:6px 0; color:#6b7280;">Sin productos/extra</td></tr>`
          }
        </tbody>
      </table>

      <div class="section" style="margin-top:10px;">
        <div class="section-title">Pagos</div>
        <div class="meta"><span class="label">Efectivo:</span> ${formatSoles(ticket.paymentEfectivoSoles ?? 0)}</div>
        <div class="meta"><span class="label">Yape:</span> ${formatSoles(ticket.paymentYapeSoles ?? 0)}</div>
        <div class="meta"><span class="label">Plin:</span> ${formatSoles(ticket.paymentPlinSoles ?? 0)}</div>
        <div class="meta"><span class="label">Transferencia:</span> ${formatSoles(ticket.paymentTransferenciaSoles ?? 0)}</div>
      </div>

      <div class="total-row" style="margin-top:10px; text-align:right;">
        Total: ${formatSoles(ticket.totalSoles)}
      </div>
    </div>
  </body>
</html>`;
  }

  function handlePrintTicket(t: TicketStored) {
    try {
      const logoUrl = new URL("/logo-harmonia.png", window.location.origin).href;
      const created = new Date(t.createdAt);
      const fechaCreacion = created.toLocaleString("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const fechaImpresion = new Date().toLocaleString("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const html = buildTicketPrintHtml({
        ticket: t,
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
    } catch {
      alert("No se pudo imprimir el Ticket/Boleta.");
    }
  }

  return (
    <main className="flex flex-col gap-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Facturación</h1>
        <p className="text-sm text-slate-600">
          Tickets/Boletas guardados para cada fecha.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Fecha</h2>
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => {
              if (!date) return;
              setSelectedDate(date);
            }}
            inline
            locale="es"
          />
          <div className="text-xs text-slate-500">
            Total del día:{" "}
            <span className="font-semibold text-slate-800">
              {formatSoles(totalFacturado)}
            </span>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Tickets/Boletas del {selectedDate.toLocaleDateString("es-PE")}
            </h2>
            <div className="text-sm font-semibold text-slate-800">
              Total: {formatSoles(totalFacturado)}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Cargando facturación…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay Tickets/Boletas para esta fecha.
            </p>
          ) : (
              <div className="max-h-[520px] overflow-x-auto overflow-y-auto rounded-xl border border-amber-100 bg-[#fbf7ee] p-3 shadow-inner">
              <table className="min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pl-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      N.º Ticket
                    </th>
                    <th className="py-2 pl-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Paciente
                    </th>
                    <th className="py-2 pl-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Documento
                    </th>
                    <th className="py-2 pl-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Procedimiento
                    </th>
                    <th className="py-2 pr-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Total
                    </th>
                    <th className="py-2 pr-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 15).map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-amber-100/70 bg-white/70"
                    >
                      <td className="py-2 pl-2 font-semibold text-slate-900">
                        {t.ticketNumber}
                      </td>
                      <td className="py-2 pl-2 text-slate-700">
                        {t.patientName}
                      </td>
                      <td className="py-2 pl-2 text-slate-700">
                        {t.patientDni}
                      </td>
                      <td className="py-2 pl-2 text-slate-700">
                        {t.procedureName || "—"}
                      </td>
                      <td className="py-2 pr-2 text-right font-semibold text-slate-900">
                        {formatSoles(t.totalSoles)}
                        <div className="text-[10px] font-normal text-slate-600">
                          Pagos: Ef. {formatSoles(t.paymentEfectivoSoles ?? 0)} · Yape{" "}
                          {formatSoles(t.paymentYapeSoles ?? 0)} · Plin{" "}
                          {formatSoles(t.paymentPlinSoles ?? 0)} · Tran{" "}
                          {formatSoles(t.paymentTransferenciaSoles ?? 0)}
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handlePrintTicket(t)}
                            className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-800 hover:bg-sky-100"
                          >
                            Imprimir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(t)}
                            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tickets.length > 15 && (
                <div className="mt-2 text-xs text-slate-500">
                  Mostrando 15 tickets (para ver más, ajusta el límite).
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

