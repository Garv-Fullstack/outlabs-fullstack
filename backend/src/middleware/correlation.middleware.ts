import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Respect incoming X-Request-ID if safely formatted, otherwise generate standard UUID v4
  const headerId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = typeof headerId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(headerId)
    ? headerId
    : uuidv4();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
