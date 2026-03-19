"use client";

import { useMemo, useState } from "react";
import { isValidEmail } from "@/lib/email";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("doctora@drarosalles.com");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"doctora" | "secretaria">("doctora");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const title = useMemo(
    () => (mode === "login" ? "Ingreso de la doctora" : "Crear cuenta"),
    [mode],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!isValidEmail(email)) {
      setError("Ingresa un correo válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { email, password }
            : { email, password, name, role },
        ),
      });
      const txt = await res.text();
      const payload = txt ? (() => { try { return JSON.parse(txt); } catch { return { error: txt }; } })() : null;
      if (!res.ok) {
        setError(payload?.error || "No se pudo continuar.");
        return;
      }

      if (mode === "register") {
        setInfo(payload?.message || "Cuenta creada. Ya puedes iniciar sesión.");
        setMode("login");
        setPassword("");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next || "/dashboard";
    } catch (err) {
      console.error(err);
      setError("No se pudo continuar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-3rem)] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 overflow-hidden rounded-xl bg-black/5 ring-1 ring-slate-200">
            <img
              src="/logo-harmonia.png"
              alt="Logo Harmonia Center"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="text-sm font-semibold tracking-wide text-amber-600">
            ACCESO
          </p>
          <h1 className="text-center text-3xl font-bold text-slate-900">
            {title}
          </h1>
          <p className="text-sm text-slate-600">
            Ingresa con correo y contraseña.
          </p>
        </div>

        <div className="mt-6 flex rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={
              "flex-1 rounded-xl px-4 py-2 text-sm font-semibold " +
              (mode === "login"
                ? "bg-amber-500 text-black shadow"
                : "text-slate-700 hover:bg-white")
            }
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={
              "flex-1 rounded-xl px-4 py-2 text-sm font-semibold " +
              (mode === "register"
                ? "bg-amber-500 text-black shadow"
                : "text-slate-700 hover:bg-white")
            }
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">
                  Nombre
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400"
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">Rol</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400"
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "doctora" | "secretaria")
                  }
                >
                  <option value="doctora">Doctora</option>
                  <option value="secretaria">Secretaria</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Correo</label>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400"
              placeholder="doctora@drarosalles.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-emerald-700">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold text-black shadow hover:bg-amber-600 disabled:opacity-60"
          >
            {loading ? "Cargando..." : "Continuar"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Continuar al dashboard
          </p>
        </form>
      </div>
    </main>
  );
}

