import { describe, it, expect } from 'vitest';
import { OutboxStatus, EmailStatus, UserRole, SlackStatus } from '@reachinbox/shared';

describe('Transactional Outbox & Shared Enums Tests', () => {
  it('should verify all required OutboxStatus enums are present and distinct', () => {
    expect(OutboxStatus.PENDING).toBe('PENDING');
    expect(OutboxStatus.PROCESSING).toBe('PROCESSING');
    expect(OutboxStatus.ENQUEUED).toBe('ENQUEUED');
    expect(OutboxStatus.FAILED).toBe('FAILED');
  });

  it('should verify all required EmailStatus enums are present and distinct', () => {
    expect(EmailStatus.SCHEDULED).toBe('SCHEDULED');
    expect(EmailStatus.PROCESSING).toBe('PROCESSING');
    expect(EmailStatus.SENT).toBe('SENT');
    expect(EmailStatus.FAILED).toBe('FAILED');
    expect(EmailStatus.CANCELLED).toBe('CANCELLED');
    expect(EmailStatus.RATE_LIMITED_DELAYED).toBe('RATE_LIMITED_DELAYED');
  });

  it('should verify UserRole and SlackStatus enums', () => {
    expect(UserRole.USER).toBe('USER');
    expect(UserRole.ADMIN).toBe('ADMIN');
    expect(SlackStatus.ACTIVE).toBe('ACTIVE');
    expect(SlackStatus.DISCONNECTED).toBe('DISCONNECTED');
  });
});
