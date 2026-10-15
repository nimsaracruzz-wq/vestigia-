CREATE TABLE "TrafficSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "visitorId" TEXT NOT NULL,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "path" TEXT NOT NULL,
  "device" TEXT NOT NULL,
  "referrer" TEXT NOT NULL
);
CREATE INDEX "TrafficSession_lastSeen_idx" ON "TrafficSession"("lastSeen");
CREATE TABLE "TrafficPageView" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "device" TEXT NOT NULL,
  "referrer" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "TrafficPageView_createdAt_idx" ON "TrafficPageView"("createdAt");
