CREATE TABLE "HomepageMedia" (
  "url" TEXT NOT NULL PRIMARY KEY,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "bytes" INTEGER NOT NULL,
  "mime" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL
);
