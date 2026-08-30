import { Router } from 'express';
import { trackingController } from '../controllers/tracking.controller.js';

const router = Router();

// Public endpoints (no JWT auth required)
router.get('/track/open/:trackingToken', (req, res, next) => trackingController.trackOpen(req, res, next));
router.get('/track/click/:trackingToken', (req, res, next) => trackingController.trackClick(req, res, next));

export default router;
