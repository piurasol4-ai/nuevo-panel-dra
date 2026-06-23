-- Índices para acelerar filtros por fecha, paciente y citas
CREATE INDEX "Patient_createdAt_idx" ON "Patient"("createdAt");
CREATE INDEX "Patient_birthDate_idx" ON "Patient"("birthDate");
CREATE INDEX "Appointment_startAt_idx" ON "Appointment"("startAt");
CREATE INDEX "Appointment_patientId_startAt_idx" ON "Appointment"("patientId", "startAt");
CREATE INDEX "ClinicalNote_patientId_idx" ON "ClinicalNote"("patientId");
