CREATE TABLE "ProductSearchQuery" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "query" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ProductSearchQuery_createdAt_idx" ON "ProductSearchQuery"("createdAt");
CREATE INDEX "ProductSearchQuery_query_createdAt_idx" ON "ProductSearchQuery"("query", "createdAt");
