ALTER TABLE "PromoCode" ADD COLUMN "target" TEXT NOT NULL DEFAULT 'items';
UPDATE "PromoCode" SET "percentageBps" = CAST(ROUND("discount" * 100) AS INTEGER)
WHERE "type" = 'percentage' AND "percentageBps" IS NULL AND "discount" > 0 AND "discount" <= 100;
ALTER TABLE "Order" ADD COLUMN "shippingBaseMinor" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "shippingDiscountMinor" INTEGER NOT NULL DEFAULT 0;
UPDATE "Order" SET "shippingBaseMinor" = "shippingMinor";
CREATE TABLE "CouponReservation" (
  "checkoutId" TEXT NOT NULL PRIMARY KEY,
  "promoId" INTEGER NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'RESERVED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CouponReservation_promoId_state_idx" ON "CouponReservation"("promoId", "state");
