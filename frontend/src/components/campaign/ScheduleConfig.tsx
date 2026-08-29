import React from 'react';
import { Calendar, Clock, Gauge } from 'lucide-react';
import { SenderOption } from '../../types/campaign.types.js';

interface ScheduleConfigProps {
  scheduledStartTime: string;
  onScheduledStartTimeChange: (time: string) => void;
  delayBetweenEmailsSeconds: number;
  onDelayChange: (delay: number) => void;
  hourlyLimit: number;
  onHourlyLimitChange: (limit: number) => void;
  selectedSender?: SenderOption | null;
}

export const ScheduleConfig: React.FC<ScheduleConfigProps> = ({
  scheduledStartTime,
  onScheduledStartTimeChange,
  delayBetweenEmailsSeconds,
  onDelayChange,
  hourlyLimit,
  onHourlyLimitChange,
  selectedSender
}) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '20px',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px'
    }}>
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
          <Calendar size={16} color="var(--accent-primary)" />
          <span>Scheduled Start Time</span>
        </label>
        <input
          type="datetime-local"
          value={scheduledStartTime}
          onChange={(e) => onScheduledStartTimeChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontFamily: 'inherit'
          }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
          Timezone: Local / UTC Synced with BullMQ
        </span>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
          <Clock size={16} color="var(--accent-primary)" />
          <span>Inter-Email Delay (Seconds)</span>
        </label>
        <input
          type="number"
          min="0"
          max="3600"
          value={delayBetweenEmailsSeconds}
          onChange={(e) => onDelayChange(Math.max(0, parseInt(e.target.value || '0', 10)))}
          style={{
            width: '100%',
            padding: '10px 14px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontFamily: 'inherit'
          }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
          Sender minimum delay: {selectedSender ? `${selectedSender.minDelaySeconds}s` : '2s'}
        </span>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
          <Gauge size={16} color="var(--accent-primary)" />
          <span>Hourly Rate Limit (Emails/Hour)</span>
        </label>
        <input
          type="number"
          min="1"
          max="10000"
          value={hourlyLimit}
          onChange={(e) => onHourlyLimitChange(Math.max(1, parseInt(e.target.value || '1', 10)))}
          style={{
            width: '100%',
            padding: '10px 14px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            fontFamily: 'inherit'
          }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
          Enforced atomically via Redis Lua tokens: {selectedSender ? `Default ${selectedSender.hourlyLimit}/hr` : '100/hr'}
        </span>
      </div>
    </div>
  );
};
