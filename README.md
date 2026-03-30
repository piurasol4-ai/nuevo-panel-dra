This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy en Railway

Este proyecto ya está preparado para desplegarse en Railway.

### 1) Crear proyecto y conectar repositorio
- En Railway, crea un nuevo proyecto y conecta este repo.

### 2) Provisionar PostgreSQL
- Agrega un servicio PostgreSQL dentro del mismo proyecto.
- Railway inyectará `DATABASE_URL` automáticamente (o configúrala manualmente si usas DB externa).

### 3) Variables de entorno
- Copia los valores desde `.env.example` y completa los reales:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `APP_BASE_URL`
  - `DECOLECTA_API_TOKEN` (si aplica)
  - `SMTP_*` (si aplica)
  - **Adjuntos en Historias clínicas (Google Drive):**
    - `GOOGLE_SERVICE_ACCOUNT_JSON`: JSON de una **cuenta de servicio** de Google Cloud con la API de Drive habilitada.
    - `GOOGLE_DRIVE_FOLDER_ID`: ID de la carpeta donde se guardarán PDF/imágenes. Comparte esa carpeta con el correo `client_email` del JSON (rol **Editor**).

### 4) Build y arranque
- Railway usa `railway.json`:
  - build: `npm run build`
  - start: `npm run start:railway`
- En el arranque se ejecuta `prisma migrate deploy` antes de iniciar Next.js.

### 5) Verificación
- Abre la URL pública del deploy.
- Verifica login, agenda, historias clínicas y facturación.
