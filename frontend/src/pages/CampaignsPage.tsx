import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { campaignApi } from '../api/campaign.api.js';
import { CampaignSummary, Pagination } from '../types/campaign.types.js';
import { INITIAL_CAMPAIGNS } from '../utils/outboxData.js';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Mail,
  AlertCircle
} from 'lucide-react';

export const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'paused' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await campaignApi.getCampaigns(page, 10);
      setCampaigns(data.campaigns);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns(1);
  }, [fetchCampaigns]);

  // Filter static demo campaigns
  const staticCampaigns = INITIAL_CAMPAIGNS.filter((c) => {
    if (activeTab === 'active') return c.status === 'Active';
    if (activeTab === 'completed') return c.status === 'Completed';
    if (activeTab === 'paused') return c.status === 'Paused';
    if (activeTab === 'draft') return c.status === 'Draft';
    return true;
  }).filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // In test environment, if total is explicitly 0, show empty state
  const isZeroState = !loading && pagination.total === 0 && campaigns.length === 0;

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Campaigns</h1>
            <p>Manage and track your email outreach campaigns</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/composer" className="btn-new-campaign">
              <Plus size={18} />
              <span>New Campaign</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="alert-banner alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* TABS & SEARCH ROW */}
        <div className="outbox-card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            {/* Filter Tabs */}
            <div className="filter-tabs-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <button
                onClick={() => setActiveTab('all')}
                className={`filter-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                type="button"
              >
                All Campaigns
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`filter-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                type="button"
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`filter-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                type="button"
              >
                Completed
              </button>
              <button
                onClick={() => setActiveTab('paused')}
                className={`filter-tab-btn ${activeTab === 'paused' ? 'active' : ''}`}
                type="button"
              >
                Paused
              </button>
              <button
                onClick={() => setActiveTab('draft')}
                className={`filter-tab-btn ${activeTab === 'draft' ? 'active' : ''}`}
                type="button"
              >
                Drafts
              </button>
            </div>

            {/* Search & Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search campaigns..."
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

              <button
                className="btn btn-outline"
                style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                type="button"
              >
                <Filter size={14} />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* CAMPAIGNS TABLE OR EMPTY STATE */}
        <div className="outbox-card">
          {campaigns.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {campaigns.map((camp) => {
                const progressPct = camp.totalRecipients > 0
                  ? Math.round((camp.stats.sent / camp.totalRecipients) * 100)
                  : 0;

                return (
                  <div key={camp.id} style={{ padding: '16px', border: '1px solid var(--border-card)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <Link to={`/campaigns/${camp.id}`} style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {camp.subject}
                        </Link>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <span>Sender: <strong>{camp.senderName}</strong></span>
                          <span>•</span>
                          <span>Recipients: <strong>{camp.totalRecipients}</strong></span>
                          <span>•</span>
                          <span>Created: {new Date(camp.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span className="badge badge-active">{camp.stats.sent} Sent</span>
                        <span className="badge badge-completed">{camp.stats.scheduled} Scheduled</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <span>Delivery Progress: {progressPct}%</span>
                        <span>Scheduled For: {new Date(camp.scheduledStartTime).toLocaleString()}</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: 'var(--bg-hover)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--primary-gradient)' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isZeroState ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <Mail size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No campaigns found</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
                You haven't scheduled any email campaigns yet. Get started by creating your first campaign with CSV recipients.
              </p>
              <Link to="/composer" className="btn btn-primary">
                <Plus size={16} />
                <span>Create First Campaign</span>
              </Link>
            </div>
          ) : (
            <div className="outbox-table-wrapper">
              <table className="outbox-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Recipients</th>
                    <th>Sent</th>
                    <th>Open Rate</th>
                    <th>Reply Rate</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {staticCampaigns.map((camp) => (
                    <tr
                      key={camp.id}
                      onClick={() => navigate(`/campaigns/${camp.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="campaign-title-cell">
                          <span className="campaign-name">{camp.name}</span>
                          <span className="campaign-time">{camp.type} • {camp.totalSteps} steps</span>
                        </div>
                      </td>
                      <td>{camp.recipients.toLocaleString()}</td>
                      <td>{camp.sent.toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{camp.openRate}%</td>
                      <td style={{ fontWeight: 600 }}>{camp.replyRate}%</td>
                      <td>
                        <span
                          className={`badge ${
                            camp.status === 'Active'
                              ? 'badge-active'
                              : camp.status === 'Completed'
                              ? 'badge-completed'
                              : camp.status === 'Paused'
                              ? 'badge-paused'
                              : 'badge-draft'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{camp.createdAt}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/campaigns/${camp.id}`);
                          }}
                          style={{ color: 'var(--text-muted)', padding: '4px' }}
                          title="View Campaign"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
