-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "full_name" TEXT,
    "phone_number" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isDev" BOOLEAN NOT NULL DEFAULT false,
    "isLogged" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("full_name", "id", "isAdmin", "isDev", "phone_number") SELECT "full_name", "id", "isAdmin", "isDev", "phone_number" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
