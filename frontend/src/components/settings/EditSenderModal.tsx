import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Loader2 } from 'lucide-react';
import { senderApi } from '../../api/sender.api.js';
import { SenderOption } from '../../types/campaign.types.js';

interface EditSenderModalProps {
  isOpen: boolean;
  sender: SenderOption | null;
  onClose: () => void;
  onSaved: (updatedSender: SenderOption) => void;
}

export const EditSenderModal: React.FC<EditSenderModalProps> = ({
  isOpen,
  sender,
  onClose,
  onSaved
}) => {
  const [name, setName] = useState<string>('');
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPass, setSmtpPass] = useState<string>('');
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);
  const [minDelaySeconds, setMinDelaySeconds] = useState<number>(2);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sender) {
      setName(sender.name || '');
      setSmtpHost(sender.smtpHost || 'smtp.ethereal.email');
      setSmtpPort(sender.smtpPort || 587);
      setSmtpUser(sender.smtpUser || sender.email || '');
      setSmtpPass('');
      setHourlyLimit(sender.hourlyLimit || 100);
      setMinDelaySeconds(sender.minDelaySeconds || 2);
      setError(null);
    }
  }, [sender, isOpen]);

  if (!isOpen || !sender) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Sender name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await senderApi.updateSender(sender.id, {
        name: name.trim(),
        smtpHost: smtpHost.trim(),
        smtpPort,
        smtpUser: smtpUser.trim(),
        smtpPass: smtpPass.trim() || undefined,
        hourlyLimit,
        minDelaySeconds
      });
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update sender account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-card)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Edit Sender Mailbox
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sender.email}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="alert-banner alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
              Display Name *
            </label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales Team"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                SMTP Server Host
              </label>
              <input
                type="text"
                className="input-field"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.ethereal.email"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                Port
              </label>
              <input
                type="number"
                className="input-field"
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                SMTP Username
              </label>
              <input
                type="text"
                className="input-field"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="username"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                New Password (optional)
              </label>
              <input
                type="password"
                className="input-field"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="Leave blank to keep current"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                Hourly Limit (emails/hr)
              </label>
              <input
                type="number"
                className="input-field"
                min={1}
                max={10000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                Min Delay (seconds)
              </label>
              <input
                type="number"
                className="input-field"
                min={0}
                max={300}
                value={minDelaySeconds}
                onChange={(e) => setMinDelaySeconds(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Update Sender</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
