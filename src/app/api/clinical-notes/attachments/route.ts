import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";
import { deleteDriveFile } from "@/lib/google-drive";

/**
 * Quita un archivo de Google Drive (p. ej. el usuario subió y lo eliminó antes de guardar la ficha).
 * Requiere sesión; uso interno del panel.
 */
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    await verifySession(token);
  } catch {
    return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const driveFileId = (searchParams.get("driveFileId") ?? "").trim();
  if (!driveFileId) {
    return NextResponse.json({ error: "Falta driveFileId." }, { status: 400 });
  }

  try {
    await deleteDriveFile(driveFileId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Drive delete error:", err);
    return NextResponse.json(
      { error: "No se pudo eliminar el archivo en Drive." },
      { status: 500 },
    );
  }
}
