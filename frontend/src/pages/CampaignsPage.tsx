import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { campaignApi } from '../api/campaign.api.js';
import { CampaignSummary, Pagination } from '../types/campaign.types.js';
import { ContextMenu } from '../components/common/ContextMenu.js';
import { EditCampaignModal } from '../components/campaigns/EditCampaignModal.js';
import { ConfirmModal } from '../components/common/ConfirmModal.js';
import {
  Plus,
  Search,
  Mail,
  AlertCircle,
  Loader2,
  Eye,
  Edit3,
  Pause,
  Play,
  XCircle,
  Trash2,
  CheckCircle2
} from 'lucide-react';

export const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'paused' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Modals state
  const [editingCampaign, setEditingCampaign] = useState<CampaignSummary | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<CampaignSummary | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchCampaigns = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await campaignApi.getCampaigns(page, 10);
      setCampaigns(data.campaigns || []);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err?.message || 'Failed to load campaigns from backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns(1);
  }, [fetchCampaigns]);

  const handlePause = async (camp: CampaignSummary) => {
    try {
      setActionLoading(true);
      await campaignApi.pauseCampaign(camp.id);
      setSuccessNotice(`Campaign "${camp.subject}" paused successfully`);
      setTimeout(() => setSuccessNotice(null), 3000);
      fetchCampaigns(pagination.page);
    } catch (err: any) {
      alert('Failed to pause campaign: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async (camp: CampaignSummary) => {
    try {
      setActionLoading(true);
      await campaignApi.resumeCampaign(camp.id);
      setSuccessNotice(`Campaign "${camp.subject}" resumed successfully`);
      setTimeout(() => setSuccessNotice(null), 3000);
      fetchCampaigns(pagination.page);
    } catch (err: any) {
      alert('Failed to resume campaign: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (camp: CampaignSummary) => {
    if (!confirm(`Are you sure you want to cancel remaining scheduled emails for "${camp.subject}"?`)) return;
    try {
      setActionLoading(true);
      await campaignApi.cancelCampaign(camp.id);
      setSuccessNotice(`Campaign "${camp.subject}" cancelled`);
      setTimeout(() => setSuccessNotice(null), 3000);
      fetchCampaigns(pagination.page);
    } catch (err: any) {
      alert('Failed to cancel campaign: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCampaign) return;
    try {
      setActionLoading(true);
      await campaignApi.deleteCampaign(deletingCampaign.id);
      setSuccessNotice(`Campaign "${deletingCampaign.subject}" deleted`);
      setDeletingCampaign(null);
      setTimeout(() => setSuccessNotice(null), 3000);
      fetchCampaigns(pagination.page);
    } catch (err: any) {
      alert('Failed to delete campaign: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Filter campaigns by active tab & search query
  const filteredCampaigns = campaigns.filter((camp) => {
    const isCompleted = camp.stats.sent >= camp.totalRecipients && camp.totalRecipients > 0;
    const isDraft = camp.totalRecipients === 0;

    let matchesTab = true;
    if (activeTab === 'active') matchesTab = !isCompleted && !isDraft;
    else if (activeTab === 'completed') matchesTab = isCompleted;
    else if (activeTab === 'draft') matchesTab = isDraft;

    const matchesSearch =
      camp.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.senderName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Email Campaigns</h1>
            <p>Track, manage, and scale your automated cold outreach campaigns</p>
          </div>

          <Link to="/composer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            <span>New Campaign</span>
          </Link>
        </div>

        {error && (
          <div className="alert-banner alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successNotice && (
          <div className="alert-banner alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{successNotice}</span>
          </div>
        )}

        {/* TABS & SEARCH BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div className="tabs-nav" style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
            {(['all', 'active', 'completed', 'draft'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === tab ? 700 : 500,
                  backgroundColor: activeTab === tab ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search campaigns or sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.85rem', height: '36px' }}
              />
            </div>
          </div>
        </div>

        {/* CAMPAIGNS TABLE */}
        <div className="outbox-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px auto' }} />
              <p>Loading campaigns...</p>
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredCampaigns.map((camp) => {
                const progressPct = camp.totalRecipients > 0
                  ? Math.round((camp.stats.sent / camp.totalRecipients) * 100)
                  : 0;
                const isCompleted = camp.stats.sent >= camp.totalRecipients && camp.totalRecipients > 0;

                return (
                  <div key={camp.id} style={{ padding: '16px', border: '1px solid var(--border-card)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <Link to={`/campaigns/${camp.id}`} style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', textDecoration: 'none' }}>
                          {camp.subject}
                        </Link>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          <span>Sender: <strong>{camp.senderName} ({camp.senderEmail})</strong></span>
                          <span>•</span>
                          <span>Recipients: <strong>{camp.totalRecipients}</strong></span>
                          <span>•</span>
                          <span>Created: {new Date(camp.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-active">{camp.stats.sent} Sent</span>
                        <span className="badge badge-completed">{camp.stats.scheduled} Scheduled</span>
                        <span className={`badge ${isCompleted ? 'badge-completed' : 'badge-active'}`}>
                          {isCompleted ? 'Completed' : 'Active'}
                        </span>

                        <ContextMenu
                          ariaLabel={`Options for campaign ${camp.subject}`}
                          items={[
                            {
                              id: 'view',
                              label: 'View Deliveries',
                              icon: <Eye size={14} />,
                              onClick: () => navigate(`/campaigns/${camp.id}`)
                            },
                            {
                              id: 'edit',
                              label: 'Edit Settings',
                              icon: <Edit3 size={14} />,
                              onClick: () => setEditingCampaign(camp)
                            },
                            {
                              id: 'pause',
                              label: 'Pause Campaign',
                              icon: <Pause size={14} />,
                              disabled: isCompleted || camp.stats.scheduled === 0,
                              onClick: () => handlePause(camp)
                            },
                            {
                              id: 'resume',
                              label: 'Resume Campaign',
                              icon: <Play size={14} />,
                              disabled: isCompleted,
                              onClick: () => handleResume(camp)
                            },
                            {
                              id: 'cancel',
                              label: 'Cancel Dispatches',
                              icon: <XCircle size={14} />,
                              variant: 'warning',
                              disabled: isCompleted || camp.stats.scheduled === 0,
                              onClick: () => handleCancel(camp)
                            },
                            {
                              id: 'delete',
                              label: 'Delete Campaign',
                              icon: <Trash2 size={14} />,
                              variant: 'danger',
                              divider: true,
                              onClick: () => setDeletingCampaign(camp)
                            }
                          ]}
                        />
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
              {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px' }}
                      disabled={pagination.page <= 1}
                      onClick={() => fetchCampaigns(pagination.page - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px' }}
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchCampaigns(pagination.page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <Mail size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
                {searchQuery ? 'No matching campaigns found' : 'No campaigns found'}
              </h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
                {searchQuery
                  ? `No campaigns match "${searchQuery}". Try a different search term or clear the filter.`
                  : "You haven't scheduled any email campaigns yet. Get started by creating your first campaign with CSV recipients."}
              </p>
              <Link to="/composer" className="btn btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
                <Plus size={16} />
                <span>Create First Campaign</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <EditCampaignModal
        isOpen={!!editingCampaign}
        campaign={editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onSaved={() => {
          setSuccessNotice('Campaign settings updated successfully');
          setTimeout(() => setSuccessNotice(null), 3000);
          fetchCampaigns(pagination.page);
        }}
      />

      <ConfirmModal
        isOpen={!!deletingCampaign}
        title="Delete Campaign?"
        message={`Are you sure you want to delete "${deletingCampaign?.subject}"? All associated recipient deliveries, engagement events, and scheduled queue jobs will be permanently deleted.`}
        confirmText="Delete Campaign"
        variant="danger"
        loading={actionLoading}
        onClose={() => setDeletingCampaign(null)}
        onConfirm={handleConfirmDelete}
      />
    </AppLayout>
  );
};
