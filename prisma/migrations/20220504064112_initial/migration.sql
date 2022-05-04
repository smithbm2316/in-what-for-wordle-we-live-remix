-- CreateTable
CREATE TABLE "Team" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "imgUrl" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Position" (
    "position" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "imgUrl" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "dob" TEXT NOT NULL,
    "height" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "fifaRating" INTEGER NOT NULL,
    "fifaPotential" INTEGER NOT NULL,
    "jerseyNumber" INTEGER NOT NULL,
    "currentTeam" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_PlayerToPosition" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Position" ("position") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PlayerToTeam" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    FOREIGN KEY ("A") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "Team" ("name") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Position_position_key" ON "Position"("position");

-- CreateIndex
CREATE UNIQUE INDEX "_PlayerToPosition_AB_unique" ON "_PlayerToPosition"("A", "B");

-- CreateIndex
CREATE INDEX "_PlayerToPosition_B_index" ON "_PlayerToPosition"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_PlayerToTeam_AB_unique" ON "_PlayerToTeam"("A", "B");

-- CreateIndex
CREATE INDEX "_PlayerToTeam_B_index" ON "_PlayerToTeam"("B");
