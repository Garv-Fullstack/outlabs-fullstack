import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { INITIAL_CONTACTS, ContactItem } from '../utils/outboxData.js';
import {
  Plus,
  Search,
  Filter,
  Upload,
  MoreVertical,
  X
} from 'lucide-react';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<ContactItem[]>(INITIAL_CONTACTS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);

  // New Contact Form State
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newCompany, setNewCompany] = useState<string>('');
  const [newStatus, setNewStatus] = useState<'Prospect' | 'Contacted' | 'Customer' | 'Lead'>('Prospect');
  const [newTag, setNewTag] = useState<'Hot Lead' | 'Follow-up' | 'Cold lead' | 'Warm lead'>('Hot Lead');

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;

    const newContact: ContactItem = {
      id: `con-${Date.now()}`,
      name: newName,
      email: newEmail,
      company: newCompany || 'Independent',
      status: newStatus,
      addedDate: 'Just now',
      tags: [newTag]
    };

    setContacts([newContact, ...contacts]);
    setNewName('');
    setNewEmail('');
    setNewCompany('');
    setAddModalOpen(false);
  };

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Contacts</h1>
            <p>Manage your contacts and prospects</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setImportModalOpen(true)}
              className="btn btn-outline"
              type="button"
            >
              <Upload size={16} />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => setAddModalOpen(true)}
              className="btn-new-campaign"
              type="button"
            >
              <Plus size={18} />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS ROW */}
        <div className="outbox-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by name, email, company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-card)',
                    backgroundColor: 'var(--bg-card-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                  backgroundColor: 'var(--bg-card-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Prospect">Prospect</option>
                <option value="Contacted">Contacted</option>
                <option value="Customer">Customer</option>
                <option value="Lead">Lead</option>
              </select>

              <button className="btn btn-outline" style={{ padding: '8px 14px' }} type="button">
                <Filter size={14} />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* CONTACTS TABLE */}
        <div className="outbox-card">
          <div className="outbox-table-wrapper">
            <table className="outbox-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Tags</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.company}</td>
                    <td>
                      <span className="badge badge-completed">{c.status}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.addedDate}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {c.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className={`badge ${
                              t === 'Hot Lead'
                                ? 'badge-tag-hot'
                                : t === 'Follow-up'
                                ? 'badge-tag-followup'
                                : t === 'Cold lead'
                                ? 'badge-tag-cold'
                                : 'badge-tag-warm'
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
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

          {/* PAGINATION */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-card)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing {filteredContacts.length} contacts
            </span>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setCurrentPage(1)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: currentPage === 1 ? 'var(--primary)' : 'var(--bg-card-secondary)',
                  color: currentPage === 1 ? '#ffffff' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                1
              </button>
              <button
                onClick={() => setCurrentPage(2)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: currentPage === 2 ? 'var(--primary)' : 'var(--bg-card-secondary)',
                  color: currentPage === 2 ? '#ffffff' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                2
              </button>
              <button
                onClick={() => setCurrentPage(3)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: currentPage === 3 ? 'var(--primary)' : 'var(--bg-card-secondary)',
                  color: currentPage === 3 ? '#ffffff' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                3
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--text-muted)' }}>...</span>
              <button
                onClick={() => setCurrentPage(10)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: currentPage === 10 ? 'var(--primary)' : 'var(--bg-card-secondary)',
                  color: currentPage === 10 ? '#ffffff' : 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                10
              </button>
            </div>
          </div>
        </div>

        {/* ADD CONTACT MODAL */}
        {addModalOpen && (
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
                maxWidth: '480px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Add New Contact</h3>
                <button onClick={() => setAddModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Johnson"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
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
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="alex@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
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
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corporation"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
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
                      Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-card)',
                        backgroundColor: 'var(--bg-card-secondary)',
                        color: 'var(--text-main)'
                      }}
                    >
                      <option value="Prospect">Prospect</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Customer">Customer</option>
                      <option value="Lead">Lead</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Tag
                    </label>
                    <select
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-card)',
                        backgroundColor: 'var(--bg-card-secondary)',
                        color: 'var(--text-main)'
                      }}
                    >
                      <option value="Hot Lead">Hot Lead</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Cold lead">Cold lead</option>
                      <option value="Warm lead">Warm lead</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setAddModalOpen(false)} className="btn btn-outline" type="button">
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Save Contact
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* IMPORT CSV MODAL */}
        {importModalOpen && (
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
                maxWidth: '480px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Import Contacts CSV</h3>
                <button onClick={() => setImportModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  border: '2px dashed var(--border-card)',
                  borderRadius: '10px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-card-secondary)',
                  cursor: 'pointer'
                }}
              >
                <Upload size={32} style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
                <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>Upload CSV File</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Supports columns: Email, Name, Company, Title, Industry
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setImportModalOpen(false)} className="btn btn-outline" type="button">
                  Cancel
                </button>
                <button onClick={() => setImportModalOpen(false)} className="btn btn-primary" type="button">
                  Import List
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
