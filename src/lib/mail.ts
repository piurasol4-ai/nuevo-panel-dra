import nodemailer from "nodemailer";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

export function getBaseUrl() {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS,
  );
}

export function getMailer() {
  const host = getEnv("SMTP_HOST");
  const port = Number(getEnv("SMTP_PORT"));
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    requireTLS: port === 587,
    tls: {
      minVersion: "TLSv1.2",
    },
  });
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const from = process.env.SMTP_FROM || getEnv("SMTP_USER");
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  if (!isSmtpConfigured()) {
    throw new Error("SMTP no configurado");
  }

  const transporter = getMailer();
  // Útil para diagnóstico: valida conexión/credenciales SMTP
  await transporter.verify();
  await transporter.sendMail({
    from,
    to,
    subject: "Verifica tu correo - Harmonia Center",
    text: `Hola ${name}.\n\nPara verificar tu correo, abre este enlace:\n${verifyUrl}\n\nSi no fuiste tú, ignora este mensaje.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Harmonia Center</h2>
        <p>Hola <b>${name}</b>,</p>
        <p>Para verificar tu correo, haz clic aquí:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p style="color:#64748b;font-size:12px;">Si no fuiste tú, ignora este mensaje.</p>
      </div>
    `,
  });
}

