-- A zero price represents a currency that is not sold. Existing rows created
-- before this rule was enforced must be hidden from storefront and checkout.
UPDATE "ProductPrice"
SET "isActive" = 0
WHERE "priceMinor" = 0 AND "isActive" = 1;
