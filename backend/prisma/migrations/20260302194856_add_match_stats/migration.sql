/*
  Warnings:

  - A unique constraint covering the columns `[year,leagueId]` on the table `Season` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "MatchStats" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "homeShots" INTEGER,
    "awayShots" INTEGER,
    "homeShotsOnTarget" INTEGER,
    "awayShotsOnTarget" INTEGER,
    "homeCorners" INTEGER,
    "awayCorners" INTEGER,
    "homeFouls" INTEGER,
    "awayFouls" INTEGER,
    "homeYellowCards" INTEGER,
    "awayYellowCards" INTEGER,

    CONSTRAINT "MatchStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchStats_matchId_key" ON "MatchStats"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_year_leagueId_key" ON "Season"("year", "leagueId");

-- AddForeignKey
ALTER TABLE "MatchStats" ADD CONSTRAINT "MatchStats_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
