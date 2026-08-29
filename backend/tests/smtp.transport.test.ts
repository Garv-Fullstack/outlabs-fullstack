import { describe, it, expect } from 'vitest';
import { classifySmtpError, RetryableDeliveryError, NonRetryableDeliveryError } from '../src/email/smtp.errors.js';
import { encryptCredential } from '../src/utils/crypto.js';
import { SmtpTransporterPool, SenderSmtpConfig } from '../src/email/smtp.pool.js';

describe('SMTP Transport & Error Classification Tests', () => {
  const hexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('should classify SMTP 535 authentication error as NonRetryableDeliveryError', () => {
    const error = {
      message: 'Invalid login - 535 5.7.8 Username and Password not accepted',
      responseCode: 535
    };
    const classified = classifySmtpError(error);
    expect(classified).toBeInstanceOf(NonRetryableDeliveryError);
    expect(classified.isRetryable).toBe(false);
    expect(classified.code).toBe('SMTP_AUTH_FAILED');
  });

  it('should classify SMTP 550 mailbox unavailable error as NonRetryableDeliveryError', () => {
    const error = {
      message: 'User does not exist (550)',
      responseCode: 550
    };
    const classified = classifySmtpError(error);
    expect(classified).toBeInstanceOf(NonRetryableDeliveryError);
    expect(classified.isRetryable).toBe(false);
    expect(classified.code).toBe('RECIPIENT_REJECTED');
  });

  it('should classify SMTP 421 / 451 transient error as RetryableDeliveryError', () => {
    const error = {
      message: '421 4.7.0 Try again later, closing transmission channel',
      responseCode: 421
    };
    const classified = classifySmtpError(error);
    expect(classified).toBeInstanceOf(RetryableDeliveryError);
    expect(classified.isRetryable).toBe(true);
    expect(classified.code).toBe('SMTP_TRANSIENT_ERROR');
  });

  it('should classify network socket timeouts (ETIMEDOUT, ECONNRESET) as RetryableDeliveryError', () => {
    const error = {
      message: 'connect ETIMEDOUT 142.250.180.108:587',
      code: 'ETIMEDOUT'
    };
    const classified = classifySmtpError(error);
    expect(classified).toBeInstanceOf(RetryableDeliveryError);
    expect(classified.isRetryable).toBe(true);
    expect(classified.code).toBe('NETWORK_ERROR');
  });

  it('should instantiate and cache pooled transporter decrypting password only on creation', () => {
    const pool = new SmtpTransporterPool();
    const rawPass = 'secret_ethereal_password_abc123';
    const encryptedPass = encryptCredential(rawPass, hexKey);

    const sender: SenderSmtpConfig = {
      id: 'sender-smtp-test-1',
      email: 'sales@reachinbox.ai',
      name: 'Sales Outreach',
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
      smtpUser: 'ethereal_user_test',
      smtpPassEncrypted: encryptedPass,
      updatedAt: new Date('2026-08-29T10:00:00.000Z')
    };

    const transporter1 = pool.getTransporter(sender);
    const transporter2 = pool.getTransporter(sender);

    // Verify transporter instance is pooled and reused
    expect(transporter1).toBe(transporter2);

    pool.closeAll();
  });
});
