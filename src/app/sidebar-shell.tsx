"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function SidebarShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSidebar = pathname === "/login";
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    if (hideSidebar) return;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d?.user ?? null))
      .catch(() => setUser(null));
  }, [hideSidebar]);

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-slate-900 text-slate-100 p-4 space-y-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 overflow-hidden rounded-full bg-black/40">
            <img
              src="/logo-harmonia.png"
              alt="Logo Harmonia Center"
              className="h-full w-full object-contain opacity-95"
            />
          </div>
          <h1 className="text-center text-sm font-semibold leading-snug">
            Harmonia Center
            <br />
            <span className="text-[11px] font-normal text-amber-300">
              Medicina Alternativa Complementaria
            </span>
          </h1>
          {user && (
            <div className="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-200">
              <p className="font-semibold">{user.name}</p>
              <p className="text-slate-400">{user.role}</p>
            </div>
          )}
        </div>

        <nav className="space-y-2 text-sm">
          <a href="/dashboard" className="block px-2 py-1 rounded hover:bg-slate-800">
            Dashboard
          </a>
          <a href="/patients" className="block px-2 py-1 rounded hover:bg-slate-800">
            Pacientes
          </a>
          <a href="/agenda" className="block px-2 py-1 rounded hover:bg-slate-800">
            Agenda
          </a>
          <a href="/historias" className="block px-2 py-1 rounded hover:bg-slate-800">
            Historias Clínicas
          </a>
          <a href="/mensajeria" className="block px-2 py-1 rounded hover:bg-slate-800">
            Mensajería
          </a>
          <a href="/cumpleanos" className="block px-2 py-1 rounded hover:bg-slate-800">
            Cumpleaños
          </a>
          <a href="/precios" className="block px-2 py-1 rounded hover:bg-slate-800">
            Lista de precios
          </a>
          <a
            href="/precios-productos"
            className="block px-2 py-1 rounded hover:bg-slate-800"
          >
            Lista de productos
          </a>
          <a href="/recetas" className="block px-2 py-1 rounded hover:bg-slate-800">
            Recetas
          </a>
          <a href="/facturacion" className="block px-2 py-1 rounded hover:bg-slate-800">
            Facturación
          </a>

          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="mt-3 w-full rounded border border-slate-700 bg-slate-800/40 px-2 py-1 text-left text-xs font-semibold text-slate-100 hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

