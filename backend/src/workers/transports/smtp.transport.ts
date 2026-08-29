import nodemailer from 'nodemailer';
import { IDeliveryTransport, SendEmailOptions, DeliveryResult } from './delivery.transport.js';
import { smtpPool, SmtpTransporterPool, SenderSmtpConfig } from '../../email/smtp.pool.js';
import { NonRetryableDeliveryError, classifySmtpError } from '../../email/smtp.errors.js';
import { logger } from '../../utils/logger.js';

export interface SmtpTransportOptions extends SendEmailOptions {
  senderConfig: SenderSmtpConfig;
}

export class NodemailerSmtpTransport implements IDeliveryTransport {
  private pool: SmtpTransporterPool;

  constructor(customPool?: SmtpTransporterPool) {
    this.pool = customPool || smtpPool;
  }

  public async send(options: SendEmailOptions, senderConfig?: SenderSmtpConfig): Promise<DeliveryResult> {
    if (!senderConfig) {
      throw new NonRetryableDeliveryError('Sender configuration required for live SMTP transport', 'MISSING_SENDER_CONFIG');
    }

    if (!senderConfig.smtpHost || !senderConfig.smtpPort || !senderConfig.smtpUser || !senderConfig.smtpPassEncrypted) {
      throw new NonRetryableDeliveryError(
        `Incomplete SMTP configuration for sender ${senderConfig.id || senderConfig.email || 'unknown'}: host, port, user, and password are required`,
        'INVALID_SMTP_CONFIG'
      );
    }

    try {
      const transporter = this.pool.getTransporter(senderConfig);

      const mailOptions = {
        from: `"${options.senderName}" <${options.senderEmail}>`,
        to: options.recipientName
          ? `"${options.recipientName}" <${options.recipientEmail}>`
          : options.recipientEmail,
        subject: options.subject,
        text: options.bodyText,
        html: options.bodyHtml || undefined,
        headers: {
          'X-ReachInbox-Delivery-ID': options.deliveryId,
          'X-ReachInbox-Sender-ID': options.senderId
        }
      };

      const info = await transporter.sendMail(mailOptions);

      // Extract Ethereal test message URL if available
      const previewUrl = nodemailer.getTestMessageUrl(info);

      logger.info({
        deliveryId: options.deliveryId,
        messageId: info.messageId,
        previewUrl: previewUrl || undefined
      }, 'Nodemailer sent email successfully');

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: previewUrl ? String(previewUrl) : undefined
      };
    } catch (error) {
      const classified = classifySmtpError(error);
      logger.error({
        deliveryId: options.deliveryId,
        isRetryable: classified.isRetryable,
        code: classified.code,
        message: classified.message
      }, 'Nodemailer delivery failure');
      throw classified;
    }
  }
}

export const nodemailerTransport = new NodemailerSmtpTransport();
