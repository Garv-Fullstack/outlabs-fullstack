import { WebClient } from '@slack/web-api';
import { prisma } from '../repositories/prisma.js';
import { encryptCredential, decryptCredential } from '../utils/crypto.js';
import { SlackStatus } from '@reachinbox/shared';
import { UnauthorizedError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface SlackStatusResult {
  connected: boolean;
  teamName?: string | null;
  channelName?: string | null;
  status: SlackStatus;
}

export class SlackIntegrationService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env['SLACK_CLIENT_ID'] || 'mock-slack-client-id';
    this.clientSecret = process.env['SLACK_CLIENT_SECRET'] || 'mock-slack-client-secret';
    this.redirectUri = process.env['SLACK_REDIRECT_URI'] || 'http://localhost:5000/api/slack/callback';
  }

  /**
   * Generates Slack OAuth authorization URL
   */
  public generateAuthUrl(state: string): string {
    const scopes = ['chat:write', 'incoming-webhook', 'channels:read'].join(',');
    return `https://slack.com/oauth/v2/authorize?client_id=${this.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${encodeURIComponent(state)}`;
  }

  /**
   * Exchanges Slack authorization code for bot token and stores encrypted token in database
   */
  public async exchangeCodeAndSave(code: string, userId: string): Promise<SlackStatusResult> {
    try {
      const client = new WebClient();
      const response = await client.oauth.v2.access({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      });

      if (!response.ok || !response.access_token) {
        throw new UnauthorizedError(`Slack OAuth failed: ${response.error || 'Unknown error'}`);
      }

      const rawAccessToken = response.access_token as string;
      const teamId = (response.team?.id as string) || 'unknown-team';
      const teamName = (response.team?.name as string) || null;
      const incomingWebhook = (response as any).incoming_webhook;
      const channelId = incomingWebhook?.channel_id || 'general';
      const channelName = incomingWebhook?.channel || null;
      const incomingWebhookUrl = incomingWebhook?.url || null;

      // Encrypt Slack access token at rest
      const accessTokenEnc = encryptCredential(rawAccessToken);

      const integration = await prisma.slackIntegration.upsert({
        where: { userId },
        update: {
          slackTeamId: teamId,
          slackTeamName: teamName,
          slackChannelId: channelId,
          slackChannelName: channelName,
          accessTokenEnc,
          incomingWebhookUrl,
          status: SlackStatus.ACTIVE
        },
        create: {
          userId,
          slackTeamId: teamId,
          slackTeamName: teamName,
          slackChannelId: channelId,
          slackChannelName: channelName,
          accessTokenEnc,
          incomingWebhookUrl,
          status: SlackStatus.ACTIVE
        }
      });

      logger.info({ userId, teamId, channelId }, 'Slack integration successfully saved with encrypted token');

      return {
        connected: true,
        teamName: integration.slackTeamName,
        channelName: integration.slackChannelName,
        status: integration.status as SlackStatus
      };
    } catch (error) {
      logger.error({ error, userId }, 'Error in Slack OAuth token exchange');
      throw new UnauthorizedError('Failed to exchange Slack authorization code');
    }
  }

  /**
   * Dispatches a real Slack Block-Kit rate limit alert
   */
  public async sendRateLimitAlert(
    userId: string,
    senderEmail: string,
    hourlyLimit: number,
    hourBucket: string
  ): Promise<boolean> {
    try {
      const integration = await prisma.slackIntegration.findUnique({
        where: { userId }
      });

      if (!integration || integration.status !== SlackStatus.ACTIVE) {
        logger.info({ userId }, 'No active Slack integration found for user; skipped Slack notification');
        return false;
      }

      const decryptedToken = decryptCredential(integration.accessTokenEnc);
      const client = new WebClient(decryptedToken);

      const messageBlocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ ReachInbox Rate Limit Triggered',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Sender *${senderEmail}* has reached the hourly sending limit of *${hourlyLimit} emails/hour* for window \`${hourBucket}\`.\n\nPending jobs have been automatically delayed to the next hour.`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `⏰ Timestamp: ${new Date().toUTCString()} | ReachInbox Outbox Engine`
            }
          ]
        }
      ];

      await client.chat.postMessage({
        channel: integration.slackChannelId,
        text: `⚠️ Rate limit reached for ${senderEmail} (${hourlyLimit}/hr)`,
        blocks: messageBlocks
      });

      logger.info({ userId, senderEmail, channelId: integration.slackChannelId }, 'Slack rate limit alert dispatched');
      return true;
    } catch (error) {
      logger.error({ error, userId, senderEmail }, 'Failed to dispatch Slack notification (non-blocking)');
      return false;
    }
  }

  /**
   * Disconnects and revokes user Slack integration
   */
  public async disconnectSlack(userId: string): Promise<void> {
    await prisma.slackIntegration.updateMany({
      where: { userId },
      data: { status: SlackStatus.DISCONNECTED }
    });
    logger.info({ userId }, 'Disconnected Slack integration');
  }

  /**
   * Returns current Slack connection status
   */
  public async getSlackStatus(userId: string): Promise<SlackStatusResult> {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId }
    });

    if (!integration || integration.status !== SlackStatus.ACTIVE) {
      return {
        connected: false,
        status: SlackStatus.DISCONNECTED
      };
    }

    return {
      connected: true,
      teamName: integration.slackTeamName,
      channelName: integration.slackChannelName,
      status: SlackStatus.ACTIVE
    };
  }
}

export const slackService = new SlackIntegrationService();
