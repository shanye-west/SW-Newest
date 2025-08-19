-- CreateTable
CREATE TABLE "course_holes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "hole" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "strokeIndex" INTEGER NOT NULL,
    CONSTRAINT "course_holes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_events_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_HoleScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "hole" INTEGER NOT NULL,
    "strokes" INTEGER NOT NULL,
    "clientUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HoleScore_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_HoleScore" ("clientUpdatedAt", "createdAt", "entryId", "hole", "id", "strokes", "updatedAt") SELECT "clientUpdatedAt", "createdAt", "entryId", "hole", "id", "strokes", "updatedAt" FROM "HoleScore";
DROP TABLE "HoleScore";
ALTER TABLE "new_HoleScore" RENAME TO "HoleScore";
CREATE UNIQUE INDEX "HoleScore_entryId_hole_key" ON "HoleScore"("entryId", "hole");
CREATE TABLE "new_tournaments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "holes" INTEGER NOT NULL DEFAULT 18,
    "netAllowance" INTEGER NOT NULL DEFAULT 100,
    "passcode" TEXT NOT NULL,
    "potAmount" INTEGER,
    "participantsForSkins" INTEGER,
    "skinsCarry" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "tournaments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_tournaments" ("courseId", "createdAt", "date", "holes", "id", "name", "netAllowance", "participantsForSkins", "passcode", "potAmount", "skinsCarry", "updatedAt") SELECT "courseId", "createdAt", "date", "holes", "id", "name", "netAllowance", "participantsForSkins", "passcode", "potAmount", "skinsCarry", "updatedAt" FROM "tournaments";
DROP TABLE "tournaments";
ALTER TABLE "new_tournaments" RENAME TO "tournaments";
CREATE UNIQUE INDEX "tournaments_shareToken_key" ON "tournaments"("shareToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "course_holes_courseId_hole_key" ON "course_holes"("courseId", "hole");

-- CreateIndex
CREATE UNIQUE INDEX "course_holes_courseId_strokeIndex_key" ON "course_holes"("courseId", "strokeIndex");

-- CreateIndex
CREATE INDEX "audit_events_tournamentId_createdAt_idx" ON "audit_events"("tournamentId", "createdAt");
