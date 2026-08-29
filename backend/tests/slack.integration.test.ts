import { describe, it, expect } from 'vitest';
import { SlackIntegrationService } from '../src/integrations/slack.service.js';
import { encryptCredential, decryptCredential } from '../src/utils/crypto.js';

describe('Slack OAuth & Integration Tests', () => {
  it('should generate valid Slack authorization URL with state and required scopes', () => {
    const slackService = new SlackIntegrationService();
    const state = 'user-123:csrf-token-abc';
    const authUrl = slackService.generateAuthUrl(state);

    expect(authUrl).toContain('https://slack.com/oauth/v2/authorize');
    expect(authUrl).toContain('chat:write');
    expect(authUrl).toContain('incoming-webhook');
    expect(authUrl).toContain('channels:read');
    expect(authUrl).toContain(encodeURIComponent(state));
  });

  it('should encrypt Slack bot access token before persistence and decrypt accurately', () => {
    const rawBotToken = 'test-slack-bot-token';
    const encryptedToken = encryptCredential(rawBotToken);

    expect(encryptedToken).not.toBe(rawBotToken);
    expect(encryptedToken.split(':').length).toBe(3); // iv:authTag:ciphertext

    const decrypted = decryptCredential(encryptedToken);
    expect(decrypted).toBe(rawBotToken);
  });
});
