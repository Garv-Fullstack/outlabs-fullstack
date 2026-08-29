import { Router } from 'express';
import { senderController } from '../controllers/sender.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/senders', authenticateJwt, (req, res, next) => senderController.getSenders(req, res, next));
router.post('/senders', authenticateJwt, (req, res, next) => senderController.createSender(req, res, next));

export default router;
