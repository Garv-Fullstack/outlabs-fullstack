import React, { useState, useEffect } from 'react';
import { slackApi } from '../../api/slack.api.js';
import { SlackStatusResponse } from '../../types/settings.types.js';
import { MessageSquare, CheckCircle2, AlertCircle, Loader2, ExternalLink, Unlink } from 'lucide-react';

export const SlackSettings: React.FC = () => {
  const [status, setStatus] = useState<SlackStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await slackApi.getStatus();
      setStatus(data);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to fetch Slack status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    window.location.href = slackApi.getConnectUrl();
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Slack rate limit notifications?')) {
      return;
    }

    try {
      setDisconnecting(true);
      setErrorMessage(null);
      await slackApi.disconnect();
      setStatus({ connected: false, status: 'DISCONNECTED' });
      setSuccessMessage('Slack workspace disconnected successfully');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to disconnect Slack');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>Slack Alert Notifications</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Receive real-time Block-Kit notifications when distributed Redis Lua rate limits are triggered
        </p>
      </div>

      {errorMessage && (
        <div className="alert-banner alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert-banner" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#4A154B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Slack Integration</h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Automated rate-limit and delivery failure alerts
              </span>
            </div>
          </div>

          <div>
            {loading ? (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Checking connection...</span>
            ) : status?.connected ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                <CheckCircle2 size={14} />
                <span>Connected & Active</span>
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                <span>Not Connected</span>
              </span>
            )}
          </div>
        </div>

        {status?.connected ? (
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Slack Workspace:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{status.teamName || 'Primary Workspace'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Alert Channel:</span>
              <strong style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                #{status.channelName || 'general'}
              </strong>
            </div>

            <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="btn btn-outline"
                style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', fontSize: '0.8rem' }}
                type="button"
              >
                {disconnecting ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <span>Disconnecting...</span>
                  </>
                ) : (
                  <>
                    <Unlink size={14} />
                    <span>Disconnect Slack</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '16px' }}>
              Connect your Slack workspace using OAuth 2.0. ReachInbox will post rich Block-Kit notifications to your selected channel whenever a sender exceeds their hourly rate limit window.
            </p>
            <button
              onClick={handleConnect}
              className="btn btn-primary"
              style={{ backgroundColor: '#4A154B', borderColor: '#4A154B' }}
              type="button"
            >
              <ExternalLink size={16} />
              <span>Connect Slack Workspace</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
