/**
 * Secure PII Storage Service
 * Implements encrypted storage with automatic expiration for PII data
 * Zero-knowledge architecture compliant with Australian Privacy Act 1988
 */

import { createHash, randomBytes, pbkdf2, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';
import { PIIItem } from './pii-detector';

const pbkdf2Async = promisify(pbkdf2);

export interface EncryptedPIIData {
  encryptedData: Buffer;
  salt: Buffer;
  iv: Buffer;
  authTag: Buffer;
  algorithm: string;
}

export interface PIIStorageEntry {
  sessionId: string;
  encryptedPII: EncryptedPIIData;
  createdAt: Date;
  expiresAt: Date;
  accessLog: PIIAccessEvent[];
}

export interface PIIAccessEvent {
  timestamp: Date;
  action: PIIAccessAction;
  userAgent: string;
  ipHash: string;
  success: boolean;
  errorCode?: string;
}

export enum PIIAccessAction {
  STORE = 'pii_store',
  RETRIEVE = 'pii_retrieve',
  PURGE = 'pii_purge',
  AUTO_CLEANUP = 'pii_auto_cleanup'
}

export interface CleanupReport {
  cleaned: number;
  errors: number;
  timestamp: Date;
}

export interface SecurePIIStorage {
  storePII(sessionId: string, piiData: PIIItem[], sessionSecret: string): Promise<string>;
  retrievePII(sessionId: string, encryptionKey: string): Promise<PIIItem[]>;
  purgePII(sessionId: string): Promise<void>;
  autoCleanupExpired(): Promise<CleanupReport>;
}

/**
 * AES-256-GCM encryption implementation for PII data
 */
class PIIEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 32;
  private readonly iterations = 100000; // PBKDF2 iterations

  async encryptPII(data: PIIItem[], sessionSecret: string): Promise<EncryptedPIIData> {
    try {
      // Generate random salt and IV
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);
      
      // Derive encryption key from session secret
      const key = await this.deriveKey(sessionSecret, salt);
      
      // Encrypt the PII data
      const cipher = createCipheriv(this.algorithm, key, iv);
      const dataString = JSON.stringify(data);
      
      let encrypted = cipher.update(dataString, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        salt,
        iv,
        authTag,
        algorithm: this.algorithm
      };
    } catch (error) {
      console.error('PII encryption failed:', error);
      throw new Error('Failed to encrypt PII data');
    }
  }

  async decryptPII(encryptedData: EncryptedPIIData, sessionSecret: string): Promise<PIIItem[]> {
    try {
      // Derive the same key using stored salt
      const key = await this.deriveKey(sessionSecret, encryptedData.salt);
      
      // Create decipher with authentication tag
      const decipher = createDecipheriv(this.algorithm, key, encryptedData.iv);
      decipher.setAuthTag(encryptedData.authTag);
      
      // Decrypt data
      let decrypted = decipher.update(encryptedData.encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      // Parse and return PII items
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      console.error('PII decryption failed:', error);
      throw new Error('Failed to decrypt PII data - invalid key or corrupted data');
    }
  }

  private async deriveKey(secret: string, salt: Buffer): Promise<Buffer> {
    return await pbkdf2Async(secret, salt, this.iterations, this.keyLength, 'sha256');
  }

  /**
   * Generate a cryptographically secure session secret
   */
  generateSessionSecret(): string {
    return randomBytes(32).toString('hex');
  }
}

/**
 * In-memory PII storage with automatic cleanup
 * In production, this would use Vercel KV or similar encrypted storage
 */
class MemoryPIIStorage implements SecurePIIStorage {
  private storage = new Map<string, PIIStorageEntry>();
  private encryption = new PIIEncryption();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start automatic cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.autoCleanupExpired().catch(console.error);
    }, 60 * 60 * 1000);
  }

  async storePII(sessionId: string, piiData: PIIItem[], sessionSecret: string): Promise<string> {
    try {
      // Encrypt the PII data
      const encryptedPII = await this.encryption.encryptPII(piiData, sessionSecret);
      
      // Set expiration (24 hours maximum)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Create storage entry
      const entry: PIIStorageEntry = {
        sessionId,
        encryptedPII,
        createdAt: new Date(),
        expiresAt,
        accessLog: [{
          timestamp: new Date(),
          action: PIIAccessAction.STORE,
          userAgent: 'server',
          ipHash: this.hashIP('127.0.0.1'), // Would be actual IP in production
          success: true
        }]
      };

      // Store encrypted data
      this.storage.set(sessionId, entry);

      // Return session secret (acts as encryption key)
      return sessionSecret;
    } catch (error) {
      console.error('Failed to store PII:', error);
      throw new Error('PII storage failed');
    }
  }

  async retrievePII(sessionId: string, encryptionKey: string): Promise<PIIItem[]> {
    try {
      const entry = this.storage.get(sessionId);
      
      if (!entry) {
        throw new Error('PII data not found or expired');
      }

      // Check expiration
      if (new Date() > entry.expiresAt) {
        await this.purgePII(sessionId);
        throw new Error('PII data has expired');
      }

      // Log access attempt
      entry.accessLog.push({
        timestamp: new Date(),
        action: PIIAccessAction.RETRIEVE,
        userAgent: 'server',
        ipHash: this.hashIP('127.0.0.1'),
        success: true
      });

      // Decrypt and return PII data
      return await this.encryption.decryptPII(entry.encryptedPII, encryptionKey);
    } catch (error) {
      // Log failed access attempt
      const entry = this.storage.get(sessionId);
      if (entry) {
        entry.accessLog.push({
          timestamp: new Date(),
          action: PIIAccessAction.RETRIEVE,
          userAgent: 'server',
          ipHash: this.hashIP('127.0.0.1'),
          success: false,
          errorCode: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      console.error('Failed to retrieve PII:', error);
      throw error;
    }
  }

  async purgePII(sessionId: string): Promise<void> {
    try {
      const entry = this.storage.get(sessionId);
      
      if (entry) {
        // Log purge action
        entry.accessLog.push({
          timestamp: new Date(),
          action: PIIAccessAction.PURGE,
          userAgent: 'server',
          ipHash: this.hashIP('127.0.0.1'),
          success: true
        });

        // Securely delete from memory
        this.storage.delete(sessionId);
      }
    } catch (error) {
      console.error('Failed to purge PII:', error);
      throw new Error('PII purge failed');
    }
  }

  async autoCleanupExpired(): Promise<CleanupReport> {
    const report: CleanupReport = {
      cleaned: 0,
      errors: 0,
      timestamp: new Date()
    };

    const now = new Date();
    const expiredSessions: string[] = [];

    // Find expired sessions
    for (const [sessionId, entry] of this.storage.entries()) {
      if (now > entry.expiresAt) {
        expiredSessions.push(sessionId);
      }
    }

    // Clean up expired sessions
    for (const sessionId of expiredSessions) {
      try {
        await this.purgePII(sessionId);
        report.cleaned++;
      } catch (error) {
        console.error(`Failed to cleanup session ${sessionId}:`, error);
        report.errors++;
      }
    }

    console.log(`PII cleanup completed: ${report.cleaned} cleaned, ${report.errors} errors`);
    return report;
  }

  private hashIP(ip: string): string {
    return createHash('sha256').update(ip + 'salt').digest('hex').substring(0, 16);
  }

  /**
   * Get audit trail for a session (for compliance reporting)
   */
  async getAuditTrail(sessionId: string): Promise<PIIAccessEvent[]> {
    const entry = this.storage.get(sessionId);
    return entry ? entry.accessLog : [];
  }

  /**
   * Get storage statistics for monitoring
   */
  getStorageStats() {
    const now = new Date();
    let total = 0;
    let expired = 0;
    let expiringIn1Hour = 0;

    for (const entry of this.storage.values()) {
      total++;
      if (now > entry.expiresAt) {
        expired++;
      } else if ((entry.expiresAt.getTime() - now.getTime()) < 60 * 60 * 1000) {
        expiringIn1Hour++;
      }
    }

    return {
      total,
      expired,
      expiringIn1Hour,
      active: total - expired
    };
  }

  /**
   * Cleanup method for graceful shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    // Securely clear all data
    this.storage.clear();
  }
}

/**
 * Factory for creating secure PII storage instances
 */
export class PIIStorageFactory {
  static create(): SecurePIIStorage {
    return new MemoryPIIStorage();
  }
}

/**
 * Global PII storage instance with proper lifecycle management
 */
export const piiStorage = PIIStorageFactory.create();

// Graceful shutdown cleanup
process.on('SIGTERM', () => {
  if (piiStorage instanceof MemoryPIIStorage) {
    piiStorage.destroy();
  }
});

process.on('SIGINT', () => {
  if (piiStorage instanceof MemoryPIIStorage) {
    piiStorage.destroy();
  }
});