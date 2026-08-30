import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { INITIAL_FOLLOWUPS, FollowUpItem } from '../utils/outboxData.js';
import {
  Search,
  Filter,
  Plus,
  MoreVertical
} from 'lucide-react';

export const FollowupsPage: React.FC = () => {
  const [followups, setFollowups] = useState<FollowUpItem[]>(INITIAL_FOLLOWUPS);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Completed' | 'Overdue'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredFollowups = followups.filter((f) => {
    const matchesTab = activeTab === 'All' || f.status === activeTab;
    const matchesSearch =
      f.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.campaign.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const toggleComplete = (id: string) => {
    setFollowups((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, status: f.status === 'Completed' ? 'Pending' : 'Completed' }
          : f
      )
    );
  };

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Follow-ups</h1>
            <p>Manage your follow-up tasks and reminders</p>
          </div>

          <button className="btn-new-campaign" type="button">
            <Plus size={18} />
            <span>Create Task</span>
          </button>
        </div>

        {/* TABS & SEARCH */}
        <div className="outbox-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div className="filter-tabs-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <button
                onClick={() => setActiveTab('All')}
                className={`filter-tab-btn ${activeTab === 'All' ? 'active' : ''}`}
              >
                All ({followups.length})
              </button>
              <button
                onClick={() => setActiveTab('Pending')}
                className={`filter-tab-btn ${activeTab === 'Pending' ? 'active' : ''}`}
              >
                Pending ({followups.filter((f) => f.status === 'Pending').length})
              </button>
              <button
                onClick={() => setActiveTab('Completed')}
                className={`filter-tab-btn ${activeTab === 'Completed' ? 'active' : ''}`}
              >
                Completed ({followups.filter((f) => f.status === 'Completed').length})
              </button>
              <button
                onClick={() => setActiveTab('Overdue')}
                className={`filter-tab-btn ${activeTab === 'Overdue' ? 'active' : ''}`}
              >
                Overdue ({followups.filter((f) => f.status === 'Overdue').length})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search follow-ups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-card)',
                    backgroundColor: 'var(--bg-card-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              <button className="btn btn-outline" style={{ padding: '7px 12px' }} type="button">
                <Filter size={14} />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* FOLLOW-UPS TABLE */}
        <div className="outbox-card">
          <div className="outbox-table-wrapper">
            <table className="outbox-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Task</th>
                  <th>Contact</th>
                  <th>Campaign</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowups.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={f.status === 'Completed'}
                        onChange={() => toggleComplete(f.id)}
                        className="task-checkbox"
                      />
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      <span style={{ textDecoration: f.status === 'Completed' ? 'line-through' : 'none', color: f.status === 'Completed' ? 'var(--text-muted)' : 'inherit' }}>
                        {f.task}
                      </span>
                    </td>
                    <td>{f.contact}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{f.campaign}</td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{f.dueDate}</td>
                    <td>
                      <span
                        className={`badge ${
                          f.priority === 'High'
                            ? 'badge-tag-hot'
                            : f.priority === 'Medium'
                            ? 'badge-tag-warm'
                            : 'badge-tag-cold'
                        }`}
                      >
                        {f.priority}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          f.status === 'Completed'
                            ? 'badge-active'
                            : f.status === 'Overdue'
                            ? 'badge-tag-hot'
                            : 'badge-completed'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button style={{ color: 'var(--text-muted)', padding: '4px' }}>
                        <MoreVertical size={16} />
                      </button>
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
