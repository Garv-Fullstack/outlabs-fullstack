import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { INITIAL_TEMPLATES, TemplateItem } from '../utils/outboxData.js';
import { ContextMenu } from '../components/common/ContextMenu.js';
import { ConfirmModal } from '../components/common/ConfirmModal.js';
import {
  Plus,
  Search,
  Copy,
  ArrowRight,
  Check,
  Edit3,
  Trash2,
  X
} from 'lucide-react';

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateItem[]>(INITIAL_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateItem | null>(null);

  // Add template form state
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Sales Outreach');
  const [newSubject, setNewSubject] = useState<string>('');
  const [newBody, setNewBody] = useState<string>('');

  const filteredTemplates = templates.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (id: string, body: string) => {
    navigator.clipboard.writeText(body);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUseInComposer = (tpl: TemplateItem) => {
    navigate('/composer', {
      state: {
        subject: tpl.subject,
        body: tpl.body
      }
    });
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubject.trim()) return;

    const tpl: TemplateItem = {
      id: `tpl-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      subject: newSubject.trim(),
      body: newBody.trim()
    };

    setTemplates([tpl, ...templates]);
    setNewTitle('');
    setNewSubject('');
    setNewBody('');
    setAddModalOpen(false);
  };

  const handleSaveEditedTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.title.trim() || !editingTemplate.subject.trim()) return;

    setTemplates((prev) =>
      prev.map((t) => (t.id === editingTemplate.id ? editingTemplate : t))
    );
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = () => {
    if (!deletingTemplate) return;
    setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id));
    setDeletingTemplate(null);
  };

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Email Templates</h1>
            <p>High-converting cold email sequences and message templates</p>
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="btn-new-campaign"
            type="button"
          >
            <Plus size={18} />
            <span>Create Template</span>
          </button>
        </div>

        {/* SEARCH */}
        <div className="outbox-card" style={{ padding: '14px 20px' }}>
          <div style={{ position: 'relative', maxWidth: '360px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search templates..."
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

        {/* TEMPLATES GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="outbox-card"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="badge badge-completed" style={{ marginBottom: '6px' }}>{tpl.category}</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{tpl.title}</h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => handleCopy(tpl.id, tpl.body)}
                    className="btn btn-outline"
                    style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                    title="Copy body"
                  >
                    {copiedId === tpl.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>

                  <ContextMenu
                    ariaLabel={`Options for ${tpl.title}`}
                    items={[
                      {
                        id: 'use',
                        label: 'Use in Composer',
                        icon: <ArrowRight size={14} />,
                        onClick: () => handleUseInComposer(tpl)
                      },
                      {
                        id: 'edit',
                        label: 'Edit Template',
                        icon: <Edit3 size={14} />,
                        onClick: () => setEditingTemplate(tpl)
                      },
                      {
                        id: 'delete',
                        label: 'Delete Template',
                        icon: <Trash2 size={14} />,
                        variant: 'danger',
                        divider: true,
                        onClick: () => setDeletingTemplate(tpl)
                      }
                    ]}
                  />
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Subject:</span>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{tpl.subject}</p>
              </div>

              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-card-secondary)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-card)',
                  fontSize: '0.8rem',
                  color: 'var(--text-body)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {tpl.body}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-card)' }}>
                <button
                  onClick={() => handleUseInComposer(tpl)}
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  type="button"
                >
                  <span>Use in Composer</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ADD TEMPLATE MODAL */}
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
                maxWidth: '520px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create New Template</h3>
                <button onClick={() => setAddModalOpen(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Template Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Quick Intro Sequence"
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
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)'
                    }}
                  >
                    <option value="Sales Outreach">Sales Outreach</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Recruiting">Recruiting</option>
                    <option value="Investor Update">Investor Update</option>
                    <option value="Networking">Networking</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Quick question for {{first_name}} regarding {{company}}"
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
                    Email Body
                  </label>
                  <textarea
                    rows={5}
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    placeholder="Hi {{first_name}}, ..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setAddModalOpen(false)} className="btn btn-outline" type="button">
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Save Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT TEMPLATE MODAL */}
        {editingTemplate && (
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
                maxWidth: '520px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit Template</h3>
                <button onClick={() => setEditingTemplate(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditedTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Template Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.title}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
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
                    Category
                  </label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)'
                    }}
                  >
                    <option value="Sales Outreach">Sales Outreach</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Recruiting">Recruiting</option>
                    <option value="Investor Update">Investor Update</option>
                    <option value="Networking">Networking</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
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
                    Email Body
                  </label>
                  <textarea
                    rows={5}
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button onClick={() => setEditingTemplate(null)} className="btn btn-outline" type="button">
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

        <ConfirmModal
          isOpen={!!deletingTemplate}
          title="Delete Template?"
          message={`Are you sure you want to delete template "${deletingTemplate?.title}"?`}
          confirmText="Delete"
          variant="danger"
          onClose={() => setDeletingTemplate(null)}
          onConfirm={handleDeleteTemplate}
        />
      </div>
    </AppLayout>
  );
};
