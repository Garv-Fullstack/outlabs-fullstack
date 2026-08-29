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
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env['GOOGLE_CLIENT_ID'] || 'mock-client-id',
      process.env['GOOGLE_CLIENT_SECRET'] || 'mock-client-secret',
      process.env['GOOGLE_CALLBACK_URL'] || 'http://localhost:5000/api/auth/google/callback'
    );
  }

  /**
   * Generates Google OAuth authorization URL with CSRF state
   */
  public generateAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
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
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env['GOOGLE_CLIENT_ID'] || 'mock-client-id'
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
    } catch (error) {
      logger.error({ error }, 'Google OAuth token exchange error');
      throw new UnauthorizedError('Failed to authenticate with Google OAuth');
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
