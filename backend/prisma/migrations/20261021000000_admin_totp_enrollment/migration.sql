ALTER TABLE "AdminUser" ADD COLUMN "totpSecretCiphertext" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN "totpPendingSecretCiphertext" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
