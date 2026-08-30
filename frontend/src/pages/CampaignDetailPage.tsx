import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { PerformanceChart } from '../components/common/PerformanceChart.js';
import { INITIAL_CAMPAIGNS, INITIAL_CONTACTS } from '../utils/outboxData.js';
import {
  ArrowLeft,
  Send,
  Eye,
  MessageCircle,
  Users,
  Clock,
  Pause,
  Download
} from 'lucide-react';

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'sequences' | 'prospects' | 'performance' | 'activity'>('overview');

  const campaign = INITIAL_CAMPAIGNS.find((c) => c.id === id) || INITIAL_CAMPAIGNS[0]!;

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* Back Link */}
        <div>
          <Link
            to="/campaigns"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-muted)'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Campaigns</span>
          </Link>
        </div>

        {/* Campaign Header */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0 }}>{campaign.name}</h1>
              <span className="badge badge-active">{campaign.status}</span>
            </div>
            <p>Created {campaign.createdAt} • Multi-step cold sequence via {campaign.fromSender}</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.85rem' }} type="button">
              <Pause size={15} />
              <span>Pause Campaign</span>
            </button>
            <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} type="button">
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* TABS ROW */}
        <div className="outbox-card" style={{ padding: '14px 20px' }}>
          <div className="filter-tabs-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`filter-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('sequences')}
              className={`filter-tab-btn ${activeTab === 'sequences' ? 'active' : ''}`}
            >
              Sequences
            </button>
            <button
              onClick={() => setActiveTab('prospects')}
              className={`filter-tab-btn ${activeTab === 'prospects' ? 'active' : ''}`}
            >
              Prospects ({INITIAL_CONTACTS.length})
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`filter-tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
            >
              Performance
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`filter-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            >
              Activity
            </button>
          </div>
        </div>

        {/* 4 STATS CARDS */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon-circle purple">
              <Users size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Recipients</span>
              <span className="kpi-value">{campaign.recipients.toLocaleString()}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>100% targeted</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-circle green">
              <Send size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Sent</span>
              <span className="kpi-value">{campaign.sent.toLocaleString()}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>100% delivered</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-circle blue">
              <Eye size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Open Rate</span>
              <span className="kpi-value">{campaign.openRate}%</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>604 unique opens</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon-circle orange">
              <MessageCircle size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Reply Rate</span>
              <span className="kpi-value">{campaign.replyRate}%</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>115 direct replies</span>
            </div>
          </div>
        </div>

        {/* 2-COLUMN DETAIL LAYOUT */}
        <div className="dashboard-main-columns">
          {/* Left Column: Performance & Activity */}
          <div className="col-left">
            {activeTab === 'overview' || activeTab === 'performance' ? (
              <div className="outbox-card">
                <div className="card-header-row">
                  <h3 className="card-title">Performance Over Time</h3>
                </div>
                <PerformanceChart showDropdown={false} />
              </div>
            ) : null}

            {activeTab === 'overview' || activeTab === 'activity' ? (
              <div className="outbox-card">
                <div className="card-header-row">
                  <h3 className="card-title">Recent Activity</h3>
                </div>
                <ul className="activity-feed">
                  <li className="activity-item">
                    <div className="activity-icon-badge green">
                      <Send size={15} />
                    </div>
                    <div className="activity-content">
                      <span className="activity-text">
                        Campaign sent to <strong>1,250 recipients</strong>
                      </span>
                      <span className="activity-time">2 days ago</span>
                    </div>
                  </li>
                  <li className="activity-item">
                    <div className="activity-icon-badge purple">
                      <MessageCircle size={15} />
                    </div>
                    <div className="activity-content">
                      <span className="activity-text">
                        <strong>115 replies received</strong> from prospects
                      </span>
                      <span className="activity-time">1 day ago</span>
                    </div>
                  </li>
                  <li className="activity-item">
                    <div className="activity-icon-badge blue">
                      <Clock size={15} />
                    </div>
                    <div className="activity-content">
                      <span className="activity-text">
                        Step 2: Follow-up email sent
                      </span>
                      <span className="activity-time">1 hour ago</span>
                    </div>
                  </li>
                </ul>
              </div>
            ) : null}

            {activeTab === 'prospects' && (
              <div className="outbox-card">
                <h3 className="card-title" style={{ marginBottom: '16px' }}>Campaign Prospects</h3>
                <table className="outbox-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Company</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INITIAL_CONTACTS.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.email}</td>
                        <td>{c.company}</td>
                        <td>
                          <span className="badge badge-active">Delivered</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'sequences' && (
              <div className="outbox-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 className="card-title">Sequence Steps</h3>

                <div style={{ padding: '16px', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700 }}>Step 1: Initial Email</span>
                    <span className="badge badge-active">Sent</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Subject: Quick question about {"{{company}}"}
                  </p>
                </div>

                <div style={{ padding: '16px', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700 }}>Step 2: Follow-up Email</span>
                    <span className="badge badge-completed">Sent (Day 2)</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Subject: Re: Quick question about {"{{company}}"}
                  </p>
                </div>

                <div style={{ padding: '16px', border: '1px solid var(--border-card)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700 }}>Step 3: Final Follow-up</span>
                    <span className="badge badge-paused">Scheduled (Day 4)</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Subject: Permission to close your file?
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Campaign Info */}
          <div className="col-right">
            <div className="outbox-card">
              <h3 className="card-title" style={{ marginBottom: '16px' }}>Campaign Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Created</span>
                  <span style={{ fontWeight: 600 }}>{campaign.createdAt}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Type</span>
                  <span style={{ fontWeight: 600 }}>{campaign.type}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>From</span>
                  <span style={{ fontWeight: 600 }}>{campaign.fromSender}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Total Steps</span>
                  <span style={{ fontWeight: 600 }}>{campaign.totalSteps}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Status</span>
                  <span className="badge badge-active">{campaign.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
