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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleNav = () => setMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen">
      <aside
        className="hidden w-64 shrink-0 bg-slate-900 text-slate-100 p-4 space-y-4 sm:flex"
        aria-label="Barra lateral"
      >
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
          <a
            href="/dashboard"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Dashboard
          </a>
          <a
            href="/patients"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Pacientes
          </a>
          <a
            href="/agenda"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Agenda
          </a>
          <a
            href="/historias"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Historias Clínicas
          </a>
          <a
            href="/registro-atenciones"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Registro de Atenciones
          </a>
          <a
            href="/mensajeria"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Mensajería
          </a>
          <a
            href="/cumpleanos"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Cumpleaños
          </a>
          <a
            href="/precios"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Lista de precios
          </a>
          <a
            href="/precios-productos"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Lista de productos
          </a>
          <a
            href="/recetas"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Recetas
          </a>
          <a
            href="/facturacion"
            className="block px-2 py-1 rounded hover:bg-slate-800"
            onClick={handleNav}
          >
            Facturación
          </a>

          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              setMobileMenuOpen(false);
              window.location.href = "/login";
            }}
            className="mt-3 w-full rounded border border-slate-700 bg-slate-800/40 px-2 py-1 text-left text-xs font-semibold text-slate-100 hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sm:hidden flex items-center justify-between bg-slate-900 px-4 py-3 text-slate-100">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded px-2 py-1 text-sm font-semibold hover:bg-slate-800"
            aria-label="Abrir menú"
          >
            Menú
          </button>
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-semibold leading-tight">
              Harmonia Center
            </span>
            {user ? (
              <span className="text-[11px] leading-tight text-amber-200">
                {user.role}
              </span>
            ) : (
              <span className="text-[11px] leading-tight text-slate-300">
                Sesión
              </span>
            )}
          </div>
          <div className="w-12 sm:w-[60px]" />
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="relative h-full w-[85vw] max-w-sm bg-slate-900 text-slate-100 p-4 overflow-y-auto space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-black/40">
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
              <a
                href="/dashboard"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Dashboard
              </a>
              <a
                href="/patients"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Pacientes
              </a>
              <a
                href="/agenda"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Agenda
              </a>
              <a
                href="/historias"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Historias Clínicas
              </a>
              <a
                href="/registro-atenciones"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Registro de Atenciones
              </a>
              <a
                href="/mensajeria"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Mensajería
              </a>
              <a
                href="/cumpleanos"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Cumpleaños
              </a>
              <a
                href="/precios"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Lista de precios
              </a>
              <a
                href="/precios-productos"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Lista de productos
              </a>
              <a
                href="/recetas"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Recetas
              </a>
              <a
                href="/facturacion"
                className="block px-2 py-1 rounded hover:bg-slate-800"
                onClick={handleNav}
              >
                Facturación
              </a>

              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  setMobileMenuOpen(false);
                  window.location.href = "/login";
                }}
                className="mt-3 w-full rounded border border-slate-700 bg-slate-800/40 px-2 py-1 text-left text-xs font-semibold text-slate-100 hover:bg-slate-800"
              >
                Cerrar sesión
              </button>
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}

