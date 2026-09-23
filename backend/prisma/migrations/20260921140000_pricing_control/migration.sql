-- AlterTable
ALTER TABLE "Product" ADD COLUMN "baseCurrency" TEXT;
ALTER TABLE "Product" ADD COLUMN "basePriceMinor" INTEGER;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "preferredCurrency" TEXT;
ALTER TABLE "Customer" ADD COLUMN "preferredMarket" TEXT;

-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN "amountMinor" INTEGER;
ALTER TABLE "PromoCode" ADD COLUMN "currency" TEXT;
ALTER TABLE "PromoCode" ADD COLUMN "percentageBps" INTEGER;

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "taxJurisdiction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductPriceHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "variantId" TEXT,
    "market" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "oldAmountMinor" INTEGER,
    "newAmountMinor" INTEGER NOT NULL,
    "priceVersion" INTEGER NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ShippingPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shippingMethodId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "freeThresholdMinor" INTEGER
);

-- CreateTable
CREATE TABLE "CheckoutSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currency" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "priceListVersion" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'QUOTED',
    "providerPaymentId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PricingAlert" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'CRITICAL',
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceCurrency" TEXT NOT NULL,
    "targetCurrency" TEXT NOT NULL,
    "rate" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL,
    "createdBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeHash" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balanceMinor" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "priceListId" TEXT,
    "priceVersion" INTEGER NOT NULL DEFAULT 1,
    "mode" TEXT NOT NULL DEFAULT 'FIXED',
    "conversion" TEXT,
    "priceMinor" INTEGER NOT NULL,
    "compareAtMinor" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductPrice" ("compareAtMinor", "createdAt", "currency", "id", "isActive", "priceMinor", "productId", "updatedAt") SELECT "compareAtMinor", "createdAt", "currency", "id", "isActive", "priceMinor", "productId", "updatedAt" FROM "ProductPrice";
DROP TABLE "ProductPrice";
ALTER TABLE "new_ProductPrice" RENAME TO "ProductPrice";
CREATE INDEX "ProductPrice_currency_idx" ON "ProductPrice"("currency");
CREATE UNIQUE INDEX "ProductPrice_productId_currency_key" ON "ProductPrice"("productId", "currency");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT,
    "customerId" INTEGER,
    "customer" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subtotal" REAL NOT NULL,
    "shipping" REAL NOT NULL,
    "tax" REAL NOT NULL,
    "total" REAL NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "trackingNumber" TEXT,
    "courier" TEXT,
    "stripePaymentIntentId" TEXT,
    "currency" TEXT NOT NULL,
    "market" TEXT,
    "priceListId" TEXT,
    "priceListVersion" INTEGER,
    "paymentStatus" TEXT NOT NULL DEFAULT 'REQUIRES_REVIEW',
    "pricingVersion" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "taxRateBps" INTEGER,
    "checkoutId" TEXT,
    "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
    "shippingMinor" INTEGER NOT NULL DEFAULT 0,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    "shippingRegion" TEXT,
    "shippingCountry" TEXT,
    "shippingMethod" TEXT,
    "shippingCost" REAL,
    "estimatedDelivery" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'GUEST',
    "billingAddress" TEXT,
    "sameAsShipping" BOOLEAN NOT NULL DEFAULT true,
    "giftOrder" BOOLEAN NOT NULL DEFAULT false,
    "giftMessage" TEXT,
    "companyName" TEXT,
    "vatId" TEXT,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("address", "billingAddress", "companyName", "courier", "currency", "customer", "customerId", "customerType", "date", "email", "estimatedDelivery", "giftMessage", "giftOrder", "id", "invoiceNumber", "notes", "phone", "sameAsShipping", "shipping", "shippingCost", "shippingCountry", "shippingMethod", "shippingMinor", "shippingRegion", "status", "stripePaymentIntentId", "subtotal", "subtotalMinor", "tax", "taxMinor", "total", "totalMinor", "trackingNumber", "vatId") SELECT "address", "billingAddress", "companyName", "courier", "currency", "customer", "customerId", "customerType", "date", "email", "estimatedDelivery", "giftMessage", "giftOrder", "id", "invoiceNumber", "notes", "phone", "sameAsShipping", "shipping", "shippingCost", "shippingCountry", "shippingMethod", "shippingMinor", "shippingRegion", "status", "stripePaymentIntentId", "subtotal", "subtotalMinor", "tax", "taxMinor", "total", "totalMinor", "trackingNumber", "vatId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_checkoutId_key" ON "Order"("checkoutId");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_email_idx" ON "Order"("email");
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
CREATE TABLE "new_OrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL DEFAULT 0,
    "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "skuSnapshot" TEXT,
    "variantId" TEXT,
    "priceListId" TEXT,
    "priceVersion" INTEGER,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("color", "currency", "id", "image", "orderId", "price", "productId", "productName", "quantity", "size", "subtotalMinor", "unitPriceMinor") SELECT "color", "currency", "id", "image", "orderId", "price", "productId", "productName", "quantity", "size", "subtotalMinor", "unitPriceMinor" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PriceList_market_key" ON "PriceList"("market");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingPrice_shippingMethodId_currency_key" ON "ShippingPrice"("shippingMethodId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSnapshot_providerPaymentId_key" ON "CheckoutSnapshot"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingAlert_key_key" ON "PricingAlert"("key");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_codeHash_key" ON "GiftCard"("codeHash");

INSERT INTO "PriceList" ("id","name","market","currency","status","taxJurisdiction","updatedAt") VALUES ('JP_RETAIL','Japan','JP','JPY','DRAFT','JP',CURRENT_TIMESTAMP);
UPDATE "ProductPrice" SET "priceListId"='JP_RETAIL' WHERE "currency"='JPY';

INSERT INTO "PriceList" ("id","name","market","currency","status","taxJurisdiction","updatedAt") VALUES ('EU_RETAIL','European Union','EU','EUR','DRAFT','AT,BE,BG,CY,EE,FI,FR,DE,GR,IE,IT,HR,LV,LT,LU,MT,NL,PT,SK,SI,ES',CURRENT_TIMESTAMP);
UPDATE "ProductPrice" SET "priceListId"='EU_RETAIL' WHERE "currency"='EUR';

INSERT INTO "PriceList" ("id","name","market","currency","status","taxJurisdiction","updatedAt") VALUES ('US_RETAIL','United States','US','USD','DRAFT','US',CURRENT_TIMESTAMP);
UPDATE "ProductPrice" SET "priceListId"='US_RETAIL' WHERE "currency"='USD';

INSERT INTO "PriceList" ("id","name","market","currency","status","taxJurisdiction","updatedAt") VALUES ('UK_RETAIL','United Kingdom','UK','GBP','DRAFT','GB',CURRENT_TIMESTAMP);
UPDATE "ProductPrice" SET "priceListId"='UK_RETAIL' WHERE "currency"='GBP';

CREATE TRIGGER "ProductPrice_currency_insert" BEFORE INSERT ON "ProductPrice" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "ProductPrice_currency_update" BEFORE UPDATE ON "ProductPrice" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "Order_currency_insert" BEFORE INSERT ON "Order" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "Order_currency_update" BEFORE UPDATE ON "Order" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "OrderItem_currency_insert" BEFORE INSERT ON "OrderItem" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "OrderItem_currency_update" BEFORE UPDATE ON "OrderItem" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "Payment_currency_insert" BEFORE INSERT ON "Payment" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "Payment_currency_update" BEFORE UPDATE ON "Payment" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "Refund_currency_insert" BEFORE INSERT ON "Refund" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "Refund_currency_update" BEFORE UPDATE ON "Refund" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "ShippingPrice_currency_insert" BEFORE INSERT ON "ShippingPrice" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "ShippingPrice_currency_update" BEFORE UPDATE ON "ShippingPrice" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "GiftCard_currency_insert" BEFORE INSERT ON "GiftCard" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "GiftCard_currency_update" BEFORE UPDATE ON "GiftCard" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "PriceList_currency_insert" BEFORE INSERT ON "PriceList" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "PriceList_currency_update" BEFORE UPDATE ON "PriceList" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "CheckoutSnapshot_currency_insert" BEFORE INSERT ON "CheckoutSnapshot" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "CheckoutSnapshot_currency_update" BEFORE UPDATE ON "CheckoutSnapshot" WHEN NEW.currency IS NULL OR NEW.currency NOT IN ('JPY','EUR','USD','GBP') BEGIN SELECT RAISE(ABORT,'Unsupported financial currency'); END;

CREATE TRIGGER "ProductPrice_money_insert" BEFORE INSERT ON "ProductPrice" WHEN (typeof(NEW.priceMinor) != 'integer' OR NEW.priceMinor < 0 OR NEW.priceMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "ProductPrice_money_update" BEFORE UPDATE ON "ProductPrice" WHEN (typeof(NEW.priceMinor) != 'integer' OR NEW.priceMinor < 0 OR NEW.priceMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "Order_money_insert" BEFORE INSERT ON "Order" WHEN (typeof(NEW.subtotalMinor) != 'integer' OR NEW.subtotalMinor < 0 OR NEW.subtotalMinor > 9007199254740991) OR (typeof(NEW.discountMinor) != 'integer' OR NEW.discountMinor < 0 OR NEW.discountMinor > 9007199254740991) OR (typeof(NEW.shippingMinor) != 'integer' OR NEW.shippingMinor < 0 OR NEW.shippingMinor > 9007199254740991) OR (typeof(NEW.taxMinor) != 'integer' OR NEW.taxMinor < 0 OR NEW.taxMinor > 9007199254740991) OR (typeof(NEW.totalMinor) != 'integer' OR NEW.totalMinor < 0 OR NEW.totalMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "Order_money_update" BEFORE UPDATE ON "Order" WHEN (typeof(NEW.subtotalMinor) != 'integer' OR NEW.subtotalMinor < 0 OR NEW.subtotalMinor > 9007199254740991) OR (typeof(NEW.discountMinor) != 'integer' OR NEW.discountMinor < 0 OR NEW.discountMinor > 9007199254740991) OR (typeof(NEW.shippingMinor) != 'integer' OR NEW.shippingMinor < 0 OR NEW.shippingMinor > 9007199254740991) OR (typeof(NEW.taxMinor) != 'integer' OR NEW.taxMinor < 0 OR NEW.taxMinor > 9007199254740991) OR (typeof(NEW.totalMinor) != 'integer' OR NEW.totalMinor < 0 OR NEW.totalMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "OrderItem_money_insert" BEFORE INSERT ON "OrderItem" WHEN (typeof(NEW.unitPriceMinor) != 'integer' OR NEW.unitPriceMinor < 0 OR NEW.unitPriceMinor > 9007199254740991) OR (typeof(NEW.subtotalMinor) != 'integer' OR NEW.subtotalMinor < 0 OR NEW.subtotalMinor > 9007199254740991) OR (typeof(NEW.discountMinor) != 'integer' OR NEW.discountMinor < 0 OR NEW.discountMinor > 9007199254740991) OR (typeof(NEW.taxMinor) != 'integer' OR NEW.taxMinor < 0 OR NEW.taxMinor > 9007199254740991) OR (typeof(NEW.totalMinor) != 'integer' OR NEW.totalMinor < 0 OR NEW.totalMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "OrderItem_money_update" BEFORE UPDATE ON "OrderItem" WHEN (typeof(NEW.unitPriceMinor) != 'integer' OR NEW.unitPriceMinor < 0 OR NEW.unitPriceMinor > 9007199254740991) OR (typeof(NEW.subtotalMinor) != 'integer' OR NEW.subtotalMinor < 0 OR NEW.subtotalMinor > 9007199254740991) OR (typeof(NEW.discountMinor) != 'integer' OR NEW.discountMinor < 0 OR NEW.discountMinor > 9007199254740991) OR (typeof(NEW.taxMinor) != 'integer' OR NEW.taxMinor < 0 OR NEW.taxMinor > 9007199254740991) OR (typeof(NEW.totalMinor) != 'integer' OR NEW.totalMinor < 0 OR NEW.totalMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "Payment_money_insert" BEFORE INSERT ON "Payment" WHEN (typeof(NEW.amountMinor) != 'integer' OR NEW.amountMinor < 0 OR NEW.amountMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "Payment_money_update" BEFORE UPDATE ON "Payment" WHEN (typeof(NEW.amountMinor) != 'integer' OR NEW.amountMinor < 0 OR NEW.amountMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "Refund_money_insert" BEFORE INSERT ON "Refund" WHEN (typeof(NEW.amountMinor) != 'integer' OR NEW.amountMinor < 0 OR NEW.amountMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "Refund_money_update" BEFORE UPDATE ON "Refund" WHEN (typeof(NEW.amountMinor) != 'integer' OR NEW.amountMinor < 0 OR NEW.amountMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "ShippingPrice_money_insert" BEFORE INSERT ON "ShippingPrice" WHEN (typeof(NEW.amountMinor) != 'integer' OR NEW.amountMinor < 0 OR NEW.amountMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "ShippingPrice_money_update" BEFORE UPDATE ON "ShippingPrice" WHEN (typeof(NEW.amountMinor) != 'integer' OR NEW.amountMinor < 0 OR NEW.amountMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "GiftCard_money_insert" BEFORE INSERT ON "GiftCard" WHEN (typeof(NEW.balanceMinor) != 'integer' OR NEW.balanceMinor < 0 OR NEW.balanceMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "GiftCard_money_update" BEFORE UPDATE ON "GiftCard" WHEN (typeof(NEW.balanceMinor) != 'integer' OR NEW.balanceMinor < 0 OR NEW.balanceMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "CheckoutSnapshot_money_insert" BEFORE INSERT ON "CheckoutSnapshot" WHEN (typeof(NEW.totalMinor) != 'integer' OR NEW.totalMinor < 0 OR NEW.totalMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "CheckoutSnapshot_money_update" BEFORE UPDATE ON "CheckoutSnapshot" WHEN (typeof(NEW.totalMinor) != 'integer' OR NEW.totalMinor < 0 OR NEW.totalMinor > 9007199254740991) BEGIN SELECT RAISE(ABORT,'Invalid integer money'); END;

CREATE TRIGGER "Order_immutable_money" BEFORE UPDATE ON "Order" WHEN OLD.pricingVersion > 0 AND (NEW.currency != OLD.currency OR NEW.totalMinor != OLD.totalMinor OR NEW.subtotalMinor != OLD.subtotalMinor OR NEW.shippingMinor != OLD.shippingMinor OR NEW.discountMinor != OLD.discountMinor OR NEW.taxMinor != OLD.taxMinor) BEGIN SELECT RAISE(ABORT,'Order money is immutable'); END;
CREATE TRIGGER "OrderItem_matching_currency" BEFORE INSERT ON "OrderItem" WHEN NEW.currency != (SELECT currency FROM "Order" WHERE id=NEW.orderId) BEGIN SELECT RAISE(ABORT,'Order item currency mismatch'); END;
CREATE TRIGGER "ProductPrice_matching_list" BEFORE INSERT ON "ProductPrice" WHEN NEW.priceListId IS NULL OR NOT EXISTS (SELECT 1 FROM "PriceList" WHERE id=NEW.priceListId AND currency=NEW.currency) BEGIN SELECT RAISE(ABORT,'Price list currency mismatch'); END;
CREATE TRIGGER "ProductPrice_matching_list_update" BEFORE UPDATE ON "ProductPrice" WHEN NEW.priceListId IS NULL OR NOT EXISTS (SELECT 1 FROM "PriceList" WHERE id=NEW.priceListId AND currency=NEW.currency) BEGIN SELECT RAISE(ABORT,'Price list currency mismatch'); END;
CREATE TRIGGER "Refund_matching_currency" BEFORE INSERT ON "Refund" WHEN NOT EXISTS (SELECT 1 FROM "Order" WHERE id=NEW.orderId AND currency=NEW.currency) BEGIN SELECT RAISE(ABORT,'Refund currency mismatch'); END;
