import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { campaignApi } from '../api/campaign.api.js';
import { CampaignSummary, Pagination } from '../types/campaign.types.js';
import { Mail, Plus, RefreshCw, AlertCircle } from 'lucide-react';

export const CampaignsPage: React.FC = () => {
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

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
              Email Campaigns
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              View scheduling progress, recipient allocations, and execution status across campaigns
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => fetchCampaigns(pagination.page)}
              className="btn btn-outline"
              title="Refresh campaigns"
              type="button"
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <Link to="/composer" className="btn btn-primary">
              <Plus size={16} />
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

        {loading && campaigns.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Mail size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No campaigns found</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 20px auto', fontSize: '0.9rem' }}>
              You haven't scheduled any email campaigns yet. Get started by creating your first campaign with CSV recipients.
            </p>
            <Link to="/composer" className="btn btn-primary">
              <Plus size={16} />
              <span>Create First Campaign</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {campaigns.map((camp) => {
              const progressPct = camp.totalRecipients > 0
                ? Math.round((camp.stats.sent / camp.totalRecipients) * 100)
                : 0;

              return (
                <div key={camp.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>
                        {camp.subject}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>Sender: <strong>{camp.senderName}</strong> ({camp.senderEmail})</span>
                        <span>•</span>
                        <span>Recipients: <strong>{camp.totalRecipients}</strong></span>
                        <span>•</span>
                        <span>Created: {new Date(camp.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--success-bg)', color: 'var(--success)', fontWeight: 600 }}>
                        {camp.stats.sent} Sent
                      </span>
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--info-bg)', color: 'var(--info)', fontWeight: 600 }}>
                        {camp.stats.scheduled} Scheduled
                      </span>
                      {camp.stats.rateLimited > 0 && (
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316', fontWeight: 600 }}>
                          {camp.stats.rateLimited} Rate-Limited
                        </span>
                      )}
                      {camp.stats.failed > 0 && (
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 600 }}>
                          {camp.stats.failed} Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span>Delivery Progress: {progressPct}%</span>
                      <span>Scheduled For: {new Date(camp.scheduledStartTime).toLocaleString()}</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${progressPct}%`,
                        background: 'var(--accent-gradient)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total campaigns)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => fetchCampaigns(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="btn btn-outline"
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchCampaigns(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="btn btn-outline"
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
