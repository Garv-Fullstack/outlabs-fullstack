import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/emails/search', authenticateJwt, (req, res, next) => searchController.searchEmails(req, res, next));

export default router;
