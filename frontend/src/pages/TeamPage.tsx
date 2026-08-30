import React from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import {
  Plus,
  MoreVertical
} from 'lucide-react';

export const TeamPage: React.FC = () => {
  const members = [
    { name: 'Gourav Vijayvargiya', email: 'gourav@outbox.com', role: 'Owner / Administrator', avatar: 'G', status: 'Active' },
    { name: 'Sarah Jenkins', email: 'sarah@outbox.com', role: 'Campaign Manager', avatar: 'S', status: 'Active' },
    { name: 'David Chen', email: 'david@outbox.com', role: 'Growth Specialist', avatar: 'D', status: 'Active' }
  ];

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Team & Collaboration</h1>
            <p>Manage team members, permissions, and workspace roles</p>
          </div>

          <button className="btn-new-campaign" type="button">
            <Plus size={18} />
            <span>Invite Member</span>
          </button>
        </div>

        {/* TEAM MEMBERS TABLE */}
        <div className="outbox-card">
          <div className="outbox-table-wrapper">
            <table className="outbox-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Workspace Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="navbar-avatar">{m.avatar}</div>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{m.name}</span>
                      </div>
                    </td>
                    <td>{m.email}</td>
                    <td><span className="badge badge-completed">{m.role}</span></td>
                    <td><span className="badge badge-active">{m.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button style={{ color: 'var(--text-muted)' }}><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
