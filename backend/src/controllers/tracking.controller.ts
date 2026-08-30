import { Request, Response, NextFunction } from 'express';
import { prisma } from '../repositories/prisma.js';
import { isEligibleForClickTracking } from '../tracking/email.instrumenter.js';
import { logger } from '../utils/logger.js';

// Base64 encoded 1x1 transparent GIF image
const TRANSPARENT_1X1_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export class TrackingController {
  /**
   * Sets strict anti-caching HTTP response headers for open tracking pixel
   */
  private setAntiCacheHeaders(res: Response): void {
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': TRANSPARENT_1X1_GIF.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }

  /**
   * GET /api/track/open/:trackingToken
   * Public tracking endpoint for recording email opens.
   * Does NOT require authentication. Looks up delivery by unguessable trackingToken.
   * Always responds with a 1x1 transparent GIF and anti-caching headers.
   */
  public async trackOpen(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const { trackingToken } = req.params;

    this.setAntiCacheHeaders(res);

    if (!trackingToken || typeof trackingToken !== 'string' || trackingToken.trim() === '') {
      res.status(200).send(TRANSPARENT_1X1_GIF);
      return;
    }

    try {
      const delivery = await prisma.emailDelivery.findUnique({
        where: { trackingToken: trackingToken.trim() },
        select: { id: true, campaignId: true, userId: true }
      });

      if (delivery) {
        await prisma.emailEngagementEvent.create({
          data: {
            deliveryId: delivery.id,
            campaignId: delivery.campaignId,
            userId: delivery.userId,
            eventType: 'OPENED',
            trackedAt: new Date(),
            destinationUrl: null
          }
        });
        logger.debug({ deliveryId: delivery.id, trackingToken }, 'Tracked email OPENED event');
      } else {
        logger.warn({ trackingToken }, 'Open tracking pixel requested with unknown trackingToken');
      }
    } catch (err) {
      logger.error({ err, trackingToken }, 'Error recording email OPENED event');
    }

    res.status(200).send(TRANSPARENT_1X1_GIF);
  }

  /**
   * GET /api/track/click/:trackingToken?url=<destinationUrl>
   * Public tracking endpoint for recording link clicks and redirecting to the target URL.
   * Does NOT require authentication. Validates destination protocol (http/https only).
   */
  public async trackClick(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const { trackingToken } = req.params;
    const rawDestination = req.query['url'];

    if (!rawDestination || typeof rawDestination !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Destination URL is required'
        }
      });
      return;
    }

    const trimmedUrl = rawDestination.trim();

    // Protocol check: Only permit standard http: and https: protocols
    if (!isEligibleForClickTracking(trimmedUrl)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'UNSAFE_URL_PROTOCOL',
          message: 'Only http: and https: destination URLs are permitted'
        }
      });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      res.status(400).json({
        success: false,
        error: {
          code: 'MALFORMED_URL',
          message: 'Destination URL is malformed'
        }
      });
      return;
    }

    if (!trackingToken || typeof trackingToken !== 'string' || trackingToken.trim() === '') {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TRACKING_TOKEN',
          message: 'Tracking token is required'
        }
      });
      return;
    }

    try {
      const delivery = await prisma.emailDelivery.findUnique({
        where: { trackingToken: trackingToken.trim() },
        select: { id: true, campaignId: true, userId: true }
      });

      if (!delivery) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DELIVERY_NOT_FOUND',
            message: 'Tracking delivery token not found'
          }
        });
        return;
      }

      // Record CLICKED event in PostgreSQL
      await prisma.emailEngagementEvent.create({
        data: {
          deliveryId: delivery.id,
          campaignId: delivery.campaignId,
          userId: delivery.userId,
          eventType: 'CLICKED',
          trackedAt: new Date(),
          destinationUrl: parsedUrl.href
        }
      });

      logger.debug({ deliveryId: delivery.id, destinationUrl: parsedUrl.href }, 'Tracked email CLICKED event');
      res.redirect(302, parsedUrl.href);
    } catch (err) {
      logger.error({ err, trackingToken, destinationUrl: parsedUrl.href }, 'Error processing click tracking');
      // If event recording fails, still safely redirect user to destination URL
      res.redirect(302, parsedUrl.href);
    }
  }
}

export const trackingController = new TrackingController();
