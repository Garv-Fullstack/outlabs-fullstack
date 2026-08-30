import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { FollowUpItem } from '../utils/outboxData.js';
import { ContextMenu } from '../components/common/ContextMenu.js';
import {
  Search,
  Plus,
  CheckCircle2,
  X
} from 'lucide-react';

export const FollowupsPage: React.FC = () => {
  const [followups, setFollowups] = useState<FollowUpItem[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Completed' | 'Overdue'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<FollowUpItem | null>(null);

  // New task form state
  const [newTask, setNewTask] = useState<string>('');
  const [newContact, setNewContact] = useState<string>('');
  const [newCampaign, setNewCampaign] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

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

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const item: FollowUpItem = {
      id: `task-${Date.now()}`,
      task: newTask.trim(),
      contact: newContact.trim() || 'General Prospect',
      campaign: newCampaign.trim() || 'Direct Outreach',
      dueDate: newDueDate || new Date().toISOString().slice(0, 10),
      priority: newPriority,
      status: 'Pending'
    };

    setFollowups([item, ...followups]);
    setNewTask('');
    setNewContact('');
    setNewCampaign('');
    setNewDueDate('');
    setModalOpen(false);
  };

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Follow-ups</h1>
            <p>Manage your follow-up tasks and lead reminders</p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="btn-new-campaign"
            type="button"
          >
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
                type="button"
              >
                All ({followups.length})
              </button>
              <button
                onClick={() => setActiveTab('Pending')}
                className={`filter-tab-btn ${activeTab === 'Pending' ? 'active' : ''}`}
                type="button"
              >
                Pending ({followups.filter((f) => f.status === 'Pending').length})
              </button>
              <button
                onClick={() => setActiveTab('Completed')}
                className={`filter-tab-btn ${activeTab === 'Completed' ? 'active' : ''}`}
                type="button"
              >
                Completed ({followups.filter((f) => f.status === 'Completed').length})
              </button>
            </div>

            <div style={{ position: 'relative', width: '240px' }}>
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
          </div>
        </div>

        {/* FOLLOW-UPS TABLE OR HONEST EMPTY STATE */}
        <div className="outbox-card">
          {filteredFollowups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <CheckCircle2 size={36} color="var(--primary)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>
                {searchQuery ? 'No matching follow-ups found' : 'No follow-up tasks scheduled yet'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '380px', margin: '0 auto 18px auto' }}>
                {searchQuery
                  ? `No tasks match "${searchQuery}".`
                  : 'Track and schedule reminders for prospect replies and custom outreach follow-ups.'}
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="btn btn-primary"
                style={{ display: 'inline-flex', margin: '0 auto' }}
                type="button"
              >
                <Plus size={16} />
                <span>Create First Task</span>
              </button>
            </div>
          ) : (
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
                              : 'badge-completed'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <ContextMenu
                          ariaLabel={`Options for ${f.task}`}
                          items={[
                            {
                              id: 'toggle-complete',
                              label: f.status === 'Completed' ? 'Mark as Pending' : 'Mark as Completed',
                              icon: <CheckCircle2 size={14} />,
                              onClick: () => toggleComplete(f.id)
                            },
                            {
                              id: 'edit',
                              label: 'Edit Task',
                              icon: <CheckCircle2 size={14} />,
                              onClick: () => {
                                setEditingTask(f);
                              }
                            },
                            {
                              id: 'delete',
                              label: 'Delete Task',
                              icon: <X size={14} />,
                              variant: 'danger',
                              divider: true,
                              onClick: () => {
                                setFollowups((prev) => prev.filter((item) => item.id !== f.id));
                              }
                            }
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* EDIT TASK MODAL */}
        {editingTask && (
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
                maxWidth: '460px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit Follow-up Task</h3>
                <button onClick={() => setEditingTask(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editingTask.task.trim()) return;
                  setFollowups((prev) => prev.map((t) => (t.id === editingTask.id ? editingTask : t)));
                  setEditingTask(null);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Task Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTask.task}
                    onChange={(e) => setEditingTask({ ...editingTask, task: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Prospect / Contact
                  </label>
                  <input
                    type="text"
                    value={editingTask.contact}
                    onChange={(e) => setEditingTask({ ...editingTask, contact: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Priority
                    </label>
                    <select
                      value={editingTask.priority}
                      onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-card)',
                        backgroundColor: 'var(--bg-card-secondary)',
                        color: 'var(--text-main)'
                      }}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Status
                    </label>
                    <select
                      value={editingTask.status}
                      onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-card)',
                        backgroundColor: 'var(--bg-card-secondary)',
                        color: 'var(--text-main)'
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setEditingTask(null)} className="btn btn-outline" type="button">
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Save Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CREATE TASK MODAL */}
        {modalOpen && (
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
                maxWidth: '460px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create Follow-up Task</h3>
                <button onClick={() => setModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Send pricing deck follow-up"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
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
                    Contact Name / Email
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., alex@enterprise.com"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
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
                      Priority
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
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
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setModalOpen(false)} className="btn btn-outline" type="button">
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Save Task
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
