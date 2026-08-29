import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { DeliveryStatusBadge } from '../components/monitoring/DeliveryStatusBadge.js';
import { campaignApi } from '../api/campaign.api.js';
import { searchApi } from '../api/search.api.js';
import { DeliveryItem, SearchResultItem, Pagination } from '../types/campaign.types.js';
import { Activity, Clock, CheckCircle2, Search, ExternalLink, Ban, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

export const MonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SCHEDULED' | 'SENT' | 'SEARCH'>('SCHEDULED');

  // Scheduled / Sent Deliveries State
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation State
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchSource, setSearchSource] = useState<'elasticsearch' | 'postgres' | null>(null);
  const [searchTotal, setSearchTotal] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const fetchDeliveries = useCallback(async (tab: 'SCHEDULED' | 'SENT', page = 1) => {
    try {
      setLoading(true);
      setError(null);
      if (tab === 'SCHEDULED') {
        const data = await campaignApi.getScheduledDeliveries(page, 15);
        setDeliveries(data.deliveries);
        setPagination(data.pagination);
      } else {
        const data = await campaignApi.getSentDeliveries(page, 15);
        setDeliveries(data.deliveries);
        setPagination(data.pagination);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'SCHEDULED' || activeTab === 'SENT') {
      fetchDeliveries(activeTab, 1);
    }
  }, [activeTab, fetchDeliveries]);

  // Debounced search effect
  useEffect(() => {
    if (activeTab !== 'SEARCH') return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchSource(null);
      setSearchTotal(0);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        setError(null);
        const data = await searchApi.searchEmails(searchQuery.trim(), 1, 20);
        setSearchResults(data.results);
        setSearchSource(data.source);
        setSearchTotal(data.total);
      } catch (err: any) {
        setError(err?.message || 'Search execution failed');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleCancel = async (deliveryId: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled email delivery?')) {
      return;
    }

    try {
      setCancellingId(deliveryId);
      await campaignApi.cancelDelivery(deliveryId);
      // Remove from list or refresh
      setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel delivery');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
              Delivery Queue & Observability
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Inspect live BullMQ job states, Ethereal SMTP test previews, and Elasticsearch logs
            </p>
          </div>

          <button
            onClick={() => {
              if (activeTab === 'SCHEDULED' || activeTab === 'SENT') {
                fetchDeliveries(activeTab, pagination.page);
              }
            }}
            className="btn btn-outline"
            type="button"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {error && (
          <div className="alert-banner alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('SCHEDULED')}
            className={`btn ${activeTab === 'SCHEDULED' ? 'btn-primary' : 'btn-outline'}`}
            type="button"
          >
            <Clock size={16} />
            <span>Scheduled & In-Queue</span>
          </button>
          <button
            onClick={() => setActiveTab('SENT')}
            className={`btn ${activeTab === 'SENT' ? 'btn-primary' : 'btn-outline'}`}
            type="button"
          >
            <CheckCircle2 size={16} />
            <span>Sent Deliveries</span>
          </button>
          <button
            onClick={() => setActiveTab('SEARCH')}
            className={`btn ${activeTab === 'SEARCH' ? 'btn-primary' : 'btn-outline'}`}
            type="button"
          >
            <Search size={16} />
            <span>Elasticsearch Search</span>
          </button>
        </div>

        {/* Tab 1 & 2: Scheduled / Sent Deliveries Table */}
        {activeTab !== 'SEARCH' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0' }}>
            {loading && deliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading queue deliveries...</p>
              </div>
            ) : deliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Activity size={32} color="var(--accent-primary)" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>
                  No {activeTab.toLowerCase()} deliveries found
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {activeTab === 'SCHEDULED'
                    ? 'All scheduled jobs have been dispatched or completed.'
                    : 'No sent deliveries recorded yet.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '14px 18px' }}>Recipient</th>
                      <th style={{ padding: '14px 18px' }}>Subject</th>
                      <th style={{ padding: '14px 18px' }}>Status</th>
                      <th style={{ padding: '14px 18px' }}>
                        {activeTab === 'SCHEDULED' ? 'Scheduled For' : 'Delivered At'}
                      </th>
                      <th style={{ padding: '14px 18px' }}>Actions / Diagnostics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600 }}>{d.recipientName || d.recipientEmail}</div>
                          {d.recipientName && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {d.recipientEmail}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          {d.campaign?.subject || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <DeliveryStatusBadge status={d.status} />
                        </td>

                        <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                          {activeTab === 'SCHEDULED'
                            ? new Date(d.scheduledFor).toLocaleString()
                            : d.sentAt ? new Date(d.sentAt).toLocaleString() : '—'}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          {activeTab === 'SCHEDULED' ? (
                            <button
                              onClick={() => handleCancel(d.id)}
                              disabled={cancellingId === d.id}
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '4px 10px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              type="button"
                            >
                              {cancellingId === d.id ? <Loader2 size={12} className="spin" /> : <Ban size={12} />}
                              <span>Cancel Job</span>
                            </button>
                          ) : d.etherealPreviewUrl ? (
                            <a
                              href={d.etherealPreviewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '4px 10px', color: 'var(--info)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <span>View in Ethereal</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Message ID: {d.etherealMessageId || 'Confirmed'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => fetchDeliveries(activeTab, pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="btn btn-outline"
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchDeliveries(activeTab, pagination.page + 1)}
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

        {/* Tab 3: Elasticsearch Search View */}
        {activeTab === 'SEARCH' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
                <input
                  type="text"
                  placeholder="Search subject, body content, recipient email, recipient name with full-text fuzzy matching..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {searchSource && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Engine:</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: searchSource === 'elasticsearch' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: searchSource === 'elasticsearch' ? 'var(--accent-primary)' : 'var(--warning)',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    {searchSource === 'elasticsearch' ? 'Elasticsearch 8.x Cluster' : 'PostgreSQL ILIKE Fallback'}
                  </span>
                  <span>•</span>
                  <span>{searchTotal} matches found</span>
                </div>
              )}
            </div>

            {isSearching ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Searching email index...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Search size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px' }}>
                  {searchQuery ? 'No search results found' : 'Enter query to search email index'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Indexed fields include email subject lines, body content, recipient names, and addresses.
                </p>
              </div>
            ) : (
              <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '14px 18px' }}>Recipient</th>
                      <th style={{ padding: '14px 18px' }}>Subject</th>
                      <th style={{ padding: '14px 18px' }}>Status</th>
                      <th style={{ padding: '14px 18px' }}>Delivered</th>
                      <th style={{ padding: '14px 18px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((hit) => (
                      <tr key={hit.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600 }}>{hit.recipientName || hit.recipientEmail}</div>
                          {hit.recipientName && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {hit.recipientEmail}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 18px' }}>{hit.subject}</td>
                        <td style={{ padding: '14px 18px' }}>
                          <DeliveryStatusBadge status={hit.status} />
                        </td>
                        <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                          {hit.sentAt ? new Date(hit.sentAt).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {hit.etherealPreviewUrl ? (
                            <a
                              href={hit.etherealPreviewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '4px 10px', color: 'var(--info)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <span>View in Ethereal</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Confirmed</span>
                          )}
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
    </AppLayout>
  );
};
