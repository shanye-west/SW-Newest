-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN "grossPrize" INTEGER;
ALTER TABLE "tournaments" ADD COLUMN "netPrize" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "courseHandicap" INTEGER NOT NULL,
    "playingCH" INTEGER NOT NULL,
    "groupId" TEXT,
    "hasPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entries_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "entries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "entries_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_entries" ("courseHandicap", "createdAt", "groupId", "id", "playerId", "playingCH", "tournamentId") SELECT "courseHandicap", "createdAt", "groupId", "id", "playerId", "playingCH", "tournamentId" FROM "entries";
DROP TABLE "entries";
ALTER TABLE "new_entries" RENAME TO "entries";
CREATE UNIQUE INDEX "entries_tournamentId_playerId_key" ON "entries"("tournamentId", "playerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
