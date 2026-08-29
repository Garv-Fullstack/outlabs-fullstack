import { Router } from 'express';
import { slackController } from '../controllers/slack.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/slack/connect', authenticateJwt, (req, res) => slackController.initiateSlackConnect(req, res));
router.get('/slack/callback', (req, res, next) => slackController.handleSlackCallback(req, res, next));
router.get('/slack/status', authenticateJwt, (req, res, next) => slackController.getSlackStatus(req, res, next));
router.post('/slack/disconnect', authenticateJwt, (req, res, next) => slackController.disconnectSlack(req, res, next));

export default router;
