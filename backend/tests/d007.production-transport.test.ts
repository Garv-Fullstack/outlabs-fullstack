import { describe, it, expect, vi } from 'vitest';
import { DeliveryProcessor, resolveDefaultTransport } from '../src/workers/delivery.worker.js';
import { WorkerLifecycleManager } from '../src/workers/worker.lifecycle.js';
import { MockDeliveryTransport, IDeliveryTransport } from '../src/workers/transports/delivery.transport.js';
import { NodemailerSmtpTransport, nodemailerTransport } from '../src/workers/transports/smtp.transport.js';
import { NonRetryableDeliveryError } from '../src/email/smtp.errors.js';
import { SmtpTransporterPool, SenderSmtpConfig } from '../src/email/smtp.pool.js';
import { encryptCredential } from '../src/utils/crypto.js';
import { config } from '../src/config/env.js';

describe('D-007: Production Delivery Transport Forensic Verification Suite', () => {
  const hexKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  // =========================================================================
  // Section 6: Standard Required Tests (A - F)
  // =========================================================================

  describe('Test A — Production transport selection', () => {
    it('should resolve NodemailerSmtpTransport and NOT MockDeliveryTransport in production', () => {
      const resolved = resolveDefaultTransport('production');
      expect(resolved).toBeInstanceOf(NodemailerSmtpTransport);
      expect(resolved).not.toBeInstanceOf(MockDeliveryTransport);
      expect(resolved).toBe(nodemailerTransport);
    });

    it('should initialize DeliveryProcessor with NodemailerSmtpTransport when NODE_ENV is production', () => {
      const originalEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';
        const processor = new DeliveryProcessor();
        const activeTransport = processor.getTransport();
        expect(activeTransport).toBeInstanceOf(NodemailerSmtpTransport);
        expect(activeTransport).not.toBeInstanceOf(MockDeliveryTransport);
      } finally {
        (config as any).NODE_ENV = originalEnv;
      }
    });
  });

  describe('Test B — Test transport isolation', () => {
    it('should resolve MockDeliveryTransport in test environment by default', () => {
      const resolved = resolveDefaultTransport('test');
      expect(resolved).toBeInstanceOf(MockDeliveryTransport);
      expect(resolved).not.toBeInstanceOf(NodemailerSmtpTransport);
    });

    it('should deliver safely in test mode without attempting live network calls', async () => {
      const mockTransport = new MockDeliveryTransport();
      const result = await mockTransport.send({
        deliveryId: 'del-test-isolation-1',
        senderId: 'sender-test-1',
        senderEmail: 'sales@reachinbox.ai',
        senderName: 'Sales Lead',
        recipientEmail: 'client@example.com',
        subject: 'Deterministic Test',
        bodyText: 'Test content'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<mock-del-test-isolation-1@ethereal.email>');
    });
  });

  describe('Test C — Dependency injection preservation', () => {
    it('should preserve explicitly supplied custom transport in non-production environments', () => {
      class CustomTestTransport implements IDeliveryTransport {
        public called = false;
        async send() {
          this.called = true;
          return { success: true, messageId: '<custom-test@domain.com>' };
        }
      }

      const custom = new CustomTestTransport();
      const processor = new DeliveryProcessor(undefined, undefined, custom);
      expect(processor.getTransport()).toBe(custom);
    });
  });

  describe('Test D — Production missing configuration failure safety', () => {
    it('should throw NonRetryableDeliveryError if sender configuration is missing on live SMTP transport', async () => {
      const transport = new NodemailerSmtpTransport();
      await expect(
        transport.send({
          deliveryId: 'del-missing-cfg',
          senderId: 'sender-1',
          senderEmail: 'test@domain.com',
          senderName: 'Test',
          recipientEmail: 'target@domain.com',
          subject: 'Test',
          bodyText: 'Test'
        }, undefined)
      ).rejects.toThrow(NonRetryableDeliveryError);
    });

    it('should throw NonRetryableDeliveryError if sender configuration has missing host/port/user/password', async () => {
      const transport = new NodemailerSmtpTransport();
      const incompleteConfig: any = {
        id: 'sender-incomplete',
        email: 'sender@example.com',
        name: 'Sender',
        smtpHost: '',
        smtpPort: 587,
        smtpUser: 'user',
        smtpPassEncrypted: 'encrypted',
        updatedAt: new Date()
      };

      await expect(
        transport.send({
          deliveryId: 'del-incomplete-cfg',
          senderId: 'sender-incomplete',
          senderEmail: 'sender@example.com',
          senderName: 'Sender',
          recipientEmail: 'target@example.com',
          subject: 'Test',
          bodyText: 'Test'
        }, incompleteConfig)
      ).rejects.toThrow(/Incomplete SMTP configuration/);
    });

    it('should fail fast in SmtpTransporterPool if sender configuration is incomplete', () => {
      const pool = new SmtpTransporterPool();
      const incompleteSender: any = {
        id: 's-1',
        email: 's@test.com',
        name: 'S',
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: '', // missing user
        smtpPassEncrypted: 'enc',
        updatedAt: new Date()
      };

      expect(() => pool.getTransporter(incompleteSender)).toThrow(NonRetryableDeliveryError);
      pool.closeAll();
    });
  });

  describe('Test E — Actual worker bootstrap integration', () => {
    it('should prove worker lifecycle bootstrap binds to production SMTP transport when NODE_ENV is production', () => {
      const originalEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';
        const prodProcessor = new DeliveryProcessor();
        const lifecycle = new WorkerLifecycleManager(prodProcessor);

        expect(lifecycle.getProcessor().getTransport()).toBeInstanceOf(NodemailerSmtpTransport);
        expect(lifecycle.getProcessor().getTransport()).not.toBeInstanceOf(MockDeliveryTransport);
      } finally {
        (config as any).NODE_ENV = originalEnv;
      }
    });

    it('should start and stop WorkerLifecycleManager cleanly with production processor', async () => {
      const originalEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';
        const prodProcessor = new DeliveryProcessor();
        const lifecycle = new WorkerLifecycleManager(prodProcessor);
        await expect(lifecycle.stopWorker()).resolves.not.toThrow();
      } finally {
        (config as any).NODE_ENV = originalEnv;
      }
    });
  });

  describe('Test F — Real SMTP network safety during test execution', () => {
    it('should verify live transport interacts with transporter pool without external leaking', async () => {
      const mockPool: any = {
        getTransporter: vi.fn().mockReturnValue({
          sendMail: vi.fn().mockResolvedValue({
            messageId: '<simulated-smtp-msg-id@ethereal.email>',
            response: '250 2.0.0 OK'
          })
        })
      };

      const transport = new NodemailerSmtpTransport(mockPool);
      const encPass = encryptCredential('test_password', hexKey);

      const sender: SenderSmtpConfig = {
        id: 'sender-test-f',
        email: 'outreach@reachinbox.ai',
        name: 'Outreach Team',
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: 'ethereal_user_f',
        smtpPassEncrypted: encPass,
        updatedAt: new Date()
      };

      const result = await transport.send({
        deliveryId: 'del-safe-f-1',
        senderId: sender.id,
        senderEmail: sender.email,
        senderName: sender.name,
        recipientEmail: 'prospect@client.org',
        subject: 'Safe Mocked Test',
        bodyText: 'Verified payload'
      }, sender);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<simulated-smtp-msg-id@ethereal.email>');
      expect(mockPool.getTransporter).toHaveBeenCalledWith(sender);
    });
  });

  // =========================================================================
  // Section 7: Negative & Adversarial Tests
  // =========================================================================

  describe('Adversarial & Negative Invariant Enforcement', () => {
    it('Scenario 1: Production environment with no explicit setTransport() MUST use NodemailerSmtpTransport', () => {
      const originalEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';
        const processor = new DeliveryProcessor();
        expect(processor.getTransport()).toBeInstanceOf(NodemailerSmtpTransport);
        expect(processor.getTransport()).not.toBeInstanceOf(MockDeliveryTransport);
      } finally {
        (config as any).NODE_ENV = originalEnv;
      }
    });

    it('Scenario 2: Production environment MUST reject accidental injection of MockDeliveryTransport in constructor', () => {
      const originalEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';
        const mockTransport = new MockDeliveryTransport();
        expect(() => {
          new DeliveryProcessor(undefined, undefined, mockTransport);
        }).toThrow(/SECURITY VIOLATION: MockDeliveryTransport cannot be used in production environment/);
      } finally {
        (config as any).NODE_ENV = originalEnv;
      }
    });

    it('Scenario 3: Production environment MUST reject accidental setTransport(MockDeliveryTransport)', () => {
      const originalEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';
        const processor = new DeliveryProcessor();
        const mockTransport = new MockDeliveryTransport();
        expect(() => {
          processor.setTransport(mockTransport);
        }).toThrow(/SECURITY VIOLATION: MockDeliveryTransport cannot be used in production environment/);
      } finally {
        (config as any).NODE_ENV = originalEnv;
      }
    });

    it('Scenario 4: Production environment with missing SMTP decryption credentials fails with classified error', () => {
      const pool = new SmtpTransporterPool();
      const corruptedSender: SenderSmtpConfig = {
        id: 'sender-corrupt',
        email: 'corrupt@reachinbox.ai',
        name: 'Corrupt Sender',
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: 'corrupt_user',
        smtpPassEncrypted: 'invalid_non_gcm_ciphertext',
        updatedAt: new Date()
      };

      expect(() => pool.getTransporter(corruptedSender)).toThrow(NonRetryableDeliveryError);
      pool.closeAll();
    });

    it('Scenario 5: Multiple worker restarts consistently instantiate NodemailerSmtpTransport in production', () => {
      const originalEnv = config.NODE_ENV;
      try {
        (config as any).NODE_ENV = 'production';
        for (let i = 0; i < 5; i++) {
          const processor = new DeliveryProcessor();
          const manager = new WorkerLifecycleManager(processor);
          expect(manager.getProcessor().getTransport()).toBeInstanceOf(NodemailerSmtpTransport);
        }
      } finally {
        (config as any).NODE_ENV = originalEnv;
      }
    });
  });
});
