export interface CreateSenderPayload {
  email: string;
  name: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  hourlyLimit?: number;
  minDelaySeconds?: number;
  generateEthereal?: boolean;
}

export interface SlackStatusResponse {
  connected: boolean;
  teamName?: string | null;
  channelName?: string | null;
  status: 'ACTIVE' | 'DISCONNECTED';
}
