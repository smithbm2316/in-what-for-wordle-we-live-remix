/*
  Warnings:

  - You are about to drop the column `GuessId` on the `Player` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "imgUrl" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "dob" DATETIME NOT NULL,
    "height" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "fifaRating" INTEGER NOT NULL,
    "fifaPotential" INTEGER NOT NULL,
    "jerseyNumber" INTEGER NOT NULL,
    "currentTeam" TEXT NOT NULL
);
INSERT INTO "new_Player" ("age", "currentTeam", "dob", "fifaPotential", "fifaRating", "height", "id", "imgUrl", "jerseyNumber", "name", "weight") SELECT "age", "currentTeam", "dob", "fifaPotential", "fifaRating", "height", "id", "imgUrl", "jerseyNumber", "name", "weight" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
