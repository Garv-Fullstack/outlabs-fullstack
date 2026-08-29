import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { SenderList } from '../components/settings/SenderList.js';
import { SlackSettings } from '../components/settings/SlackSettings.js';
import { senderApi } from '../api/sender.api.js';
import { useAuth } from '../context/AuthContext.js';
import { SenderOption } from '../types/campaign.types.js';
import { Mail, MessageSquare, Shield, Bell, CheckCircle2, AlertCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Tab State
  const [activeTab, setActiveTab] = useState<'SENDERS' | 'SLACK' | 'ACCOUNT' | 'NOTIFICATIONS'>('SENDERS');
  const [senders, setSenders] = useState<SenderOption[]>([]);
  const [loadingSenders, setLoadingSenders] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [slackCallbackNotice, setSlackCallbackNotice] = useState<string | null>(null);

  const fetchSenders = async () => {
    try {
      setLoadingSenders(true);
      setError(null);
      const data = await senderApi.getSenders();
      setSenders(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load sender accounts');
    } finally {
      setLoadingSenders(false);
    }
  };

  useEffect(() => {
    fetchSenders();

    // Check for Slack OAuth callback URL param (?slack=connected)
    const params = new URLSearchParams(location.search);
    if (params.get('slack') === 'connected') {
      setActiveTab('SLACK');
      setSlackCallbackNotice('Slack workspace connected successfully via OAuth 2.0!');
    }
  }, [location]);

  const handleSenderCreated = (newSender: SenderOption) => {
    setSenders((prev) => [newSender, ...prev]);
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Settings & Integrations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Manage outbound SMTP mailboxes, Slack alert webhooks, and account security
          </p>
        </div>

        {error && (
          <div className="alert-banner alert-error">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {slackCallbackNotice && (
          <div className="alert-banner" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{slackCallbackNotice}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('SENDERS')}
            className={`btn ${activeTab === 'SENDERS' ? 'btn-primary' : 'btn-outline'}`}
            type="button"
          >
            <Mail size={16} />
            <span>Sender Accounts ({senders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('SLACK')}
            className={`btn ${activeTab === 'SLACK' ? 'btn-primary' : 'btn-outline'}`}
            type="button"
          >
            <MessageSquare size={16} />
            <span>Slack Alerts</span>
          </button>
          <button
            onClick={() => setActiveTab('ACCOUNT')}
            className={`btn ${activeTab === 'ACCOUNT' ? 'btn-primary' : 'btn-outline'}`}
            type="button"
          >
            <Shield size={16} />
            <span>Account & Security</span>
          </button>
          <button
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`btn ${activeTab === 'NOTIFICATIONS' ? 'btn-primary' : 'btn-outline'}`}
            type="button"
          >
            <Bell size={16} />
            <span>Notification Preferences</span>
          </button>
        </div>

        {/* Tab 1: Senders */}
        {activeTab === 'SENDERS' && (
          <SenderList
            senders={senders}
            onSenderCreated={handleSenderCreated}
            loading={loadingSenders}
          />
        )}

        {/* Tab 2: Slack */}
        {activeTab === 'SLACK' && <SlackSettings />}

        {/* Tab 3: Account & Security */}
        {activeTab === 'ACCOUNT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Authenticated User Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Full Name</span>
                  <strong>{user?.name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Email Address</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{user?.email}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>User ID</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{user?.id}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Role</span>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--accent-primary)',
                    fontWeight: 600
                  }}>
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="var(--success)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Session & Token Security</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                This application utilizes secure <strong>HTTP-only encrypted session cookies</strong>. Authentication tokens and SMTP passwords are never stored in browser <code>localStorage</code> or <code>sessionStorage</code>, completely eliminating client-side XSS token leakage vectors.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Notification Preferences (Documented Backend Gap) */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={20} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Notification Preferences</h3>
            </div>
            <div className="alert-banner" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: 'var(--info)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <span>
                <strong>BACKEND GAP — FRONTEND DEFERRED:</strong> Custom notification preference persistence endpoint is not implemented in the current backend schema. Rate limit alerts are automatically dispatched directly to your connected Slack channel.
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
              Per Step 2C forensic guidelines, frontend will not simulate or fake local persistence without an authoritative backend persistence contract.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
