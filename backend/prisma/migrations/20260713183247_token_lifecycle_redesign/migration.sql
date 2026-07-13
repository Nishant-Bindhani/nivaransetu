/*
  Warnings:

  - You are about to drop the column `usedAt` on the `refresh_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `usedAt` on the `verification_tokens` table. All the data in the column will be lost.
  - Added the required column `familyId` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "usedAt",
ADD COLUMN     "familyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "verification_tokens" DROP COLUMN "usedAt";

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");
