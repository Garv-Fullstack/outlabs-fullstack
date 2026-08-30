import { Router } from 'express';
import healthRoutes from './health.routes.js';
import campaignRoutes from './campaign.routes.js';
import authRoutes from './auth.routes.js';
import slackRoutes from './slack.routes.js';
import searchRoutes from './search.routes.js';
import senderRoutes from './sender.routes.js';
import trackingRoutes from './tracking.routes.js';

const router = Router();

// Mount foundational & domain routes
router.use('/', healthRoutes);
router.use('/api', trackingRoutes);
router.use('/api', authRoutes);
router.use('/api', senderRoutes);
router.use('/api', campaignRoutes);
router.use('/api', slackRoutes);
router.use('/api', searchRoutes);

export default router;
