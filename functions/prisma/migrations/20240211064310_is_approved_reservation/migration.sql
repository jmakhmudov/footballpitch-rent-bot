-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "start_datetime" DATETIME NOT NULL,
    "end_datetime" DATETIME NOT NULL,
    "price" REAL NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Reservation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("created_at", "end_datetime", "id", "price", "start_datetime", "user_id") SELECT "created_at", "end_datetime", "id", "price", "start_datetime", "user_id" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
CREATE UNIQUE INDEX "Reservation_id_key" ON "Reservation"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
