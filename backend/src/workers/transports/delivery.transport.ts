export interface SendEmailOptions {
  deliveryId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
}

export interface DeliveryResult {
  success: boolean;
  messageId: string;
  previewUrl?: string;
  error?: string;
}

export interface IDeliveryTransport {
  send(options: SendEmailOptions, senderConfig?: any): Promise<DeliveryResult>;
}

/**
 * Mock Transport for Milestone 2 testing and verification.
 * In Milestone 3, this is complemented by the live Ethereal SMTP transporter pool.
 */
export class MockDeliveryTransport implements IDeliveryTransport {
  private shouldFail = false;
  private failureError: Error = new Error('Simulated delivery transport error');

  public setSimulatedFailure(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    if (error) {
      this.failureError = error;
    }
  }

  public async send(options: SendEmailOptions, _senderConfig?: any): Promise<DeliveryResult> {
    if (this.shouldFail) {
      throw this.failureError || new Error('Mock transport failure');
    }

    const messageId = `<mock-${options.deliveryId}@ethereal.email>`;
    const previewUrl = `https://ethereal.email/message/${options.deliveryId}`;

    return {
      success: true,
      messageId,
      previewUrl
    };
  }
}
