import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { PerformanceChart } from '../components/common/PerformanceChart.js';
import {
  Download,
  Mail,
  Eye,
  MessageCircle,
  Award
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Campaigns' | 'Emails' | 'Replies' | 'Opportunities'>('Overview');
  const [dateRange, setDateRange] = useState<string>('Last 30 days');

  const replyRateBreakdown = [
    { name: 'Product Launch Outreach', rate: 12.5, color: '#6366f1' },
    { name: 'Enterprise Solutions Campaign', rate: 9.7, color: '#8b5cf6' },
    { name: 'Partnership Outreach', rate: 8.1, color: '#a855f7' },
    { name: 'Investor Outreach', rate: 6.4, color: '#c084fc' },
    { name: 'Follow-up Sequence', rate: 5.2, color: '#e879f9' }
  ];

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Analytics</h1>
            <p>Deep insights into your campaign performance</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
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
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 90 days">Last 90 days</option>
              <option value="Year to Date">Year to Date</option>
            </select>

            <button className="btn btn-outline" style={{ padding: '8px 14px' }}>
              <Download size={14} />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* TABS ROW */}
        <div className="outbox-card" style={{ padding: '14px 20px' }}>
          <div className="filter-tabs-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            {['Overview', 'Campaigns', 'Emails', 'Replies', 'Opportunities'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`filter-tab-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* 4 KPI CARDS */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon-circle purple">
              <Mail size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Emails Sent</span>
              <span className="kpi-value">45,231</span>
              <div className="kpi-trend">
                <span className="trend-up">↗ 12.4%</span>
                <span className="trend-period">vs previous period</span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-circle green">
              <Eye size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Open Rate</span>
              <span className="kpi-value">41.2%</span>
              <div className="kpi-trend">
                <span className="trend-up">↗ 4.3%</span>
                <span className="trend-period">vs previous period</span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-circle blue">
              <MessageCircle size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Reply Rate</span>
              <span className="kpi-value">7.8%</span>
              <div className="kpi-trend">
                <span className="trend-up">↗ 1.2%</span>
                <span className="trend-period">vs previous period</span>
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-circle orange">
              <Award size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Opportunities</span>
              <span className="kpi-value">342</span>
              <div className="kpi-trend">
                <span className="trend-up">↗ 15.3%</span>
                <span className="trend-period">vs previous period</span>
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
                <h3 className="card-title">Performance Over Time</h3>
              </div>
              <PerformanceChart showDropdown={false} />
            </div>
          </div>

          {/* Right: Reply Rate by Campaign */}
          <div className="col-right">
            <div className="outbox-card">
              <div className="card-header-row">
                <h3 className="card-title">Reply Rate by Campaign</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {replyRateBreakdown.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.rate}%</span>
                    </div>

                    <div style={{ height: '8px', backgroundColor: 'var(--bg-card-secondary)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(item.rate / 15) * 100}%`,
                          backgroundColor: item.color,
                          borderRadius: '9999px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
