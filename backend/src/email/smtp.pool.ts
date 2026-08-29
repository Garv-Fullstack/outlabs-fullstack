import nodemailer, { Transporter } from 'nodemailer';
import { decryptCredential } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import { NonRetryableDeliveryError, classifySmtpError } from './smtp.errors.js';

export interface SenderSmtpConfig {
  id: string;
  email: string;
  name: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassEncrypted: string;
  updatedAt: Date | string;
}

export class SmtpTransporterPool {
  private pool = new Map<string, { transporter: Transporter; versionKey: string }>();

  /**
   * Generates cache key combining sender ID and updatedAt timestamp
   */
  private static getCacheKey(sender: SenderSmtpConfig): string {
    const ts = typeof sender.updatedAt === 'string' ? sender.updatedAt : sender.updatedAt.toISOString();
    return `${sender.id}:${ts}`;
  }

  /**
   * Retrieves or creates a pooled Nodemailer transporter for the sender
   */
  public getTransporter(sender: SenderSmtpConfig): Transporter {
    if (!sender || !sender.smtpHost || !sender.smtpPort || !sender.smtpUser || !sender.smtpPassEncrypted) {
      throw new NonRetryableDeliveryError(
        `Incomplete SMTP configuration for sender ${sender?.id || sender?.email || 'unknown'}`,
        'INVALID_SMTP_CONFIG'
      );
    }

    const cacheKey = SmtpTransporterPool.getCacheKey(sender);
    const existing = this.pool.get(sender.id);

    if (existing && existing.versionKey === cacheKey) {
      return existing.transporter;
    }

    // If credentials updated or not in cache, create new transporter
    if (existing) {
      existing.transporter.close();
      this.pool.delete(sender.id);
    }

    let decryptedPassword = '';
    try {
      decryptedPassword = decryptCredential(sender.smtpPassEncrypted);
    } catch (cryptoErr) {
      logger.error({ senderId: sender.id, err: cryptoErr }, 'Failed to decrypt sender SMTP credentials');
      throw new NonRetryableDeliveryError('Failed to decrypt SMTP credentials at runtime', 'DECRYPTION_FAILED');
    }

    const transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: {
        user: sender.smtpUser,
        pass: decryptedPassword
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    this.pool.set(sender.id, { transporter, versionKey: cacheKey });

    logger.info({
      senderId: sender.id,
      smtpHost: sender.smtpHost,
      smtpPort: sender.smtpPort,
      smtpUser: sender.smtpUser
    }, 'Created new pooled SMTP transporter');

    return transporter;
  }

  /**
   * Verifies SMTP connection against the provider
   */
  public async verifyConnection(sender: SenderSmtpConfig): Promise<boolean> {
    const transporter = this.getTransporter(sender);
    try {
      await transporter.verify();
      return true;
    } catch (error) {
      const classified = classifySmtpError(error);
      logger.error({ senderId: sender.id, error: classified.message }, 'SMTP connection verification failed');
      throw classified;
    }
  }

  /**
   * Closes all pooled transporters
   */
  public closeAll(): void {
    for (const [senderId, entry] of this.pool.entries()) {
      entry.transporter.close();
      logger.info({ senderId }, 'Closed SMTP transporter');
    }
    this.pool.clear();
  }
}

export const smtpPool = new SmtpTransporterPool();
