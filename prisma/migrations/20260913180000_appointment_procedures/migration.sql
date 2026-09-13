-- Múltiples tratamientos por cita
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "procedures" JSONB;

-- Rellenar con el procedimiento histórico (type) cuando esté vacío
UPDATE "Appointment"
SET "procedures" = jsonb_build_array("type")
WHERE "procedures" IS NULL
  AND "type" IS NOT NULL
  AND btrim("type") <> '';
