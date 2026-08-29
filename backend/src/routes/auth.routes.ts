import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/auth/google', (req, res) => authController.initiateGoogleLogin(req, res));
router.get('/auth/google/callback', (req, res, next) => authController.handleGoogleCallback(req, res, next));
router.get('/auth/me', authenticateJwt, (req, res) => authController.getCurrentUser(req, res));
router.post('/auth/logout', authenticateJwt, (req, res) => authController.logout(req, res));

export default router;
