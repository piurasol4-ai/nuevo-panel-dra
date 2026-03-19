import "./globals.css";
import type { Metadata } from "next";
import SidebarShell from "./sidebar-shell";

export const metadata: Metadata = {
  title: "Panel médico",
  description: "Agenda y pacientes de la doctora",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 antialiased">
        <SidebarShell>{children}</SidebarShell>
      </body>
    </html>
  );
}
