import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { PerformanceChart } from '../components/common/PerformanceChart.js';
import { DeliveryStatusBadge } from '../components/monitoring/DeliveryStatusBadge.js';
import { ContextMenu } from '../components/common/ContextMenu.js';
import { EditCampaignModal } from '../components/campaigns/EditCampaignModal.js';
import { ConfirmModal } from '../components/common/ConfirmModal.js';
import { campaignApi } from '../api/campaign.api.js';
import { CampaignDetail } from '../types/campaign.types.js';
import {
  ArrowLeft,
  Send,
  Users,
  Clock,
  Download,
  AlertCircle,
  Loader2,
  ExternalLink,
  RotateCcw,
  Edit3,
  Pause,
  Play,
  XCircle,
  Trash2,
  CheckCircle2
} from 'lucide-react';

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'prospects' | 'performance'>('overview');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await campaignApi.getCampaignById(id);
      setCampaign(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handlePause = async () => {
    if (!campaign) return;
    try {
      setActionLoading(true);
      await campaignApi.pauseCampaign(campaign.id);
      setNotice(`Campaign "${campaign.subject}" paused`);
      setTimeout(() => setNotice(null), 3000);
      fetchDetail();
    } catch (err: any) {
      alert('Failed to pause: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!campaign) return;
    try {
      setActionLoading(true);
      await campaignApi.resumeCampaign(campaign.id);
      setNotice(`Campaign "${campaign.subject}" resumed`);
      setTimeout(() => setNotice(null), 3000);
      fetchDetail();
    } catch (err: any) {
      alert('Failed to resume: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelCampaign = async () => {
    if (!campaign || !confirm(`Cancel all remaining pending dispatches for "${campaign.subject}"?`)) return;
    try {
      setActionLoading(true);
      await campaignApi.cancelCampaign(campaign.id);
      setNotice(`Campaign dispatches cancelled`);
      setTimeout(() => setNotice(null), 3000);
      fetchDetail();
    } catch (err: any) {
      alert('Failed to cancel campaign: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!campaign) return;
    try {
      setActionLoading(true);
      await campaignApi.deleteCampaign(campaign.id);
      setIsDeleting(false);
      navigate('/campaigns');
    } catch (err: any) {
      alert('Failed to delete campaign: ' + (err?.message || 'Unknown error'));
      setActionLoading(false);
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      setActionLoading(true);
      await campaignApi.retryDelivery(deliveryId);
      setNotice('Email delivery re-enqueued for dispatch');
      setTimeout(() => setNotice(null), 3000);
      fetchDetail();
    } catch (err: any) {
      alert('Failed to retry: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDelivery = async (deliveryId: string) => {
    try {
      setActionLoading(true);
      await campaignApi.cancelDelivery(deliveryId);
      setNotice('Scheduled delivery cancelled');
      setTimeout(() => setNotice(null), 3000);
      fetchDetail();
    } catch (err: any) {
      alert('Failed to cancel delivery: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!confirm('Delete this delivery record?')) return;
    try {
      setActionLoading(true);
      await campaignApi.deleteDelivery(deliveryId);
      setNotice('Delivery record deleted');
      setTimeout(() => setNotice(null), 3000);
      fetchDetail();
    } catch (err: any) {
      alert('Failed to delete delivery: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!campaign || !campaign.deliveries || campaign.deliveries.length === 0) {
      alert('No deliveries available to export');
      return;
    }

    const headers = ['Recipient Email', 'Recipient Name', 'Status', 'Scheduled For', 'Sent At', 'Error Message', 'Ethereal Preview URL'];
    const rows = campaign.deliveries.map((d) => [
      `"${d.recipientEmail}"`,
      `"${d.recipientName || ''}"`,
      `"${d.status}"`,
      `"${d.scheduledFor}"`,
      `"${d.sentAt || ''}"`,
      `"${(d.errorMessage || '').replace(/"/g, '""')}"`,
      `"${d.etherealPreviewUrl || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campaign-${campaign.id}-deliveries.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="outbox-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
          <Loader2 size={36} className="spin" style={{ margin: '0 auto 16px auto', color: 'var(--primary)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading campaign details...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !campaign) {
    return (
      <AppLayout>
        <div className="outbox-container">
          <Link to="/campaigns" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '20px' }}>
            <ArrowLeft size={16} />
            <span>Back to Campaigns</span>
          </Link>

          <div className="alert-banner alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error || 'Campaign not found'}</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isCompleted = campaign.stats.sent >= campaign.totalRecipients && campaign.totalRecipients > 0;
  const progressPct = campaign.totalRecipients > 0
    ? Math.round((campaign.stats.sent / campaign.totalRecipients) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="outbox-container">
        <div>
          <Link to="/campaigns" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            <ArrowLeft size={16} />
            <span>Back to Campaigns</span>
          </Link>
        </div>

        {notice && (
          <div className="alert-banner alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}

        <div className="dashboard-header" style={{ alignItems: 'flex-start' }}>
          <div className="dashboard-title-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0 }}>{campaign.subject}</h1>
              <span className={`badge ${isCompleted ? 'badge-completed' : 'badge-active'}`}>
                {isCompleted ? 'Completed' : 'Active'}
              </span>
            </div>
            <p>
              Created on {new Date(campaign.createdAt).toLocaleDateString()} • Sending via <strong>{campaign.senderName} ({campaign.senderEmail})</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary"
              type="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <Edit3 size={14} />
              <span>Edit</span>
            </button>

            <button
              onClick={handlePause}
              disabled={isCompleted || campaign.stats.scheduled === 0 || actionLoading}
              className="btn btn-secondary"
              type="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <Pause size={14} />
              <span>Pause</span>
            </button>

            <button
              onClick={handleResume}
              disabled={isCompleted || actionLoading}
              className="btn btn-secondary"
              type="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <Play size={14} />
              <span>Resume</span>
            </button>

            <button
              onClick={handleCancelCampaign}
              disabled={isCompleted || campaign.stats.scheduled === 0 || actionLoading}
              className="btn btn-secondary"
              type="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--warning, #f59e0b)' }}
            >
              <XCircle size={14} />
              <span>Cancel Queue</span>
            </button>

            <button
              onClick={() => setIsDeleting(true)}
              disabled={actionLoading}
              className="btn btn-secondary"
              type="button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--danger, #ef4444)' }}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Total Prospects</span>
              <div className="metric-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}>
                <Users size={18} />
              </div>
            </div>
            <div className="metric-value">{campaign.totalRecipients}</div>
            <div className="metric-subtext">Configured audience list</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Emails Sent</span>
              <div className="metric-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
                <Send size={18} />
              </div>
            </div>
            <div className="metric-value">{campaign.stats.sent}</div>
            <div className="metric-subtext">Successfully dispatched ({progressPct}%)</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Pending Delivery</span>
              <div className="metric-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' }}>
                <Clock size={18} />
              </div>
            </div>
            <div className="metric-value">{campaign.stats.scheduled}</div>
            <div className="metric-subtext">Queued in BullMQ Redis</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-title">Failed Deliveries</span>
              <div className="metric-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' }}>
                <RotateCcw size={18} />
              </div>
            </div>
            <div className="metric-value">{campaign.stats.failed}</div>
            <div className="metric-subtext">Exceeded retry limits</div>
          </div>
        </div>

        <div className="analytics-two-col">
          <div className="col-left">
            <div className="tabs-nav" style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-card)', marginBottom: '16px' }}>
              {(['overview', 'prospects', 'performance'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
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

            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="outbox-card">
                  <h3 className="card-title" style={{ marginBottom: '14px' }}>Email Content</h3>
                  <div style={{ backgroundColor: 'var(--bg-card-secondary)', borderRadius: '8px', padding: '16px', border: '1px solid var(--border-card)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Subject</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '14px' }}>{campaign.subject}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Body Preview</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {campaign.bodyText}
                    </div>
                  </div>
                </div>

                <div className="outbox-card">
                  <h3 className="card-title" style={{ marginBottom: '16px' }}>Campaign Dispatch Performance</h3>
                  <PerformanceChart showDropdown={false} />
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="outbox-card">
                <h3 className="card-title" style={{ marginBottom: '16px' }}>Hourly Dispatch Timeline</h3>
                <PerformanceChart showDropdown={true} />
              </div>
            )}

            {activeTab === 'prospects' && (
              <div className="outbox-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 className="card-title">Recipient Deliveries ({campaign.deliveries.length})</h3>
                  <button
                    onClick={handleExportCsv}
                    className="btn btn-secondary"
                    type="button"
                    style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>
                </div>

                {campaign.deliveries.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No individual recipient delivery records found.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Recipient</th>
                          <th>Status</th>
                          <th>Scheduled / Sent</th>
                          <th>Diagnostics</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaign.deliveries.map((del) => (
                          <tr key={del.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{del.recipientName || del.recipientEmail}</div>
                              {del.recipientName && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{del.recipientEmail}</div>}
                            </td>
                            <td><DeliveryStatusBadge status={del.status} /></td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {del.sentAt ? `Sent: ${new Date(del.sentAt).toLocaleString()}` : `Scheduled: ${new Date(del.scheduledFor).toLocaleString()}`}
                            </td>
                            <td>
                              {del.errorMessage ? (
                                <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{del.errorMessage}</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{del.status === 'SCHEDULED' ? 'Queued' : del.status}</span>
                              )}
                            </td>
                            <td>
                              <ContextMenu
                                ariaLabel={`Actions for delivery to ${del.recipientEmail}`}
                                items={[
                                  ...(del.etherealPreviewUrl ? [{
                                    id: 'preview',
                                    label: 'View Ethereal Email',
                                    icon: <ExternalLink size={14} />,
                                    onClick: () => window.open(del.etherealPreviewUrl!, '_blank')
                                  }] : []),
                                  ...((del.status === 'FAILED' || del.status === 'CANCELLED') ? [{
                                    id: 'retry',
                                    label: 'Retry Dispatch',
                                    icon: <RotateCcw size={14} />,
                                    variant: 'primary' as const,
                                    onClick: () => handleRetryDelivery(del.id)
                                  }] : []),
                                  ...((del.status === 'SCHEDULED' || del.status === 'RATE_LIMITED_DELAYED') ? [{
                                    id: 'cancel',
                                    label: 'Cancel Delivery',
                                    icon: <XCircle size={14} />,
                                    variant: 'warning' as const,
                                    onClick: () => handleCancelDelivery(del.id)
                                  }] : []),
                                  {
                                    id: 'delete',
                                    label: 'Delete Record',
                                    icon: <Trash2 size={14} />,
                                    variant: 'danger',
                                    divider: true,
                                    onClick: () => handleDeleteDelivery(del.id)
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
            )}
          </div>

          {/* Right Column: Campaign Metadata */}
          <div className="col-right">
            <div className="outbox-card">
              <h3 className="card-title" style={{ marginBottom: '16px' }}>Campaign Configuration</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Created At</span>
                  <span style={{ fontWeight: 600 }}>{new Date(campaign.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Scheduled Start</span>
                  <span style={{ fontWeight: 600 }}>{new Date(campaign.scheduledStartTime).toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Sender Account</span>
                  <span style={{ fontWeight: 600 }}>{campaign.senderName} ({campaign.senderEmail})</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Delay Between Deliveries</span>
                  <span style={{ fontWeight: 600 }}>{campaign.delayBetweenEmailsSeconds} seconds</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Hourly Dispatch Limit</span>
                  <span style={{ fontWeight: 600 }}>{campaign.hourlyLimit} emails / hour</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Delivery Progress</span>
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
                      <span>{campaign.stats.sent} / {campaign.totalRecipients}</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-hover)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--primary-gradient)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditCampaignModal
        isOpen={isEditing}
        campaign={campaign}
        onClose={() => setIsEditing(false)}
        onSaved={() => {
          setNotice('Campaign settings updated');
          setTimeout(() => setNotice(null), 3000);
          fetchDetail();
        }}
      />

      <ConfirmModal
        isOpen={isDeleting}
        title="Delete Campaign?"
        message={`Are you sure you want to delete "${campaign?.subject}"? All associated recipient deliveries, engagement events, and scheduled queue jobs will be permanently deleted.`}
        confirmText="Delete Campaign"
        variant="danger"
        loading={actionLoading}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDeleteCampaign}
      />
    </AppLayout>
  );
};
