import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { slackService } from '../integrations/slack.service.js';
import { config } from '../config/env.js';
import { ApiResponse } from '@reachinbox/shared';
import { UnauthorizedError } from '../utils/errors.js';

export class SlackController {
  /**
   * GET /api/slack/connect -> Initiates Slack OAuth redirect
   */
  public initiateSlackConnect(req: Request, res: Response): void {
    const userId = req.user?.id || 'anonymous';
    const state = `${userId}:${crypto.randomBytes(16).toString('hex')}`;

    res.cookie('oauth_state_slack', state, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000
    });

    const authUrl = slackService.generateAuthUrl(state);
    res.redirect(authUrl);
  }

  /**
   * GET /api/slack/callback -> Handles Slack OAuth exchange
   */
  public async handleSlackCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.query;
      const storedState = req.cookies?.['oauth_state_slack'];

      if (!state || !storedState || state !== storedState) {
        throw new UnauthorizedError('Invalid Slack OAuth CSRF state parameter');
      }

      if (!code || typeof code !== 'string') {
        throw new UnauthorizedError('Slack authorization code missing');
      }

      const userId = (state as string).split(':')[0]!;

      res.clearCookie('oauth_state_slack');

      await slackService.exchangeCodeAndSave(code, userId);

      res.redirect(`${config.FRONTEND_URL}/settings?slack=connected`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/slack/status -> Returns connection status
   */
  public async getSlackStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const status = await slackService.getSlackStatus(userId);

      const response: ApiResponse = {
        success: true,
        data: status,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/slack/disconnect -> Disconnects Slack
   */
  public async disconnectSlack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      await slackService.disconnectSlack(userId);

      const response: ApiResponse = {
        success: true,
        data: { message: 'Slack integration disconnected' },
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const slackController = new SlackController();
