-- Initial schema preceding the existing additive migrations.
-- CreateTable
CREATE TABLE "AdminUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL

);

-- CreateTable
CREATE TABLE "OrderCounter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "year" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0

);

-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "category" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "compareAt" REAL,
    "badge" TEXT,
    "colors" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "images" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "sizes" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "care" TEXT NOT NULL,
    "sizeChart" TEXT,
    "rating" REAL NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 10,
    CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "Review" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "author" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "productId" INTEGER NOT NULL,
    CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "Order" (
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

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "passwordHash" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "addresses" TEXT,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "totalSpend" REAL NOT NULL DEFAULT 0,
    "joined" TEXT NOT NULL,
    "lastOrder" TEXT,
    "lastLogin" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" DATETIME,
    "verificationCode" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'GUEST',
    "activationStatus" TEXT NOT NULL DEFAULT 'GUEST',
    "accountStatus" TEXT NOT NULL DEFAULT 'GUEST',
    "statusReason" TEXT,
    "suspendedAt" DATETIME,
    "bannedAt" DATETIME,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "companyName" TEXT,
    "vatId" TEXT

);

-- CreateTable
CREATE TABLE "Address" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "address" TEXT NOT NULL,
    "apartment" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "phone" TEXT,
    "phoneCountry" TEXT,
    "phoneDialCode" TEXT,
    "isDefaultShipping" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultBilling" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "ActivationToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "token" TEXT,
    "tokenHash" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "csrfTokenHash" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "revokeReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    CONSTRAINT "CustomerSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "EmailChangeToken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "newEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailChangeToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER,
    "eventType" TEXT NOT NULL,
    "actorType" TEXT,
    "actorId" TEXT,
    "orderId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerPaymentId" TEXT NOT NULL,
    "providerCustomerId" TEXT,
    "paymentMethodId" TEXT,
    "status" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

);

-- CreateTable
CREATE TABLE "FraudReview" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "reasons" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FraudReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "CustomerAdminNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerAdminNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "discount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiry" TEXT

);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "storeName" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "announcementText" TEXT NOT NULL,
    "announcementEnabled" BOOLEAN NOT NULL,
    "shippingThreshold" REAL NOT NULL,
    "complimentaryShippingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "taxRate" REAL NOT NULL,
    "orderNotificationEmail" TEXT DEFAULT 'owner@thevestigia.com',
    "adminPassword" TEXT NOT NULL

);

-- CreateTable
CREATE TABLE "JournalArticle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "readTime" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT NOT NULL

);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmationTokenHash" TEXT,
    "confirmationTokenExpiresAt" DATETIME,
    "unsubscribeTokenHash" TEXT,
    "confirmedAt" DATETIME,
    "unsubscribedAt" DATETIME,
    "createdAt" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "consentTimestamp" DATETIME,
    "consentVersion" TEXT

);

-- CreateTable
CREATE TABLE "NewsletterConsentEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subscriberId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT,
    "consentVersion" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsletterConsentEvent_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "NewsletterCampaign" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" DATETIME,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL

);

-- CreateTable
CREATE TABLE "ShippingRegion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL

);

-- CreateTable
CREATE TABLE "ShippingCountry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "regionId" INTEGER NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShippingCountry_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "ShippingRegion" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "ShippingMethod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "regionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "estimatedDays" TEXT NOT NULL,
    "freeShippingThreshold" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShippingMethod_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "ShippingRegion" ("id") ON DELETE CASCADE ON UPDATE CASCADE

);

-- CreateTable
CREATE TABLE "ShippingAnnouncement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "countryCode" TEXT,
    "message" TEXT NOT NULL,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

);

-- CreateTable
CREATE TABLE "ShippingLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

);

-- CreateTable
CREATE TABLE "BackupJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "backupId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "stage" TEXT NOT NULL DEFAULT 'Queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "storage" TEXT NOT NULL DEFAULT 'LOCAL',
    "archivePath" TEXT,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "integrity" TEXT NOT NULL DEFAULT 'PENDING',
    "checksum" TEXT,
    "manifest" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "restoreScope" TEXT,
    "restoreStatus" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "verifiedAt" DATETIME,
    "deletedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL

);

-- CreateTable
CREATE TABLE "BackupSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "automaticEnabled" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "dailyRetention" INTEGER NOT NULL DEFAULT 14,
    "weeklyRetention" INTEGER NOT NULL DEFAULT 8,
    "monthlyRetention" INTEGER NOT NULL DEFAULT 12,
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "storagePath" TEXT,
    "offsiteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "offsitePath" TEXT,
    "encryptionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "verifyAfterBackup" BOOLEAN NOT NULL DEFAULT true,
    "targetRpoHours" INTEGER NOT NULL DEFAULT 24,
    "maintenanceModeOnRestore" BOOLEAN NOT NULL DEFAULT true,
    "preRestoreSafetyBackup" BOOLEAN NOT NULL DEFAULT true,
    "requireRestoreConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSuccess" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL

);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_color_size_key" ON "Inventory"("productId", "color", "size");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationToken_token_key" ON "ActivationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "VerificationToken_customerId_idx" ON "VerificationToken"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_customerId_idx" ON "PasswordResetToken"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_sessionTokenHash_key" ON "CustomerSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "CustomerSession_customerId_idx" ON "CustomerSession"("customerId");

-- CreateIndex
CREATE INDEX "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailChangeToken_tokenHash_key" ON "EmailChangeToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailChangeToken_customerId_idx" ON "EmailChangeToken"("customerId");

-- CreateIndex
CREATE INDEX "SecurityEvent_customerId_idx" ON "SecurityEvent"("customerId");

-- CreateIndex
CREATE INDEX "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");

-- CreateIndex
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_providerEventId_key" ON "WebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "FraudReview_orderId_idx" ON "FraudReview"("orderId");

-- CreateIndex
CREATE INDEX "FraudReview_riskLevel_idx" ON "FraudReview"("riskLevel");

-- CreateIndex
CREATE INDEX "CustomerAdminNote_customerId_idx" ON "CustomerAdminNote"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmationTokenHash_key" ON "NewsletterSubscriber"("confirmationTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeTokenHash_key" ON "NewsletterSubscriber"("unsubscribeTokenHash");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_createdAt_idx" ON "NewsletterSubscriber"("createdAt");

-- CreateIndex
CREATE INDEX "NewsletterConsentEvent_subscriberId_idx" ON "NewsletterConsentEvent"("subscriberId");

-- CreateIndex
CREATE INDEX "NewsletterConsentEvent_eventType_idx" ON "NewsletterConsentEvent"("eventType");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_status_idx" ON "NewsletterCampaign"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRegion_name_key" ON "ShippingRegion"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingCountry_countryCode_key" ON "ShippingCountry"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "BackupJob_backupId_key" ON "BackupJob"("backupId");

-- CreateIndex
CREATE INDEX "BackupJob_status_idx" ON "BackupJob"("status");

-- CreateIndex
CREATE INDEX "BackupJob_type_idx" ON "BackupJob"("type");

-- CreateIndex
CREATE INDEX "BackupJob_createdAt_idx" ON "BackupJob"("createdAt");

