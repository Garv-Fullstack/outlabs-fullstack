import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { INITIAL_TEMPLATES, TemplateItem } from '../utils/outboxData.js';
import {
  Plus,
  Search,
  Copy,
  ArrowRight,
  Check
} from 'lucide-react';

export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates] = useState<TemplateItem[]>(INITIAL_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
            onClick={() => navigate('/composer')}
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

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleCopy(tpl.id, tpl.body)}
                    className="btn btn-outline"
                    style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                    title="Copy body"
                  >
                    {copiedId === tpl.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-card)' }}>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Avg Open: <strong style={{ color: 'var(--success)' }}>{tpl.openRateAvg}</strong></span>
                  <span>Avg Reply: <strong style={{ color: 'var(--primary)' }}>{tpl.replyRateAvg}</strong></span>
                </div>

                <button
                  onClick={() => navigate('/composer')}
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  <span>Use in Composer</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};
