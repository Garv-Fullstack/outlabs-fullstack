import pino from 'pino';

const isProduction = process.env['NODE_ENV'] === 'production';
const isTest = process.env['NODE_ENV'] === 'test';

export const logger = pino({
  level: isTest ? 'silent' : isProduction ? 'info' : 'debug',
  redact: {
    paths: [
      'password',
      '*.password',
      'smtpPass',
      '*.smtpPass',
      'smtpPassEncrypted',
      'accessToken',
      '*.accessToken',
      'accessTokenEnc',
      'jwtSecret',
      'JWT_SECRET',
      'encryptionKey',
      'ENCRYPTION_KEY',
      'DATABASE_URL',
      'REDIS_PASSWORD',
      'authorization',
      'headers.authorization',
      'headers.cookie',
      'cookie'
    ],
    censor: '***REDACTED***'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: !isProduction && !isTest
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    : undefined
});
