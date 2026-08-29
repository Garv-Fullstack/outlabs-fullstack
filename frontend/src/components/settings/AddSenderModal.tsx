import React, { useState } from 'react';
import { senderApi } from '../../api/sender.api.js';
import { SenderOption } from '../../types/campaign.types.js';
import { Mail, Zap, Server, AlertCircle, Loader2, X } from 'lucide-react';

interface AddSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSenderCreated: (sender: SenderOption) => void;
}

export const AddSenderModal: React.FC<AddSenderModalProps> = ({ isOpen, onClose, onSenderCreated }) => {
  const [mode, setMode] = useState<'ETHEREAL' | 'CUSTOM'>('ETHEREAL');

  // Custom Form Fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.ethereal.email');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [minDelaySeconds, setMinDelaySeconds] = useState(2);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      setIsSubmitting(true);

      let created: SenderOption;
      if (mode === 'ETHEREAL') {
        created = await senderApi.createSender({
          email: 'auto-generate@ethereal.email',
          name: name.trim() || 'Ethereal Test Sender',
          generateEthereal: true,
          hourlyLimit,
          minDelaySeconds
        });
      } else {
        if (!email.trim() || !email.includes('@')) {
          setErrorMessage('Please enter a valid sender email address');
          setIsSubmitting(false);
          return;
        }
        if (!name.trim()) {
          setErrorMessage('Please enter a display name for this sender');
          setIsSubmitting(false);
          return;
        }
        if (!smtpPass.trim()) {
          setErrorMessage('SMTP password is required for custom SMTP senders');
          setIsSubmitting(false);
          return;
        }

        created = await senderApi.createSender({
          email: email.trim(),
          name: name.trim(),
          smtpHost: smtpHost.trim(),
          smtpPort,
          smtpUser: smtpUser.trim() || email.trim(),
          smtpPass: smtpPass.trim(),
          hourlyLimit,
          minDelaySeconds,
          generateEthereal: false
        });
      }

      onSenderCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create sender account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '16px',
            top: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
          type="button"
        >
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
          Connect Sender Account
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Register an outbound mailbox for cold email campaigns
        </p>

        {errorMessage && (
          <div className="alert-banner alert-error" style={{ marginBottom: '16px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mode Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setMode('ETHEREAL')}
            className={`btn ${mode === 'ETHEREAL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', justifyContent: 'center' }}
          >
            <Zap size={16} />
            <span>1-Click Ethereal Test</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('CUSTOM')}
            className={`btn ${mode === 'CUSTOM' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', justifyContent: 'center' }}
          >
            <Server size={16} />
            <span>Custom SMTP</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mode === 'ETHEREAL' ? (
            <div style={{
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6'
            }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                🚀 Automated Ethereal Provisioning
              </p>
              Auto-provisions a disposable test SMTP inbox on Ethereal.email. Sent emails generate live test preview links in Delivery Monitoring without hitting real inboxes.
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Sender Email Address *
                </label>
                <input
                  type="email"
                  placeholder="outreach@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Display Name *
                </label>
                <input
                  type="text"
                  placeholder="Alex from Growth"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Port
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value || '587', 10))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    SMTP Username
                  </label>
                  <input
                    type="text"
                    placeholder="Optional (defaults to email)"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    SMTP Password *
                  </label>
                  <input
                    type="password"
                    placeholder="App password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Rate Limits */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Hourly Limit (emails/hr)
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value || '100', 10))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Min Delay (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="3600"
                value={minDelaySeconds}
                onChange={(e) => setMinDelaySeconds(parseInt(e.target.value || '2', 10))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Configuring Sender...</span>
                </>
              ) : (
                <>
                  <Mail size={16} />
                  <span>{mode === 'ETHEREAL' ? 'Provision Ethereal Sender' : 'Save SMTP Sender'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
