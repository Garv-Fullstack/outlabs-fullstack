import React from 'react';
import { Clock, Loader2, CheckCircle2, XCircle, Ban, Hourglass } from 'lucide-react';

export const DeliveryStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'SCHEDULED':
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--info-bg)',
          color: 'var(--info)',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          <Clock size={12} />
          <span>Scheduled</span>
        </span>
      );

    case 'PROCESSING':
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--warning-bg)',
          color: 'var(--warning)',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          <Loader2 size={12} className="spin" />
          <span>Processing</span>
        </span>
      );

    case 'SENT':
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success)',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={12} />
          <span>Sent</span>
        </span>
      );

    case 'FAILED':
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger)',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          <XCircle size={12} />
          <span>Failed</span>
        </span>
      );

    case 'CANCELLED':
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(148, 163, 184, 0.1)',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          <Ban size={12} />
          <span>Cancelled</span>
        </span>
      );

    case 'RATE_LIMITED_DELAYED':
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(249, 115, 22, 0.15)',
          color: '#f97316',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          <Hourglass size={12} />
          <span>Rate-Limited (Delayed)</span>
        </span>
      );

    default:
      return (
        <span style={{
          display: 'inline-flex',
          padding: '3px 9px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          {status}
        </span>
      );
  }
};
