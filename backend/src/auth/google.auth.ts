import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../repositories/prisma.js';
import { UserRole } from '@reachinbox/shared';
import { UnauthorizedError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface UserSessionPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export class GoogleAuthService {
  /**
   * Checks whether Google OAuth is configured with real credentials
   */
  public isConfigured(): boolean {
    const clientId = config.GOOGLE_CLIENT_ID || process.env['GOOGLE_CLIENT_ID'] || '';
    const clientSecret = config.GOOGLE_CLIENT_SECRET || process.env['GOOGLE_CLIENT_SECRET'] || '';
    return Boolean(
      clientId &&
      clientSecret &&
      !clientId.includes('mock-client-id') &&
      !clientId.includes('your_google_client_id')
    );
  }

  /**
   * Instantiates or returns configured OAuth2Client instance
   */
  public getOAuth2Client(): OAuth2Client {
    const clientId = config.GOOGLE_CLIENT_ID || process.env['GOOGLE_CLIENT_ID'] || '';
    const clientSecret = config.GOOGLE_CLIENT_SECRET || process.env['GOOGLE_CLIENT_SECRET'] || '';
    const redirectUri = config.GOOGLE_CALLBACK_URL || process.env['GOOGLE_CALLBACK_URL'] || 'http://localhost:5000/api/auth/google/callback';

    return new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  /**
   * Generates Google OAuth authorization URL with CSRF state
   */
  public generateAuthUrl(state: string): string {
    const client = this.getOAuth2Client();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state
    });
  }

  /**
   * Exchanges authorization code for Google profile and upserts user in PostgreSQL
   */
  public async exchangeCodeAndUpsertUser(code: string): Promise<UserSessionPayload> {
    try {
      const client = this.getOAuth2Client();
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      if (!tokens.id_token) {
        throw new UnauthorizedError('Google OAuth did not return an ID token');
      }

      const clientId = config.GOOGLE_CLIENT_ID || process.env['GOOGLE_CLIENT_ID'] || undefined;
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.sub) {
        throw new UnauthorizedError('Invalid Google token payload');
      }

      const googleId = payload.sub;
      const email = payload.email.toLowerCase().trim();
      const name = payload.name || email.split('@')[0] || 'ReachInbox User';
      const avatarUrl = payload.picture || null;

      // Upsert User in PostgreSQL
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          googleId,
          name,
          avatarUrl
        },
        create: {
          googleId,
          email,
          name,
          avatarUrl,
          role: UserRole.USER
        }
      });

      logger.info({ userId: user.id, email: user.email }, 'User authenticated successfully via Google OAuth');

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole
      };
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error({ error: msg }, 'Google OAuth token exchange error');
      throw new UnauthorizedError(`Failed to authenticate with Google OAuth: ${msg}`);
    }
  }

  /**
   * Signs a JWT session token for the user
   */
  public static signToken(user: UserSessionPayload, expiresIn = '7d'): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      config.JWT_SECRET,
      { expiresIn: expiresIn as any }
    );
  }

  /**
   * Verifies and decodes a signed JWT session token
   */
  public static verifyToken(token: string): UserSessionPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as UserSessionPayload;
      return {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      };
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication session token');
    }
  }
}

export const googleAuthService = new GoogleAuthService();
