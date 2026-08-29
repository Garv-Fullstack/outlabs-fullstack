import { createApp } from './app.js';
import { config, getRedactedConfig } from './config/env.js';
import { logger } from './utils/logger.js';
import { disconnectPrisma } from './repositories/prisma.js';
import { disconnectRedis } from './repositories/redis.js';
import http from 'http';

const app = createApp();
const server = http.createServer(app);

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring extra signal');
    return;
  }
  isShuttingDown = true;

  logger.info({ signal }, 'Received shutdown signal, terminating server gracefully...');

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error while closing HTTP server');
    } else {
      logger.info('HTTP server closed successfully');
    }

    try {
      // Disconnect persistence layers
      await disconnectPrisma();
      await disconnectRedis();
      logger.info('All resources released cleanly. Exiting.');
      process.exit(0);
    } catch (shutdownError) {
      logger.error({ shutdownError }, 'Error during resource teardown');
      process.exit(1);
    }
  });

  // Force shutdown if cleanup hangs
  setTimeout(() => {
    logger.fatal('Graceful shutdown timed out (10s). Forcing process exit.');
    process.exit(1);
  }, 10000).unref();
}

// Register process signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception');
  process.exit(1);
});

// Start listening
server.listen(config.PORT, () => {
  logger.info(
    {
      port: config.PORT,
      env: config.NODE_ENV,
      config: getRedactedConfig(config)
    },
    'ReachInbox Backend Server initialized successfully'
  );
});
