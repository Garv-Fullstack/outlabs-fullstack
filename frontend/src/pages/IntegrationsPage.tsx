import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import {
  X,
  Check
} from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState([
    {
      id: 'gmail',
      name: 'Gmail',
      desc: 'Sync your Gmail account for seamless direct sending',
      icon: '✉️',
      connected: true,
      category: 'Email'
    },
    {
      id: 'gcal',
      name: 'Google Calendar',
      desc: 'Schedule and track prospect meetings effortlessly',
      icon: '📅',
      connected: true,
      category: 'Calendar'
    },
    {
      id: 'slack',
      name: 'Slack',
      desc: 'Get real-time notification alerts when high-value leads reply',
      icon: '💬',
      connected: false,
      category: 'Notifications'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      desc: 'Send automated WhatsApp messages for priority follow-ups',
      icon: '📱',
      connected: false,
      category: 'Messaging'
    },
    {
      id: 'zapier',
      name: 'Zapier',
      desc: 'Automate workflows and connect with 5,000+ business applications',
      icon: '⚡',
      connected: false,
      category: 'Automation'
    },
    {
      id: 'webhook',
      name: 'Webhook',
      desc: 'Deliver outbound HTTP events to your custom endpoints',
      icon: '🔗',
      connected: false,
      category: 'Developer'
    }
  ]);

  const [activeModal, setActiveModal] = useState<string | null>(null);

  const toggleConnection = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, connected: !item.connected } : item
      )
    );
    setActiveModal(null);
  };

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Integrations</h1>
            <p>Connect your favorite tools and services</p>
          </div>
        </div>

        {/* 3x2 GRID OF INTEGRATION CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {integrations.map((item) => (
            <div
              key={item.id}
              className="outbox-card"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}
            >
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
                    {item.icon}
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{item.name}</h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.category}</span>
                  </div>
                </div>

                {item.connected && (
                  <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={12} />
                    <span>Connected</span>
                  </span>
                )}
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {item.desc}
              </p>

              <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'flex-end' }}>
                {item.connected ? (
                  <button
                    onClick={() => setActiveModal(item.id)}
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    Manage
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveModal(item.id)}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* MODAL */}
        {activeModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '440px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Configure Integration</h3>
                <button onClick={() => setActiveModal(null)} style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Manage authorization and authentication tokens for this external connection.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={() => setActiveModal(null)} className="btn btn-outline" type="button">
                  Cancel
                </button>
                <button
                  onClick={() => toggleConnection(activeModal)}
                  className="btn btn-primary"
                  type="button"
                >
                  {integrations.find((i) => i.id === activeModal)?.connected ? 'Disconnect' : 'Authorize & Connect'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
