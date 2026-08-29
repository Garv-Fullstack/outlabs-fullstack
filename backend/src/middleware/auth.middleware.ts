import { Request, Response, NextFunction } from 'express';
import { GoogleAuthService, UserSessionPayload } from '../auth/google.auth.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { UserRole } from '@reachinbox/shared';

declare global {
  namespace Express {
    interface Request {
      user?: UserSessionPayload;
    }
  }
}

/**
 * Authentication Middleware: Validates JWT session from HTTP-only cookie or Bearer header
 */
export function authenticateJwt(req: Request, _res: Response, next: NextFunction): void {
  // 1. Try extracting token from HTTP-only cookie
  let token = req.cookies?.['reachinbox_session'];

  // 2. Try extracting token from Authorization header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return next(new UnauthorizedError('Authentication token required'));
  }

  try {
    const decoded = GoogleAuthService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorization Guard: Requires ADMIN role
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    return next(new ForbiddenError('Administrator privileges required'));
  }
  next();
}
