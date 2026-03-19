/*
  Warnings:

  - A unique constraint covering the columns `[historyNumber]` on the table `ClinicalNote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ClinicalNote" ADD COLUMN     "historyNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalNote_historyNumber_key" ON "ClinicalNote"("historyNumber");
