"use client";

import { useEffect, useMemo, useState } from "react";

type TicketStored = {
  id: string;
  ticketNumber: number;
  createdAt: string;
  dateISO: string;
  totalSoles: number;
  paymentEfectivoSoles?: number;
  paymentYapeSoles?: number;
  paymentPlinSoles?: number;
  paymentTransferenciaSoles?: number;
  paymentTotalSoles?: number;
};

const TICKETS_STORAGE_KEY = "hc_tickets_v1";

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

function safeNum(n: unknown) {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : 0;
}

function getWeekRangeISO(now: Date) {
  // Semana con inicio en lunes (00:00) y fin en domingo (23:59:59).
  const d = new Date(now);
  const dayOfWeek = d.getDay(); // 0 dom ... 6 sáb
  const diffToMonday = (dayOfWeek + 6) % 7; // lunes => 0, domingo => 6

  const start = new Date(d);
  start.setDate(d.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    startISO: toLocalISODate(start),
    endISO: toLocalISODate(end),
  };
}

export default function RevenueSummary() {
  const [tickets, setTickets] = useState<TicketStored[]>([]);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = window.localStorage.getItem(TICKETS_STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        const all = Array.isArray(parsed) ? (parsed as TicketStored[]) : [];
        setTickets(all);
      } catch {
        setTickets([]);
      }
    });
  }, []);

  const now = new Date();
  const todayISO = toLocalISODate(now);

  const { startISO: weekStartISO, endISO: weekEndISO } = getWeekRangeISO(
    now,
  );

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const monthStartISO = toLocalISODate(monthStart);
  const monthEndISO = toLocalISODate(monthEnd);

  const { todayTickets, weekTickets, monthTickets } = useMemo(() => {
    const inWeek = (dateISO: string) =>
      dateISO >= weekStartISO && dateISO <= weekEndISO;
    const inMonth = (dateISO: string) =>
      dateISO >= monthStartISO && dateISO <= monthEndISO;

    const today = tickets.filter((t) => t.dateISO === todayISO);
    const week = tickets.filter((t) => inWeek(t.dateISO));
    const month = tickets.filter((t) => inMonth(t.dateISO));
    return { todayTickets: today, weekTickets: week, monthTickets: month };
  }, [
    tickets,
    todayISO,
    weekStartISO,
    weekEndISO,
    monthStartISO,
    monthEndISO,
  ]);

  const todayTotalSoles = useMemo(() => {
    return todayTickets.reduce((acc, t) => acc + safeNum(t.totalSoles), 0);
  }, [todayTickets]);

  const weekTotalSoles = useMemo(() => {
    return weekTickets.reduce((acc, t) => acc + safeNum(t.totalSoles), 0);
  }, [weekTickets]);

  const monthTotalSoles = useMemo(() => {
    return monthTickets.reduce((acc, t) => acc + safeNum(t.totalSoles), 0);
  }, [monthTickets]);

  const sumByPayment = (arr: TicketStored[]) => {
    const sumBy = (key: keyof TicketStored) =>
      arr.reduce((acc, t) => acc + safeNum(t[key]), 0);

    return {
      efectivo: sumBy("paymentEfectivoSoles"),
      yape: sumBy("paymentYapeSoles"),
      plin: sumBy("paymentPlinSoles"),
      cuentaBancaria: sumBy("paymentTransferenciaSoles"),
    };
  };

  const todayByPayment = useMemo(
    () => sumByPayment(todayTickets),
    [todayTickets],
  );
  const weekByPayment = useMemo(() => sumByPayment(weekTickets), [weekTickets]);
  const monthByPayment = useMemo(
    () => sumByPayment(monthTickets),
    [monthTickets],
  );

  return (
    <div className="space-y-3">
      <div>
        <p className="mt-2 text-3xl font-semibold text-slate-900">
          {formatSoles(todayTotalSoles)}
        </p>
        <p className="mt-1 text-xs text-emerald-600">
          {todayTickets.length} ticket(s) cobrados
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Efectivo
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatSoles(todayByPayment.efectivo)}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            Semana: {formatSoles(weekByPayment.efectivo)} · Mes:{" "}
            {formatSoles(monthByPayment.efectivo)}
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
            Yape
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatSoles(todayByPayment.yape)}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            Semana: {formatSoles(weekByPayment.yape)} · Mes:{" "}
            {formatSoles(monthByPayment.yape)}
          </p>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
            Plin
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatSoles(todayByPayment.plin)}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            Semana: {formatSoles(weekByPayment.plin)} · Mes:{" "}
            {formatSoles(monthByPayment.plin)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
            Cuenta bancaria
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formatSoles(todayByPayment.cuentaBancaria)}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            Semana: {formatSoles(weekByPayment.cuentaBancaria)} · Mes:{" "}
            {formatSoles(monthByPayment.cuentaBancaria)}
          </p>
        </div>
      </div>

      <div className="text-[11px] text-slate-500">
        Semana total: {formatSoles(weekTotalSoles)} · Mes total:{" "}
        {formatSoles(monthTotalSoles)}
      </div>
    </div>
  );
}

