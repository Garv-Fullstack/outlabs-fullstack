import React, { useState } from 'react';
import { SenderOption } from '../../types/campaign.types.js';
import { Mail, Plus, CheckCircle2, Shield, Zap, Server, Edit3, Power, Trash2 } from 'lucide-react';
import { AddSenderModal } from './AddSenderModal.js';
import { EditSenderModal } from './EditSenderModal.js';
import { ConfirmModal } from '../common/ConfirmModal.js';
import { ContextMenu } from '../common/ContextMenu.js';
import { senderApi } from '../../api/sender.api.js';

interface SenderListProps {
  senders: SenderOption[];
  onSenderCreated: (sender: SenderOption) => void;
  onSenderUpdated?: (sender: SenderOption) => void;
  onSenderDeleted?: (senderId: string) => void;
  loading: boolean;
}

export const SenderList: React.FC<SenderListProps> = ({
  senders,
  onSenderCreated,
  onSenderUpdated,
  onSenderDeleted,
  loading
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSender, setEditingSender] = useState<SenderOption | null>(null);
  const [deletingSender, setDeletingSender] = useState<SenderOption | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleToggleStatus = async (sender: SenderOption) => {
    try {
      setActionLoading(true);
      const updated = await senderApi.toggleSenderStatus(sender.id);
      if (onSenderUpdated) onSenderUpdated(updated);
      setActionNotice(`Sender ${sender.email} is now ${updated.isActive ? 'Active' : 'Inactive'}`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert('Failed to toggle status: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSender) return;
    try {
      setActionLoading(true);
      const res = await senderApi.deleteSender(deletingSender.id);
      if (onSenderDeleted) onSenderDeleted(deletingSender.id);
      setDeletingSender(null);
      setActionNotice(res.message || 'Sender deleted successfully');
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert('Failed to delete sender: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>Sender Mailbox Accounts</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Configured outbound SMTP inboxes for staggered campaign delivery
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-primary"
          type="button"
        >
          <Plus size={16} />
          <span>Add Sender</span>
        </button>
      </div>

      {actionNotice && (
        <div className="alert-banner alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {loading && senders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading sender mailboxes...</p>
        </div>
      ) : senders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto'
          }}>
            <Mail size={22} />
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px' }}>No senders connected</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 16px auto' }}>
            Add your first custom SMTP server or provision a 1-click Ethereal test inbox to begin sending cold emails.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary"
            type="button"
          >
            <Plus size={16} />
            <span>Connect First Sender</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {senders.map((sender) => {
            const isEthereal = sender.smtpHost.includes('ethereal.email');

            return (
              <div key={sender.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isEthereal ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: isEthereal ? 'var(--accent-primary)' : 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isEthereal ? <Zap size={18} /> : <Server size={18} />}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{sender.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {sender.email}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: sender.isActive ? 'var(--success-bg)' : 'rgba(148, 163, 184, 0.1)',
                      color: sender.isActive ? 'var(--success)' : 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      <CheckCircle2 size={12} />
                      <span>{sender.isActive ? 'Active' : 'Inactive'}</span>
                    </span>

                    <ContextMenu
                      ariaLabel={`Options for sender ${sender.email}`}
                      items={[
                        {
                          id: 'edit',
                          label: 'Edit Settings',
                          icon: <Edit3 size={14} />,
                          onClick: () => setEditingSender(sender)
                        },
                        {
                          id: 'toggle',
                          label: sender.isActive ? 'Deactivate Mailbox' : 'Activate Mailbox',
                          icon: <Power size={14} />,
                          variant: sender.isActive ? 'warning' : 'primary',
                          onClick: () => handleToggleStatus(sender)
                        },
                        {
                          id: 'delete',
                          label: 'Delete Sender',
                          icon: <Trash2 size={14} />,
                          variant: 'danger',
                          divider: true,
                          onClick: () => setDeletingSender(sender)
                        }
                      ]}
                    />
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>SMTP Relay:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {sender.smtpHost}:{sender.smtpPort}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Hourly Quota:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sender.hourlyLimit} emails/hour
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Inter-Email Delay:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sender.minDelaySeconds} seconds
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Shield size={12} color="var(--success)" />
                  <span>Encrypted via AES-256-GCM at rest</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddSenderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSenderCreated={onSenderCreated}
      />

      <EditSenderModal
        isOpen={!!editingSender}
        sender={editingSender}
        onClose={() => setEditingSender(null)}
        onSaved={(updated) => {
          if (onSenderUpdated) onSenderUpdated(updated);
        }}
      />

      <ConfirmModal
        isOpen={!!deletingSender}
        title="Delete Sender Mailbox?"
        message={`Are you sure you want to delete sender mailbox "${deletingSender?.email}"? This operation cannot be undone. Any active scheduled deliveries must be cancelled first.`}
        confirmText="Delete Sender"
        variant="danger"
        loading={actionLoading}
        onClose={() => setDeletingSender(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

