import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { googleAuthService, GoogleAuthService } from '../auth/google.auth.js';
import { config } from '../config/env.js';
import { ApiResponse } from '@reachinbox/shared';

export class AuthController {
  /**
   * GET /api/auth/google -> Redirects to Google OAuth consent
   */
  public initiateGoogleLogin(_req: Request, res: Response): void {
    if (!googleAuthService.isConfigured()) {
      res.redirect(
        `${config.FRONTEND_URL}/login?error=${encodeURIComponent('Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env')}`
      );
      return;
    }

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
  public async handleGoogleCallback(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { code, state, error: oauthError, error_description } = req.query;

      // Handle user cancellation or Google-side OAuth error
      if (oauthError) {
        res.clearCookie('oauth_state_google');
        const errorMsg = String(error_description || oauthError || 'Google authentication was cancelled');
        res.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent(errorMsg)}`);
        return;
      }

      const storedState = req.cookies?.['oauth_state_google'];

      if (!state || !storedState || state !== storedState) {
        res.clearCookie('oauth_state_google');
        res.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent('Invalid OAuth CSRF state parameter')}`);
        return;
      }

      if (!code || typeof code !== 'string') {
        res.clearCookie('oauth_state_google');
        res.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent('Authorization code missing in Google callback')}`);
        return;
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
        // The SPA and API are separate origins in production, so browser fetches
        // need an explicitly cross-site session cookie. Keep Lax locally.
        sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect to frontend dashboard
      res.redirect(`${config.FRONTEND_URL}/dashboard`);
    } catch (error: any) {
      res.clearCookie('oauth_state_google');
      const detail = error instanceof Error ? error.message : String(error);
      res.redirect(`${config.FRONTEND_URL}/login?error=${encodeURIComponent(detail)}`);
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
