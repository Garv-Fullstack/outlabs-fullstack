import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '@reachinbox/shared';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const requestId = req.id || 'unknown';

  // Handle Typed App Errors
  if (err instanceof AppError) {
    logger.warn({
      requestId,
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      details: err.details,
      path: req.path,
      method: req.method
    }, 'Operational application error');

    const response: ApiResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      },
      requestId
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Body-parser / Malformed JSON Syntax Errors
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    logger.warn({
      requestId,
      statusCode: 400,
      code: 'MALFORMED_JSON',
      message: err.message,
      path: req.path,
      method: req.method
    }, 'Malformed JSON request body error');

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MALFORMED_JSON',
        message: 'Invalid JSON payload structure'
      },
      requestId
    };
    res.status(400).json(response);
    return;
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    logger.warn({
      requestId,
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      issues: err.issues,
      path: req.path,
      method: req.method
    }, 'Zod request validation error');

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or parameters',
        details: err.issues
      },
      requestId
    };
    res.status(400).json(response);
    return;
  }

  // Handle Unknown / Internal Errors
  logger.error({
    requestId,
    err: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    path: req.path,
    method: req.method
  }, 'Unhandled internal server error');

  const isProd = process.env['NODE_ENV'] === 'production';
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'An unexpected internal error occurred' : err.message
    },
    requestId
  };

  res.status(500).json(response);
};
