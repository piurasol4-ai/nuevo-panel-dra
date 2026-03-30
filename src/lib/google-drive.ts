import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

function parseServiceAccountJson(): ServiceAccountCredentials {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error(
      "Falta GOOGLE_SERVICE_ACCOUNT_JSON (JSON de cuenta de servicio de Google Cloud).",
    );
  }
  try {
    const parsed = JSON.parse(raw) as ServiceAccountCredentials & {
      type?: string;
    };
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("JSON inválido: faltan client_email o private_key.");
    }
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido. Pégalo como una sola línea en Railway o usa comillas escapadas.",
    );
  }
}

export function getDriveFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!id) {
    throw new Error(
      "Falta GOOGLE_DRIVE_FOLDER_ID (ID de la carpeta de Drive donde se guardarán los adjuntos).",
    );
  }
  return id;
}

let cachedDrive: drive_v3.Drive | null = null;

export async function getDriveClient(): Promise<drive_v3.Drive> {
  if (cachedDrive) return cachedDrive;
  const creds = parseServiceAccountJson();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: DRIVE_SCOPES,
  });
  await auth.authorize();
  cachedDrive = google.drive({ version: "v3", auth });
  return cachedDrive;
}

export async function uploadFileToDrive(params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<{
  id: string;
  name: string;
  mimeType: string | null;
  size: string | null;
  webViewLink: string | null;
}> {
  const drive = await getDriveClient();
  const folderId = getDriveFolderId();

  const res = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: params.buffer,
    },
    fields: "id,name,mimeType,size,webViewLink",
    supportsAllDrives: true,
  });

  const data = res.data;
  if (!data.id) {
    throw new Error("Drive no devolvió id del archivo.");
  }

  let webViewLink = data.webViewLink ?? null;
  if (!webViewLink) {
    const meta = await drive.files.get({
      fileId: data.id,
      fields: "webViewLink",
      supportsAllDrives: true,
    });
    webViewLink = meta.data.webViewLink ?? null;
  }

  return {
    id: data.id,
    name: data.name ?? params.fileName,
    mimeType: data.mimeType ?? params.mimeType,
    size: data.size ?? String(params.buffer.length),
    webViewLink,
  };
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = await getDriveClient();
  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });
}
