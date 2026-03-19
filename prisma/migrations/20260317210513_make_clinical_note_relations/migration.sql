-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "identificationExtra" TEXT,
    "personalHistory" TEXT,
    "familyHistory" TEXT,
    "consultationReason" TEXT,
    "currentIllness" TEXT,
    "physicalExam" TEXT,
    "diagnostics" TEXT,
    "diagnosis" TEXT,
    "treatmentPlan" TEXT,
    "evolutionNotes" TEXT,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
