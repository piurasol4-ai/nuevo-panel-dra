-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "recipeNumber" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosis" TEXT,
    "workPlan" TEXT,
    "prescriptionText" TEXT,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_recipeNumber_key" ON "Recipe"("recipeNumber");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
