-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifyTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifyTokenHash" TEXT;
