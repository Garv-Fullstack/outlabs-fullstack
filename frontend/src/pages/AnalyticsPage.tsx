import React, { useState, useEffect } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { PerformanceChart } from '../components/common/PerformanceChart.js';
import { campaignApi } from '../api/campaign.api.js';
import { DeliveryStats, CampaignSummary } from '../types/campaign.types.js';
import {
  Download,
  Mail,
  Eye,
  Clock,
  RotateCcw,
  BarChart2
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [statsData, campaignsData] = await Promise.all([
          campaignApi.getStats(),
          campaignApi.getCampaigns(1, 50)
        ]);
        if (isMounted) {
          setStats(statsData);
          setCampaigns(campaignsData.campaigns || []);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleExportReport = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Deliveries', stats?.totalDeliveries ?? 0],
      ['Delivered Emails', stats?.sentCount ?? 0],
      ['Scheduled In Queue', stats?.scheduledCount ?? 0],
      ['Rate-Limited Delayed', stats?.rateLimitedCount ?? 0],
      ['Failed Deliveries', stats?.failedCount ?? 0],
      ['Tracked Opens', stats?.trackedOpens ?? 0],
      ['Unique Opened Emails', stats?.uniqueOpenedCount ?? 0],
      ['Open Rate (%)', stats?.openRate ?? 'N/A'],
      ['Total Clicks', stats?.totalClicks ?? 0],
      ['Click Rate (%)', stats?.clickRate ?? 'N/A']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `outbox-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#ec4899'];

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Analytics</h1>
            <p>Deep insights into your campaign delivery and engagement metrics</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleExportReport}
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              type="button"
            >
              <Download size={14} />
              <span>Export Report (CSV)</span>
            </button>
          </div>
        </div>

        {/* 4 KPI CARDS (Real Calculated State) */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon-circle purple">
              <Mail size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Delivered Emails</span>
              <span className="kpi-value">{stats?.sentCount ?? 0}</span>
              <div className="kpi-trend">
                <span className="trend-up">↗ {stats?.sentCount ? '100%' : '0%'}</span>
                <span className="trend-period">delivered</span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-circle green">
              <Eye size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Open Rate</span>
              <span className="kpi-value">
                {stats?.openRate !== undefined && stats.openRate !== null ? `${stats.openRate.toFixed(1)}%` : '—'}
              </span>
              <div className="kpi-trend">
                <span className="trend-up">
                  {stats?.uniqueOpenedCount ? `${stats.uniqueOpenedCount} unique opens` : 'No opens yet'}
                </span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-circle blue">
              <Clock size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Scheduled In Queue</span>
              <span className="kpi-value">{stats?.scheduledCount ?? 0}</span>
              <div className="kpi-trend">
                <span className="trend-up">
                  {stats?.scheduledCount ? `${stats.scheduledCount} awaiting dispatch` : 'Queue empty'}
                </span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-circle orange">
              <RotateCcw size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Throttled & Failed</span>
              <span className="kpi-value">{(stats?.failedCount ?? 0) + (stats?.rateLimitedCount ?? 0)}</span>
              <div className="kpi-trend">
                <span className="trend-up">
                  {stats?.failedCount ?? 0} failed • {stats?.rateLimitedCount ?? 0} delayed
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-COLUMN MAIN CHARTS */}
        <div className="dashboard-main-columns">
          {/* Left: Performance Line Chart */}
          <div className="col-left">
            <div className="outbox-card">
              <div className="card-header-row">
                <h3 className="card-title">Delivery Performance Over Time</h3>
              </div>
              <PerformanceChart showDropdown={true} />
            </div>
          </div>

          {/* Right: Campaign Delivery Progress Breakdown */}
          <div className="col-right">
            <div className="outbox-card">
              <div className="card-header-row">
                <h3 className="card-title">Campaign Delivery Breakdown</h3>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                  Loading campaigns...
                </div>
              ) : campaigns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                  <BarChart2 size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>No campaign activity yet</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Create an outreach campaign to see metrics.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {campaigns.slice(0, 6).map((item, idx) => {
                    const pct = item.totalRecipients > 0 ? Math.round((item.stats.sent / item.totalRecipients) * 100) : 0;
                    const color = colors[idx % colors.length];

                    return (
                      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.subject}</span>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {item.stats.sent} / {item.totalRecipients} ({pct}%)
                          </span>
                        </div>

                        <div style={{ height: '8px', backgroundColor: 'var(--bg-card-secondary)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              backgroundColor: color,
                              borderRadius: '9999px'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
