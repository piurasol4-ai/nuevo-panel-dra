import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function sanitizeFileName(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 180);
  return base || "archivo";
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    await verifySession(token);
  } catch {
    return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulario inválido." }, { status: 400 });
  }

  const patientId = String(form.get("patientId") ?? "").trim();
  const visitId = String(form.get("visitId") ?? "").trim();
  const file = form.get("file");

  if (!patientId || !visitId) {
    return NextResponse.json(
      { error: "Faltan patientId o visitId." },
      { status: 400 },
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 15 MB." },
      { status: 400 },
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      {
        error:
          "Tipo no permitido. Sube un PDF o una imagen (JPEG, PNG, GIF, WebP).",
      },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const original = sanitizeFileName(file.name);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const remoteName = `${patientId.slice(0, 8)}_${visitId.slice(0, 8)}_${stamp}_${original}`;

  try {
    const uploaded = await uploadBufferToCloudinary({
      buffer: buf,
      fileName: remoteName,
      mimeType,
    });

    const attachment = {
      id: crypto.randomUUID(),
      driveFileId: uploaded.publicId,
      name: original,
      mimeType,
      webViewLink: uploaded.secureUrl,
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json({ attachment });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    const msg =
      err instanceof Error && err.message.includes("CLOUDINARY_")
        ? "Cloudinary no está configurado en el servidor (variables de entorno)."
        : "No se pudo subir el archivo.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
