import React, { useState, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { useAuth } from '../context/AuthContext.js';
import { slackApi } from '../api/slack.api.js';
import { SlackStatusResponse } from '../types/settings.types.js';
import {
  Check,
  ExternalLink,
  Loader2
} from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const { user } = useAuth();
  const [slackStatus, setSlackStatus] = useState<SlackStatusResponse | null>(null);
  const [slackLoading, setSlackLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSlack = async () => {
      try {
        setSlackLoading(true);
        const data = await slackApi.getStatus();
        if (isMounted) {
          setSlackStatus(data);
        }
      } catch (err) {
        console.error('Failed to load Slack status:', err);
      } finally {
        if (isMounted) {
          setSlackLoading(false);
        }
      }
    };

    fetchSlack();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConnectSlack = () => {
    window.location.href = slackApi.getConnectUrl();
  };

  const handleDisconnectSlack = async () => {
    try {
      setSlackLoading(true);
      await slackApi.disconnect();
      setSlackStatus({ connected: false, status: 'DISCONNECTED', channelName: null, teamName: null });
      setActionMessage('Slack integration disconnected');
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert('Failed to disconnect Slack: ' + (err?.message || 'Unknown error'));
    } finally {
      setSlackLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Integrations</h1>
            <p>Connect your communication channels and automation services</p>
          </div>
        </div>

        {actionMessage && (
          <div className="alert-banner alert-success" style={{ marginBottom: '20px' }}>
            <Check size={18} />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* 3x2 GRID OF INTEGRATION CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* 1. Google OAuth */}
          <div className="outbox-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-card-secondary)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem'
                  }}
                >
                  🌐
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Google Workspace Auth</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Identity & Single Sign-On</span>
                </div>
              </div>

              <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} />
                <span>Connected</span>
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Authenticated as <strong>{user?.email || 'Google User'}</strong> with secure JWT session tokens and OpenID profile sync.
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>Active Session</span>
              <span className="badge badge-completed">Verified SSO</span>
            </div>
          </div>

          {/* 2. Slack Integration */}
          <div className="outbox-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-card-secondary)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem'
                  }}
                >
                  💬
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Slack Notifications</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Real-Time Dispatch Alerts</span>
                </div>
              </div>

              {slackLoading ? (
                <Loader2 size={16} className="spin" />
              ) : slackStatus?.connected ? (
                <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} />
                  <span>Connected</span>
                </span>
              ) : (
                <span className="badge badge-paused">Disconnected</span>
              )}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {slackStatus?.connected
                ? `Posting delivery and reply notifications to Slack channel: #${slackStatus.channelName || 'general'}`
                : 'Receive automated notifications in your Slack channels when campaigns finish or high-value leads reply.'}
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'flex-end' }}>
              {slackStatus?.connected ? (
                <button
                  onClick={handleDisconnectSlack}
                  disabled={slackLoading}
                  className="btn btn-outline"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', color: 'var(--danger)' }}
                  type="button"
                >
                  Disconnect Slack
                </button>
              ) : (
                <button
                  onClick={handleConnectSlack}
                  disabled={slackLoading}
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  type="button"
                >
                  <span>Connect Slack</span>
                  <ExternalLink size={13} />
                </button>
              )}
            </div>
          </div>

          {/* 3. SMTP & Ethereal Mail Server */}
          <div className="outbox-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-card-secondary)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem'
                  }}
                >
                  ✉️
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>SMTP Mailer Transport</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Email Dispatch Engine</span>
                </div>
              </div>

              <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} />
                <span>Active Engine</span>
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Integrated with Nodemailer and Ethereal SMTP staging server for real-time delivery previews and rate limiting.
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configured via Settings</span>
              <a href="/settings" className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
                Manage Senders
              </a>
            </div>
          </div>

          {/* 4. BullMQ & Redis Queue */}
          <div className="outbox-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-card-secondary)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem'
                  }}
                >
                  ⚡
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>BullMQ & Redis Queue</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Distributed Dispatch Pipeline</span>
                </div>
              </div>

              <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} />
                <span>Connected</span>
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Manages background email queuing, delayed retry intervals, and leaky-bucket token rate limits.
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>● Redis Worker Running</span>
              <span className="badge badge-completed">Leaky Bucket</span>
            </div>
          </div>

          {/* 5. Elasticsearch */}
          <div className="outbox-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-card-secondary)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem'
                  }}
                >
                  🔍
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Elasticsearch Engine</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Full-Text Search</span>
                </div>
              </div>

              <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} />
                <span>Indexed</span>
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Indexes campaign subjects, delivery recipients, and email content with PostgreSQL fallback search.
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Index: email_deliveries</span>
              <span className="badge badge-completed">Full-Text</span>
            </div>
          </div>

          {/* 6. Webhooks */}
          <div className="outbox-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-card-secondary)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem'
                  }}
                >
                  🔗
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Outbound Webhooks</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Event Streaming</span>
                </div>
              </div>

              <span className="badge badge-completed">Configurable</span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Stream delivery events, opens, and bounce webhooks to your internal analytics or CRM endpoints.
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'flex-end' }}>
              <a href="/settings" className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
                Configure Endpoints
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
