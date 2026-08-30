import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { useAuth } from '../context/AuthContext.js';
import { ContextMenu } from '../components/common/ContextMenu.js';
import {
  Plus,
  Shield,
  Trash2,
  X
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'Active' | 'Pending Invite';
}

export const TeamPage: React.FC = () => {
  const { user } = useAuth();
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('Member');
  const [invitedMembers, setInvitedMembers] = useState<TeamMember[]>([]);

  const primaryMember: TeamMember = {
    id: 'owner',
    name: user?.name || 'Workspace Administrator',
    email: user?.email || 'admin@outbox.com',
    role: 'Workspace Owner',
    avatar: (user?.name || 'A')[0]!.toUpperCase(),
    status: 'Active'
  };

  const allMembers = [primaryMember, ...invitedMembers];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: inviteEmail.split('@')[0] || 'Team Member',
      email: inviteEmail.trim(),
      role: inviteRole,
      avatar: (inviteEmail[0] || 'T').toUpperCase(),
      status: 'Pending Invite'
    };

    setInvitedMembers((prev) => [...prev, newMember]);
    setInviteEmail('');
    setInviteModalOpen(false);
  };

  const handleChangeRole = (memberId: string, newRole: string) => {
    setInvitedMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
  };

  const handleRemoveMember = (memberId: string) => {
    setInvitedMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Team & Workspace</h1>
            <p>Manage workspace members, collaborate on campaigns, and assign roles</p>
          </div>

          <button
            onClick={() => setInviteModalOpen(true)}
            className="btn-new-campaign"
            type="button"
          >
            <Plus size={18} />
            <span>Invite Member</span>
          </button>
        </div>

        {/* TEAM MEMBERS TABLE */}
        <div className="outbox-card">
          <div className="card-header-row">
            <h3 className="card-title">Team Members ({allMembers.length})</h3>
          </div>

          <div className="outbox-table-wrapper">
            <table className="outbox-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Workspace Role</th>
                  <th>Status</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {allMembers.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="navbar-avatar">{m.avatar}</div>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{m.name}</span>
                      </div>
                    </td>
                    <td>{m.email}</td>
                    <td><span className="badge badge-completed">{m.role}</span></td>
                    <td>
                      <span className={`badge ${m.status === 'Active' ? 'badge-active' : 'badge-paused'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {m.id !== 'owner' ? (
                        <ContextMenu
                          ariaLabel={`Options for ${m.name}`}
                          items={[
                            {
                              id: 'role-admin',
                              label: 'Set as Admin',
                              icon: <Shield size={14} />,
                              onClick: () => handleChangeRole(m.id, 'Admin')
                            },
                            {
                              id: 'role-member',
                              label: 'Set as Member',
                              icon: <Shield size={14} />,
                              onClick: () => handleChangeRole(m.id, 'Member')
                            },
                            {
                              id: 'remove',
                              label: 'Remove from Team',
                              icon: <Trash2 size={14} />,
                              variant: 'danger',
                              divider: true,
                              onClick: () => handleRemoveMember(m.id)
                            }
                          ]}
                        />
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Owner</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* INVITE MODAL */}
        {inviteModalOpen && (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Invite Team Member</h3>
                <button onClick={() => setInviteModalOpen(false)} style={{ color: 'var(--text-muted)' }} type="button">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Campaign Manager">Campaign Manager</option>
                    <option value="Growth Specialist">Growth Specialist</option>
                    <option value="Member">Member</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setInviteModalOpen(false)} className="btn btn-outline" type="button">
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
