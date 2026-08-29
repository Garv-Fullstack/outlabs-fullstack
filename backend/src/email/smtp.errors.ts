export class DeliveryError extends Error {
  public readonly isRetryable: boolean;
  public readonly statusCode?: number;
  public readonly code: string;

  constructor(message: string, isRetryable = false, code = 'DELIVERY_ERROR', statusCode?: number) {
    super(message);
    this.isRetryable = isRetryable;
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RetryableDeliveryError extends DeliveryError {
  constructor(message: string, code = 'RETRYABLE_DELIVERY_ERROR', statusCode?: number) {
    super(message, true, code, statusCode);
  }
}

export class NonRetryableDeliveryError extends DeliveryError {
  constructor(message: string, code = 'NON_RETRYABLE_DELIVERY_ERROR', statusCode?: number) {
    super(message, false, code, statusCode);
  }
}

/**
 * Classifies an SMTP or network error as either retryable or non-retryable
 */
export function classifySmtpError(error: unknown): DeliveryError {
  if (error instanceof DeliveryError) {
    return error;
  }

  const err = error as {
    message?: string;
    code?: string;
    responseCode?: number;
    command?: string;
    response?: string;
  };

  const message = err?.message || 'Unknown SMTP error';
  const responseCode = err?.responseCode || 0;
  const code = err?.code || '';

  // 1. Permanent SMTP 5xx errors (e.g. 535 Auth Failed, 550 Mailbox Not Found, 501 Syntax Error)
  if (responseCode >= 500 && responseCode < 600) {
    if (responseCode === 535) {
      return new NonRetryableDeliveryError(`SMTP Authentication Failed (535): ${message}`, 'SMTP_AUTH_FAILED', responseCode);
    }
    if (responseCode === 550 || responseCode === 551 || responseCode === 553) {
      return new NonRetryableDeliveryError(`Recipient rejected or mailbox unavailable (${responseCode}): ${message}`, 'RECIPIENT_REJECTED', responseCode);
    }
    return new NonRetryableDeliveryError(`Permanent SMTP 5xx error (${responseCode}): ${message}`, 'SMTP_PERMANENT_ERROR', responseCode);
  }

  // 2. Transient SMTP 4xx errors (e.g. 421 Service Unavailable, 451 Local Error, 452 Storage Limit)
  if (responseCode >= 400 && responseCode < 500) {
    return new RetryableDeliveryError(`Transient SMTP 4xx error (${responseCode}): ${message}`, 'SMTP_TRANSIENT_ERROR', responseCode);
  }

  // 3. Network & Connection errors (Connection drops, timeouts, DNS failures)
  const retryableCodes = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'ENOTFOUND', 'ESOCKETTIMEDOUT'];
  if (code && retryableCodes.includes(code.toUpperCase())) {
    return new RetryableDeliveryError(`Network connectivity failure (${code}): ${message}`, 'NETWORK_ERROR');
  }

  // 4. Default: Treat unexpected runtime errors as retryable unless explicitly permanent
  return new RetryableDeliveryError(`Unclassified delivery error: ${message}`, 'UNCLASSIFIED_ERROR');
}
