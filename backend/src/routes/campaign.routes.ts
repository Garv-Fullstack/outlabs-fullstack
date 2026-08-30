import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller.js';
import { healthController } from '../controllers/health.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/queues/metrics', authenticateJwt, (req, res, next) => healthController.getQueueMetrics(req, res, next));

router.post('/emails/schedule', authenticateJwt, (req, res, next) => campaignController.scheduleCampaign(req, res, next));
router.get('/emails/scheduled', authenticateJwt, (req, res, next) => campaignController.getScheduledDeliveries(req, res, next));
router.get('/emails/sent', authenticateJwt, (req, res, next) => campaignController.getSentDeliveries(req, res, next));
router.get('/emails/stats', authenticateJwt, (req, res, next) => campaignController.getEmailStats(req, res, next));
router.get('/emails/timeline', authenticateJwt, (req, res, next) => campaignController.getEmailTimeline(req, res, next));
router.get('/emails/activities', authenticateJwt, (req, res, next) => campaignController.getRecentActivities(req, res, next));
router.post('/emails/:id/cancel', authenticateJwt, (req, res, next) => campaignController.cancelDelivery(req, res, next));
router.post('/emails/:id/retry', authenticateJwt, (req, res, next) => campaignController.retryDelivery(req, res, next));
router.delete('/emails/:id', authenticateJwt, (req, res, next) => campaignController.deleteDelivery(req, res, next));

router.get('/campaigns', authenticateJwt, (req, res, next) => campaignController.getCampaigns(req, res, next));
router.get('/campaigns/:id', authenticateJwt, (req, res, next) => campaignController.getCampaignById(req, res, next));
router.put('/campaigns/:id', authenticateJwt, (req, res, next) => campaignController.updateCampaign(req, res, next));
router.post('/campaigns/:id/pause', authenticateJwt, (req, res, next) => campaignController.pauseCampaign(req, res, next));
router.post('/campaigns/:id/resume', authenticateJwt, (req, res, next) => campaignController.resumeCampaign(req, res, next));
router.post('/campaigns/:id/cancel', authenticateJwt, (req, res, next) => campaignController.cancelCampaign(req, res, next));
router.delete('/campaigns/:id', authenticateJwt, (req, res, next) => campaignController.deleteCampaign(req, res, next));

export default router;

