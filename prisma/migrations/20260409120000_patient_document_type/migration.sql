-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'dni';

-- DropIndex
DROP INDEX IF EXISTS "Patient_dni_key";

-- CreateIndex
CREATE UNIQUE INDEX "Patient_documentType_dni_key" ON "Patient"("documentType", "dni");
