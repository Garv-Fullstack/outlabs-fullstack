import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { prisma } from '../repositories/prisma.js';
import { encryptCredential } from '../utils/crypto.js';
import { ApiResponse, SenderAccountDTO } from '@reachinbox/shared';
import { ValidationError, ConflictError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const createSenderSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  smtpHost: z.string().min(1).default('smtp.ethereal.email'),
  smtpPort: z.coerce.number().int().positive().default(587),
  smtpUser: z.string().min(1).optional(),
  smtpPass: z.string().min(1).optional(),
  hourlyLimit: z.coerce.number().int().positive().default(100),
  minDelaySeconds: z.coerce.number().int().nonnegative().default(2),
  generateEthereal: z.boolean().optional().default(false)
});

export class SenderController {
  /**
   * GET /api/senders -> Lists active and configured senders for the authenticated user
   */
  public async getSenders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      const senders = await prisma.senderAccount.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          email: true,
          name: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          hourlyLimit: true,
          minDelaySeconds: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      const response: ApiResponse<SenderAccountDTO[]> = {
        success: true,
        data: senders.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString()
        })),
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/senders -> Registers a new sender or provisions an Ethereal test account
   */
  public async createSender(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const validated = createSenderSchema.parse(req.body);

      let smtpHost = validated.smtpHost;
      let smtpPort = validated.smtpPort;
      let smtpUser = validated.smtpUser || validated.email;
      let smtpPass = validated.smtpPass;
      let email = validated.email;
      let name = validated.name;

      // Auto-provision real Ethereal test account if requested
      if (validated.generateEthereal || (!validated.smtpPass && smtpHost.includes('ethereal.email'))) {
        try {
          const testAccount = await nodemailer.createTestAccount();
          smtpHost = testAccount.smtp.host;
          smtpPort = testAccount.smtp.port;
          smtpUser = testAccount.user;
          smtpPass = testAccount.pass;
          if (validated.generateEthereal) {
            email = testAccount.user;
            name = name || 'Ethereal Test Sender';
          }
          logger.info({ user: testAccount.user }, 'Provisioned new Ethereal test account');
        } catch (etherealErr) {
          logger.warn({ etherealErr }, 'Failed to auto-create Ethereal account, falling back to submitted credentials');
        }
      }

      if (!smtpPass) {
        throw new ValidationError('SMTP password is required to configure a sender');
      }

      // Check duplicate email for same user
      const existing = await prisma.senderAccount.findFirst({
        where: {
          userId,
          email: { equals: email, mode: 'insensitive' }
        }
      });

      if (existing) {
        throw new ConflictError(`Sender with email ${email} already exists for this account`);
      }

      // Encrypt password at rest
      const smtpPassEncrypted = encryptCredential(smtpPass);

      const sender = await prisma.senderAccount.create({
        data: {
          userId,
          email,
          name,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPassEncrypted,
          hourlyLimit: validated.hourlyLimit,
          minDelaySeconds: validated.minDelaySeconds,
          isActive: true
        },
        select: {
          id: true,
          userId: true,
          email: true,
          name: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          hourlyLimit: true,
          minDelaySeconds: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      logger.info({ senderId: sender.id, userId, email: sender.email }, 'Sender account created successfully');

      const response: ApiResponse<SenderAccountDTO> = {
        success: true,
        data: {
          ...sender,
          createdAt: sender.createdAt.toISOString(),
          updatedAt: sender.updatedAt.toISOString()
        },
        requestId: req.id
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const senderController = new SenderController();
