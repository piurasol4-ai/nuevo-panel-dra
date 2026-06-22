"use client";

import { toLocalISODate } from "@/lib/date-range";

type DateRangeFilterProps = {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApply?: () => void;
  onClear?: () => void;
  labelFrom?: string;
  labelTo?: string;
  loading?: boolean;
  showPresets?: boolean;
};

function startOfMonthISO(d = new Date()): string {
  return toLocalISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function startOfYearISO(d = new Date()): string {
  return toLocalISODate(new Date(d.getFullYear(), 0, 1));
}

export default function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  onClear,
  labelFrom = "Desde",
  labelTo = "Hasta",
  loading = false,
  showPresets = true,
}: DateRangeFilterProps) {
  const today = toLocalISODate(new Date());

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col text-xs font-medium text-slate-600">
        {labelFrom}
        <input
          type="date"
          className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
      </label>
      <label className="flex flex-col text-xs font-medium text-slate-600">
        {labelTo}
        <input
          type="date"
          className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </label>

      {showPresets && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              onDateFromChange(today);
              onDateToChange(today);
            }}
            className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => {
              onDateFromChange(startOfMonthISO());
              onDateToChange(today);
            }}
            className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => {
              onDateFromChange(startOfYearISO());
              onDateToChange(today);
            }}
            className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
          >
            Este año
          </button>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              Todo el tiempo
            </button>
          )}
        </div>
      )}

      {onApply && (
        <button
          type="button"
          onClick={onApply}
          disabled={loading}
          className="rounded border border-amber-500 bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "Cargando…" : "Aplicar"}
        </button>
      )}
    </div>
  );
}
