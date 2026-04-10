import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Readable } from "stream";
import busboy from "busboy";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

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

/** Algunos navegadores envían PDF como octet-stream o sin Content-Type en la parte. */
function normalizeMimeType(mimeType: string, filename: string): string {
  const t = (mimeType ?? "").trim().toLowerCase();
  if (t && t !== "application/octet-stream") return t;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return t || "application/octet-stream";
}

/**
 * `request.formData()` de Undici/Next falla con algunos PDF (error genérico "Formulario inválido").
 * Busboy parsea el multipart de forma fiable en Node.
 */
async function parseMultipartUpload(request: NextRequest): Promise<{
  patientId: string;
  visitId: string;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().includes("multipart/form-data")) {
    throw new Error("multipart_required");
  }

  const body = request.body;
  if (!body) {
    throw new Error("no_body");
  }

  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: { "content-type": contentType },
      limits: {
        fileSize: MAX_BYTES,
        fieldSize: 64 * 1024,
        files: 2,
        fields: 10,
      },
    });

    const fields: Record<string, string> = {};
    const chunks: Buffer[] = [];
    let fileName = "";
    let mimeType = "application/octet-stream";
    let sawFileField = false;
    let fileRejected = false;

    bb.on("file", (name, stream, info) => {
      if (name !== "file") {
        stream.resume();
        return;
      }
      sawFileField = true;
      fileName = info.filename || "archivo";
      mimeType = info.mimeType || "application/octet-stream";

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      stream.on("limit", () => {
        fileRejected = true;
        reject(new Error("file_too_large"));
      });
      stream.on("error", (err) => {
        fileRejected = true;
        reject(err);
      });
    });

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("error", (err) => {
      if (!fileRejected) reject(err);
    });

    bb.on("close", () => {
      if (fileRejected) return;
      if (!sawFileField) {
        reject(new Error("no_file"));
        return;
      }
      const patientId = (fields.patientId ?? "").trim();
      const visitId = (fields.visitId ?? "").trim();
      const buffer = Buffer.concat(chunks);
      resolve({
        patientId,
        visitId,
        buffer,
        originalName: fileName,
        mimeType: normalizeMimeType(mimeType, fileName),
      });
    });

    try {
      Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]).pipe(bb);
    } catch (e) {
      reject(e);
    }
  });
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

  let patientId: string;
  let visitId: string;
  let buf: Buffer;
  let original: string;
  let mimeType: string;

  try {
    const parsed = await parseMultipartUpload(request);
    patientId = parsed.patientId;
    visitId = parsed.visitId;
    buf = parsed.buffer;
    original = sanitizeFileName(parsed.originalName);
    mimeType = parsed.mimeType;
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    console.error("Multipart parse error:", err);
    if (code === "multipart_required" || code === "no_body") {
      return NextResponse.json(
        { error: "No se pudo leer el formulario de subida." },
        { status: 400 },
      );
    }
    if (code === "no_file") {
      return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
    }
    if (code === "file_too_large") {
      return NextResponse.json(
        { error: "El archivo supera el límite de 15 MB." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo procesar el archivo. Prueba con otro PDF o comprime el documento." },
      { status: 400 },
    );
  }

  if (!patientId || !visitId) {
    return NextResponse.json(
      { error: "Faltan patientId o visitId." },
      { status: 400 },
    );
  }

  if (buf.length === 0) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
  }

  if (buf.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 15 MB." },
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      {
        error:
          "Tipo no permitido. Sube un PDF o una imagen (JPEG, PNG, GIF, WebP).",
      },
      { status: 400 },
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const remoteName = `${patientId.slice(0, 8)}_${visitId.slice(0, 8)}_${stamp}_${original}`;

  try {
    const uploaded = await uploadBufferToCloudinary({
      buffer: buf,
      fileName: remoteName,
      mimeType,
    });
    if (!uploaded.secureUrl) {
      throw new Error("Cloudinary no devolvió secure_url.");
    }

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
