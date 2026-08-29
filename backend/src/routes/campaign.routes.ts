import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/emails/schedule', authenticateJwt, (req, res, next) => campaignController.scheduleCampaign(req, res, next));
router.get('/emails/scheduled', authenticateJwt, (req, res, next) => campaignController.getScheduledDeliveries(req, res, next));
router.get('/emails/sent', authenticateJwt, (req, res, next) => campaignController.getSentDeliveries(req, res, next));
router.get('/emails/stats', authenticateJwt, (req, res, next) => campaignController.getEmailStats(req, res, next));
router.post('/emails/:id/cancel', authenticateJwt, (req, res, next) => campaignController.cancelDelivery(req, res, next));

router.get('/campaigns', authenticateJwt, (req, res, next) => campaignController.getCampaigns(req, res, next));

export default router;
