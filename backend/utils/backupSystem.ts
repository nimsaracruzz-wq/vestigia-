import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';

export const BACKUP_FORMAT_VERSION = '1.0.0';
export const BACKUP_CHECKSUM_ALGORITHM = 'sha256';

export type BackupType = 'DATABASE' | 'MEDIA' | 'FULL' | 'CONFIGURATION';

export type BackupManifest = {
  backupId: string;
  backupType: BackupType;
  createdAt: string;
  createdBy: string;
  applicationVersion: string;
  databaseEngine: string;
  schemaVersion: string;
  backupFormatVersion: string;
  includedDatabase: boolean;
  includedMedia: boolean;
  includedConfiguration: boolean;
  fileCount: number;
  databaseSize: number;
  mediaSize: number;
  checksumAlgorithm: string;
  encrypted: boolean;
  secretsExcluded: string[];
};

type CreateBackupOptions = {
  prisma: any;
  backupId: string;
  type: BackupType;
  createdBy: string;
  rootDir: string;
  uploadDir: string;
  backupStorageDir: string;
  encryptionSecret: string;
};

type BackupFile = {
  path: string;
  size: number;
  sha256: string;
  contentBase64: string;
};

const DATA_MODELS = [
  { delegate: 'priceList', name: 'PriceList' },
  { delegate: 'productPriceHistory', name: 'ProductPriceHistory' },
  { delegate: 'shippingPrice', name: 'ShippingPrice' },
  { delegate: 'checkoutSnapshot', name: 'CheckoutSnapshot' },
  { delegate: 'refund', name: 'Refund' },
  { delegate: 'pricingAlert', name: 'PricingAlert' },
  { delegate: 'exchangeRate', name: 'ExchangeRate' },
  { delegate: 'giftCard', name: 'GiftCard' },
  { delegate: 'adminUser', name: 'AdminUser' },
  { delegate: 'orderCounter', name: 'OrderCounter' },
  { delegate: 'product', name: 'Product' },
  { delegate: 'productPrice', name: 'ProductPrice' },
  { delegate: 'inventory', name: 'Inventory' },
  { delegate: 'review', name: 'Review' },
  { delegate: 'order', name: 'Order' },
  { delegate: 'orderItem', name: 'OrderItem' },
  { delegate: 'customer', name: 'Customer' },
  { delegate: 'address', name: 'Address' },
  { delegate: 'activationToken', name: 'ActivationToken' },
  { delegate: 'verificationToken', name: 'VerificationToken' },
  { delegate: 'passwordResetToken', name: 'PasswordResetToken' },
  { delegate: 'customerSession', name: 'CustomerSession' },
  { delegate: 'emailChangeToken', name: 'EmailChangeToken' },
  { delegate: 'securityEvent', name: 'SecurityEvent' },
  { delegate: 'payment', name: 'Payment' },
  { delegate: 'webhookEvent', name: 'WebhookEvent' },
  { delegate: 'fraudReview', name: 'FraudReview' },
  { delegate: 'customerAdminNote', name: 'CustomerAdminNote' },
  { delegate: 'promoCode', name: 'PromoCode' },
  { delegate: 'storeSettings', name: 'StoreSettings' },
  { delegate: 'journalArticle', name: 'JournalArticle' },
  { delegate: 'newsletterSubscriber', name: 'NewsletterSubscriber' },
  { delegate: 'newsletterConsentEvent', name: 'NewsletterConsentEvent' },
  { delegate: 'newsletterCampaign', name: 'NewsletterCampaign' },
  { delegate: 'shippingRegion', name: 'ShippingRegion' },
  { delegate: 'shippingCountry', name: 'ShippingCountry' },
  { delegate: 'shippingMethod', name: 'ShippingMethod' },
  { delegate: 'shippingAnnouncement', name: 'ShippingAnnouncement' },
  { delegate: 'shippingLog', name: 'ShippingLog' },
  { delegate: 'backupJob', name: 'BackupJob' },
  { delegate: 'backupSettings', name: 'BackupSettings' },
] as const;

const SECRET_CONFIG_KEYS = [
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SMTP_PASSWORD',
  'JWT_SECRET',
  'SESSION_SECRET',
  'BACKUP_ENCRYPTION_KEY',
  'STORAGE_SECRET',
];

export function generateBackupId(prefix = 'BKP') {
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  return `${prefix}-${stamp}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

export function resolveSqliteDatabasePath(rootDir: string) {
  const url = process.env.DATABASE_URL || 'file:./vestigia-dev.db';
  if (!url.startsWith('file:')) return null;
  const raw = url.replace(/^file:/, '');
  return path.resolve(rootDir, raw);
}

export function getBackupStorageDir(rootDir: string) {
  return path.resolve(rootDir, process.env.BACKUP_STORAGE_PATH || 'private/backups');
}

export function ensureDirectory(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function hashBuffer(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function hashFile(filePath: string) {
  return hashBuffer(fs.readFileSync(filePath));
}

export function safeRelativePath(value: string) {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('\0') || normalized.split('/').includes('..')) {
    throw new Error('Unsafe backup file path');
  }
  return normalized;
}

function jsonStringify(value: unknown) {
  return JSON.stringify(value, (_key, v) => typeof v === 'bigint' ? v.toString() : v, 2);
}

function writeJson(filePath: string, value: unknown) {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, jsonStringify(value));
}

function listFiles(dir: string, baseDir = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full, baseDir);
    if (!entry.isFile()) return [];
    return [path.relative(baseDir, full)];
  });
}

async function exportLogicalData(prisma: any) {
  const output: Record<string, unknown[]> = {};
  for (const model of DATA_MODELS) {
    const delegate = (prisma as any)[model.delegate];
    if (!delegate?.findMany) continue;
    output[model.name] = await delegate.findMany();
  }
  return output;
}

function sqliteSchemaSnapshot(databasePath: string | null) {
  if (!databasePath || !fs.existsSync(databasePath)) return [];
  const db = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    return db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name").all();
  } finally {
    db.close();
  }
}

async function createSqliteSnapshot(databasePath: string | null, targetPath: string) {
  if (!databasePath || !fs.existsSync(databasePath)) return null;
  ensureDirectory(path.dirname(targetPath));
  const db = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    await db.backup(targetPath);
    return targetPath;
  } finally {
    db.close();
  }
}

function buildSafeConfiguration(prismaSafeSettings: unknown) {
  return {
    storeSettings: prismaSafeSettings,
    environment: SECRET_CONFIG_KEYS.reduce((acc, key) => {
      acc[key] = process.env[key] ? 'configured' : 'not_configured';
      return acc;
    }, {} as Record<string, string>),
    backupNotes: {
      secretsIncluded: false,
      paymentProvider: 'stripe',
      emailProviderConfigured: Boolean(process.env.SMTP_HOST || process.env.SMTP_USER),
    },
  };
}

function collectPackageFiles(packageDir: string): BackupFile[] {
  return listFiles(packageDir).map((relative) => {
    const safePath = safeRelativePath(relative);
    const absolute = path.join(packageDir, safePath);
    const content = fs.readFileSync(absolute);
    return {
      path: safePath,
      size: content.byteLength,
      sha256: hashBuffer(content),
      contentBase64: content.toString('base64'),
    };
  });
}

function encryptArchive(payload: unknown, encryptionSecret: string) {
  if (!encryptionSecret) throw new Error('Backup encryption secret is not configured');
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(encryptionSecret, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(jsonStringify(payload));
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.from(JSON.stringify({
    format: 'vestigia-encrypted-backup',
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    algorithm: 'aes-256-gcm',
    kdf: 'scrypt',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: encrypted.toString('base64'),
  }));
}

export function decryptArchive(archivePath: string, encryptionSecret: string) {
  const wrapper = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
  if (wrapper.format !== 'vestigia-encrypted-backup' || wrapper.algorithm !== 'aes-256-gcm') {
    throw new Error('Unsupported backup archive format');
  }
  const salt = Buffer.from(wrapper.salt, 'base64');
  const iv = Buffer.from(wrapper.iv, 'base64');
  const authTag = Buffer.from(wrapper.authTag, 'base64');
  const encrypted = Buffer.from(wrapper.ciphertext, 'base64');
  const key = crypto.scryptSync(encryptionSecret, salt, 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')) as {
    manifest: BackupManifest;
    checksums: Record<string, string>;
    files: BackupFile[];
  };
}

export function verifyDecryptedPackage(packageData: { manifest: BackupManifest; checksums: Record<string, string>; files: BackupFile[] }) {
  if (!packageData.manifest?.backupId || !Array.isArray(packageData.files)) {
    throw new Error('Backup manifest is invalid');
  }
  for (const file of packageData.files) {
    safeRelativePath(file.path);
    const content = Buffer.from(file.contentBase64, 'base64');
    if (content.byteLength !== file.size) throw new Error(`Backup file size mismatch: ${file.path}`);
    const actual = hashBuffer(content);
    if (actual !== file.sha256 || packageData.checksums[file.path] !== actual) {
      throw new Error(`Backup checksum mismatch: ${file.path}`);
    }
  }
  return true;
}

export async function verifyBackupArchive(archivePath: string, encryptionSecret: string) {
  const packageData = decryptArchive(archivePath, encryptionSecret);
  verifyDecryptedPackage(packageData);
  return {
    manifest: packageData.manifest,
    archiveChecksum: hashFile(archivePath),
    fileCount: packageData.files.length,
  };
}

export async function createBackupPackage(options: CreateBackupOptions) {
  const {
    prisma,
    backupId,
    type,
    createdBy,
    rootDir,
    uploadDir,
    backupStorageDir,
    encryptionSecret,
  } = options;

  ensureDirectory(backupStorageDir);
  const workDir = path.join(backupStorageDir, '_work', backupId);
  fs.rmSync(workDir, { recursive: true, force: true });
  ensureDirectory(workDir);

  const databasePath = resolveSqliteDatabasePath(rootDir);
  const includeDatabase = type === 'DATABASE' || type === 'FULL';
  const includeMedia = type === 'MEDIA' || type === 'FULL';
  const includeConfig = type === 'CONFIGURATION' || type === 'FULL';
  let databaseSize = 0;
  let mediaSize = 0;

  try {
    if (includeDatabase) {
      const databaseDir = path.join(workDir, 'database');
      ensureDirectory(databaseDir);
      const snapshotPath = path.join(databaseDir, 'sqlite-snapshot.db');
      const snapshot = await createSqliteSnapshot(databasePath, snapshotPath);
      if (snapshot) databaseSize = fs.statSync(snapshot).size;
      writeJson(path.join(databaseDir, 'logical-data.json'), await exportLogicalData(prisma));
      writeJson(path.join(databaseDir, 'sqlite-schema.json'), sqliteSchemaSnapshot(databasePath));
      const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
      if (fs.existsSync(schemaPath)) {
        fs.copyFileSync(schemaPath, path.join(databaseDir, 'schema.prisma'));
      }
    }

    if (includeMedia) {
      const mediaRoot = path.join(workDir, 'media', 'uploads');
      ensureDirectory(mediaRoot);
      for (const relative of listFiles(uploadDir)) {
        const safePath = safeRelativePath(relative);
        const source = path.join(uploadDir, safePath);
        const target = path.join(mediaRoot, safePath);
        ensureDirectory(path.dirname(target));
        fs.copyFileSync(source, target);
        mediaSize += fs.statSync(source).size;
      }
    }

    if (includeConfig) {
      const settings = await prisma.storeSettings.findFirst();
      const safeSettings = settings ? { ...settings, adminPassword: settings.adminPassword ? 'configured' : 'not_configured' } : null;
      writeJson(path.join(workDir, 'configuration', 'safe-settings.json'), buildSafeConfiguration(safeSettings));
    }

    const checksums: Record<string, string> = {};
    for (const relative of listFiles(workDir)) {
      checksums[safeRelativePath(relative)] = hashFile(path.join(workDir, relative));
    }

    const manifest: BackupManifest = {
      backupId,
      backupType: type,
      createdAt: new Date().toISOString(),
      createdBy,
      applicationVersion: process.env.APP_VERSION || process.env.npm_package_version || 'development',
      databaseEngine: process.env.DATABASE_PROVIDER || 'sqlite',
      schemaVersion: checksums['database/schema.prisma'] || 'unknown',
      backupFormatVersion: BACKUP_FORMAT_VERSION,
      includedDatabase: includeDatabase,
      includedMedia: includeMedia,
      includedConfiguration: includeConfig,
      fileCount: Object.keys(checksums).length + 3,
      databaseSize,
      mediaSize,
      checksumAlgorithm: BACKUP_CHECKSUM_ALGORITHM,
      encrypted: true,
      secretsExcluded: SECRET_CONFIG_KEYS,
    };

    writeJson(path.join(workDir, 'manifest.json'), manifest);
    writeJson(path.join(workDir, 'checksums', 'checksums.json'), checksums);
    writeJson(path.join(workDir, 'metadata', 'backup-info.json'), {
      backupId,
      createdAt: manifest.createdAt,
      restoreWarning: 'Restoring a historical backup may revert orders, inventory, customers, and media to the backup timestamp.',
      secretsIncluded: false,
      source: 'Vestigia backup system',
    });

    const finalChecksums: Record<string, string> = {};
    for (const relative of listFiles(workDir)) {
      finalChecksums[safeRelativePath(relative)] = hashFile(path.join(workDir, relative));
    }
    const files = collectPackageFiles(workDir);
    const encrypted = encryptArchive({ manifest, checksums: finalChecksums, files }, encryptionSecret);
    const archivePath = path.join(backupStorageDir, `${backupId}.vbak`);
    fs.writeFileSync(archivePath, encrypted);
    const archiveChecksum = hashFile(archivePath);

    return {
      manifest: { ...manifest, fileCount: files.length },
      archivePath,
      archiveChecksum,
      sizeBytes: fs.statSync(archivePath).size,
      fileCount: files.length,
    };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

export function materializeBackupPackage(archivePath: string, encryptionSecret: string, targetDir: string) {
  const packageData = decryptArchive(archivePath, encryptionSecret);
  verifyDecryptedPackage(packageData);
  fs.rmSync(targetDir, { recursive: true, force: true });
  ensureDirectory(targetDir);
  for (const file of packageData.files) {
    const safePath = safeRelativePath(file.path);
    const target = path.join(targetDir, safePath);
    ensureDirectory(path.dirname(target));
    fs.writeFileSync(target, Buffer.from(file.contentBase64, 'base64'));
  }
  return packageData.manifest;
}
