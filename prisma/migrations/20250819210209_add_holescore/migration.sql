-- CreateTable
CREATE TABLE "HoleScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "hole" INTEGER NOT NULL,
    "strokes" INTEGER NOT NULL,
    "clientUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HoleScore_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HoleScore_entryId_hole_key" ON "HoleScore"("entryId", "hole");
