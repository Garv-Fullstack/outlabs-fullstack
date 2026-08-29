import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { googleAuthService, GoogleAuthService } from '../auth/google.auth.js';
import { config } from '../config/env.js';
import { ApiResponse } from '@reachinbox/shared';
import { UnauthorizedError } from '../utils/errors.js';

export class AuthController {
  /**
   * GET /api/auth/google -> Redirects to Google OAuth consent
   */
  public initiateGoogleLogin(_req: Request, res: Response): void {
    const state = crypto.randomBytes(16).toString('hex');

    // Store state in secure cookie for CSRF validation
    res.cookie('oauth_state_google', state, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000 // 10 minutes
    });

    const authUrl = googleAuthService.generateAuthUrl(state);
    res.redirect(authUrl);
  }

  /**
   * GET /api/auth/google/callback -> Handles OAuth exchange & sets session cookie
   */
  public async handleGoogleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state } = req.query;
      const storedState = req.cookies?.['oauth_state_google'];

      if (!state || !storedState || state !== storedState) {
        throw new UnauthorizedError('Invalid OAuth CSRF state parameter');
      }

      if (!code || typeof code !== 'string') {
        throw new UnauthorizedError('Authorization code missing in Google callback');
      }

      // Clear state cookie
      res.clearCookie('oauth_state_google');

      // Exchange code and upsert user
      const user = await googleAuthService.exchangeCodeAndUpsertUser(code);

      // Sign JWT session
      const jwtToken = GoogleAuthService.signToken(user);

      // Set HTTP-only secure session cookie
      res.cookie('reachinbox_session', jwtToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect to frontend dashboard
      res.redirect(`${config.FRONTEND_URL}/dashboard`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me -> Returns current user identity
   */
  public getCurrentUser(req: Request, res: Response): void {
    const response: ApiResponse = {
      success: true,
      data: req.user,
      requestId: req.id
    };
    res.status(200).json(response);
  }

  /**
   * POST /api/auth/logout -> Clears session cookie
   */
  public logout(req: Request, res: Response): void {
    res.clearCookie('reachinbox_session');
    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' },
      requestId: req.id
    };
    res.status(200).json(response);
  }
}

export const authController = new AuthController();
