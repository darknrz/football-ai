/*
  Warnings:

  - Changed the type of `matchId` on the `Prediction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Prediction" DROP COLUMN "matchId",
ADD COLUMN     "matchId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
