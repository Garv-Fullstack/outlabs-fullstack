import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { ContactItem } from '../utils/outboxData.js';
import { campaignApi } from '../api/campaign.api.js';
import { ContextMenu } from '../components/common/ContextMenu.js';
import { ConfirmModal } from '../components/common/ConfirmModal.js';
import {
  Plus,
  Search,
  Filter,
  Upload,
  X,
  Users,
  Loader2,
  Edit3,
  Trash2,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);

  // Edit / Delete state
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [deletingContact, setDeletingContact] = useState<ContactItem | null>(null);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewCount, setImportPreviewCount] = useState<number>(0);
  const [parsedRows, setParsedRows] = useState<ContactItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadRealContacts = async () => {
      try {
        setLoading(true);
        const [scheduled, sent] = await Promise.all([
          campaignApi.getScheduledDeliveries(1, 100).catch(() => ({ deliveries: [] })),
          campaignApi.getSentDeliveries(1, 100).catch(() => ({ deliveries: [] }))
        ]);

        const combined = [...(scheduled.deliveries || []), ...(sent.deliveries || [])];
        const map = new Map<string, ContactItem>();

        for (const del of combined) {
          const email = del.recipientEmail.toLowerCase().trim();
          if (!map.has(email)) {
            const domain = email.split('@')[1] || 'Independent';
            map.set(email, {
              id: del.id,
              name: del.recipientName || email.split('@')[0] || 'Prospect',
              email,
              company: domain,
              status: del.status === 'SENT' ? 'Contacted' : 'Prospect',
              addedDate: new Date(del.createdAt).toLocaleDateString(),
              tags: del.status === 'SENT' ? ['Contacted'] : ['Prospect']
            });
          }
        }

        if (isMounted) {
          setContacts(Array.from(map.values()));
        }
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRealContacts();
    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleSaveEditedContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;

    setContacts((prev) =>
      prev.map((c) => (c.id === editingContact.id ? editingContact : c))
    );
    setEditingContact(null);
  };

  const handleStatusChange = (contactId: string, newStat: any) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, status: newStat } : c))
    );
  };

  const handleDeleteContact = () => {
    if (!deletingContact) return;
    setContacts((prev) => prev.filter((c) => c.id !== deletingContact.id));
    setDeletingContact(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const firstLine = lines[0];
      if (lines.length <= 1 || !firstLine) return;

      const headers = firstLine.split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
      const emailIdx = headers.findIndex((h) => h.includes('email'));
      const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('first'));
      const companyIdx = headers.findIndex((h) => h.includes('company') || h.includes('org'));

      const imported: ContactItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        const email = emailIdx !== -1 && parts[emailIdx] ? parts[emailIdx]! : parts[0] || '';
        if (email && email.includes('@')) {
          const name = nameIdx !== -1 && parts[nameIdx] ? parts[nameIdx]! : email.split('@')[0] || 'Prospect';
          const company = companyIdx !== -1 && parts[companyIdx] ? parts[companyIdx]! : email.split('@')[1] || 'Independent';
          imported.push({
            id: `con-imp-${Date.now()}-${i}`,
            name,
            email,
            company,
            status: 'Prospect',
            addedDate: 'Imported',
            tags: ['Prospect']
          });
        }
      }

      setParsedRows(imported);
      setImportPreviewCount(imported.length);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedRows.length > 0) {
      setContacts((prev) => [...parsedRows, ...prev]);
    }
    setImportModalOpen(false);
    setImportFile(null);
    setParsedRows([]);
    setImportPreviewCount(0);
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                  backgroundColor: 'var(--bg-card-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Prospect">Prospect</option>
                <option value="Contacted">Contacted</option>
                <option value="Customer">Customer</option>
                <option value="Lead">Lead</option>
              </select>
            </div>
          </div>
        </div>

        {/* CONTACTS LIST TABLE */}
        <div className="outbox-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px auto' }} />
              <p>Loading contacts...</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}
              >
                <Users size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No contacts found</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
                {searchQuery || statusFilter !== 'All'
                  ? 'No contacts match your filter criteria.'
                  : 'Start expanding your outreach network by importing or adding contacts.'}
              </p>
              <button onClick={() => setAddModalOpen(true)} className="btn btn-primary" type="button">
                <Plus size={16} />
                <span>Add Contact</span>
              </button>
            </div>
          ) : (
            <div className="outbox-table-wrapper" style={{ overflowX: 'auto' }}>
              <table className="outbox-table">
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Added Date</th>
                    <th>Tags</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }}
                          >
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {c.email}
                      </td>
                      <td style={{ color: 'var(--text-main)' }}>{c.company}</td>
                      <td>
                        <span
                          className={`badge ${
                            c.status === 'Customer'
                              ? 'badge-completed'
                              : c.status === 'Contacted'
                              ? 'badge-active'
                              : 'badge-pending'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{c.addedDate}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {c.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className={`badge-tag ${
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
                        <ContextMenu
                          ariaLabel={`Options for ${c.name}`}
                          items={[
                            {
                              id: 'edit',
                              label: 'Edit Contact',
                              icon: <Edit3 size={14} />,
                              onClick: () => setEditingContact(c)
                            },
                            {
                              id: 'mark-contacted',
                              label: 'Mark as Contacted',
                              icon: <CheckCircle size={14} />,
                              onClick: () => handleStatusChange(c.id, 'Contacted')
                            },
                            {
                              id: 'mark-customer',
                              label: 'Mark as Customer',
                              icon: <CheckCircle size={14} />,
                              onClick: () => handleStatusChange(c.id, 'Customer')
                            },
                            {
                              id: 'delete',
                              label: 'Delete Contact',
                              icon: <Trash2 size={14} />,
                              variant: 'danger',
                              divider: true,
                              onClick: () => setDeletingContact(c)
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
                maxWidth: '460px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Add New Contact</h3>
                <button onClick={() => setAddModalOpen(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
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
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Jane Doe"
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
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="jane@company.com"
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
                    Company
                  </label>
                  <input
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="Acme Corp"
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

        {/* EDIT CONTACT MODAL */}
        {editingContact && (
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
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit Contact</h3>
                <button onClick={() => setEditingContact(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditedContact} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingContact.name}
                    onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
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
                    value={editingContact.email}
                    onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
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
                    Company
                  </label>
                  <input
                    type="text"
                    value={editingContact.company}
                    onChange={(e) => setEditingContact({ ...editingContact, company: e.target.value })}
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
                    Status
                  </label>
                  <select
                    value={editingContact.status}
                    onChange={(e) => setEditingContact({ ...editingContact, status: e.target.value as any })}
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setEditingContact(null)} className="btn btn-outline" type="button">
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Save Changes
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
                maxWidth: '460px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Import Contacts CSV</h3>
                <button onClick={() => setImportModalOpen(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-card)',
                  borderRadius: '10px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-card-secondary)',
                  cursor: 'pointer'
                }}
              >
                {importFile ? (
                  <div>
                    <FileSpreadsheet size={36} style={{ color: 'var(--success)', margin: '0 auto 12px auto' }} />
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{importFile.name}</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--success)', marginTop: '4px' }}>
                      Ready to import {importPreviewCount} valid contacts
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload size={32} style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
                    <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>Click to select CSV File</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Supports columns: Email, Name, Company, Title, Industry
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setImportModalOpen(false)} className="btn btn-outline" type="button">
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importPreviewCount === 0}
                  className="btn btn-primary"
                  type="button"
                >
                  Import {importPreviewCount > 0 ? `(${importPreviewCount})` : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={!!deletingContact}
          title="Delete Contact?"
          message={`Are you sure you want to remove ${deletingContact?.name} (${deletingContact?.email}) from your contacts list?`}
          confirmText="Delete"
          variant="danger"
          onClose={() => setDeletingContact(null)}
          onConfirm={handleDeleteContact}
        />
      </div>
    </AppLayout>
  );
};
