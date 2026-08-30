import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  CheckCircle2,
  RotateCcw,
  Target,
  Plus,
  ArrowRight,
  FileText,
  Users,
  BarChart2,
  Check,
  Send,
  MoreVertical
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { PerformanceChart } from '../components/common/PerformanceChart.js';
import { campaignApi } from '../api/campaign.api.js';
import { useAuth } from '../context/AuthContext.js';
import { CampaignSummary, DeliveryStats, RecentActivityItem } from '../types/campaign.types.js';

interface TaskItem {
  id: number;
  title: string;
  sub: string;
  done: boolean;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);

  // Local task list
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: 1, title: 'Follow up with TechCorp', sub: '5 pending follow-ups', done: false },
    { id: 2, title: 'Review campaign performance', sub: 'Daily review', done: false },
    { id: 3, title: 'Add new prospects', sub: '20 contacts to add', done: false },
    { id: 4, title: 'Check email deliverability', sub: 'System health check', done: false }
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      // 1. Load Stats immediately
      campaignApi.getStats()
        .then((data) => {
          if (isMounted && data) setStats(data);
        })
        .catch(() => {});

      // 2. Load Campaigns
      campaignApi.getCampaigns(1, 5)
        .then((data) => {
          if (isMounted && data && data.campaigns) setCampaigns(data.campaigns);
        })
        .catch(() => {});

      // 3. Load Activities
      campaignApi.getRecentActivities()
        .then((data) => {
          if (isMounted && data) setActivities(data);
        })
        .catch(() => {});
    };

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const userDisplayName = user?.name || 'Gourav';

  // Format relative timestamp helper
  const formatTimeAgo = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return dateStr;
    const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    return `${Math.floor(diffSec / 86400)} days ago`;
  };

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* DASHBOARD HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Welcome back, {userDisplayName}! 👋</h1>
            <p>Here's what's happening with your outreach today.</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/composer" className="btn-new-campaign">
              <Plus size={18} />
              <span>New Campaign</span>
            </Link>
          </div>
        </div>

        {/* 4 PRIMARY KPI METRIC CARDS */}
        <div className="kpi-grid">
          {/* Card 1: Delivered Emails */}
          <div className="kpi-card">
            <div className="kpi-icon-circle purple">
              <Mail size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Delivered Emails</span>
              <div className="kpi-value">
                {stats?.sentCount !== undefined ? stats.sentCount : 0}
              </div>
              <div className="kpi-trend">
                <span className="trend-up">↗ {stats?.sentCount ? '100%' : '0%'}</span>
                <span className="trend-period">delivered</span>
              </div>
            </div>
          </div>

          {/* Card 2: Scheduled In Queue */}
          <div className="kpi-card">
            <div className="kpi-icon-circle green">
              <CheckCircle2 size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Scheduled In Queue</span>
              <div className="kpi-value">
                {stats?.scheduledCount !== undefined ? stats.scheduledCount : 0}
              </div>
              <div className="kpi-trend">
                <span className="trend-up">↗ {stats?.scheduledCount ? `${stats.scheduledCount} queued` : '0 queued'}</span>
                <span className="trend-period">in queue</span>
              </div>
            </div>
          </div>

          {/* Card 3: Rate-Limited Delayed */}
          <div className="kpi-card">
            <div className="kpi-icon-circle blue">
              <RotateCcw size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Rate-Limited Delayed</span>
              <div className="kpi-value">
                {stats?.rateLimitedCount !== undefined ? stats.rateLimitedCount : 0}
              </div>
              <div className="kpi-trend">
                <span className="trend-up">↗ {stats?.rateLimitedCount ? `${stats.rateLimitedCount} delayed` : '0 delayed'}</span>
                <span className="trend-period">throttled</span>
              </div>
            </div>
          </div>

          {/* Card 4: Failed Deliveries */}
          <div className="kpi-card">
            <div className="kpi-icon-circle orange">
              <Target size={22} />
            </div>
            <div className="kpi-content">
              <span className="kpi-label">Failed Deliveries</span>
              <div className="kpi-value">
                {stats?.failedCount !== undefined ? stats.failedCount : 0}
              </div>
              <div className="kpi-trend">
                <span className="trend-up">↗ {stats?.failedCount ? `${stats.failedCount} failed` : '0 failed'}</span>
                <span className="trend-period">errors</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT */}
        <div className="dashboard-main-columns">
          {/* LEFT COLUMN (Recent Campaigns + Bottom Grid: Performance & Quick Actions) */}
          <div className="col-left">
            {/* Recent Campaigns Table */}
            <div className="outbox-card campaigns-card">
              <div className="card-header-row">
                <h3 className="card-title">Recent Campaigns</h3>
                <Link to="/campaigns" className="card-link-action">
                  <span>View all</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {campaigns.length === 0 ? (
                <div className="empty-state-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '14px' }}>📬</div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                    No campaigns created yet
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px', maxWidth: '360px' }}>
                    Create your first outreach campaign to start sending emails.
                  </p>
                  <Link
                    to="/composer"
                    className="btn-new-campaign"
                    style={{ display: 'inline-flex', margin: '0 auto', fontSize: '0.88rem', padding: '8px 18px' }}
                  >
                    <Plus size={16} />
                    <span>Create Campaign</span>
                  </Link>
                </div>
              ) : (
                <div className="outbox-table-wrapper" style={{ overflowX: 'auto', flex: 1 }}>
                  <table className="outbox-table">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Recipients</th>
                        <th>Sent</th>
                        <th>Open Rate</th>
                        <th>Reply Rate</th>
                        <th>Status</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.slice(0, 5).map((camp) => {
                        const isDone = camp.stats.sent >= camp.totalRecipients && camp.totalRecipients > 0;
                        return (
                          <tr key={camp.id}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{camp.subject}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Created {formatTimeAgo(camp.createdAt)}
                              </div>
                            </td>
                            <td>{camp.totalRecipients.toLocaleString()}</td>
                            <td>{camp.stats.sent.toLocaleString()}</td>
                            <td style={{ color: 'var(--text-main)', fontWeight: 500, fontSize: '0.85rem' }}>
                              {stats?.openRate !== undefined && stats.openRate !== null
                                ? `${stats.openRate.toFixed(1)}%`
                                : '—'}
                            </td>
                            <td style={{ color: 'var(--text-subtle)', fontStyle: 'italic', fontSize: '0.8rem' }} title="Reply tracking not configured in schema">
                              —
                            </td>
                            <td>
                              <span className={`badge ${isDone ? 'badge-completed' : 'badge-active'}`}>
                                {isDone ? 'Completed' : 'Active'}
                              </span>
                            </td>
                            <td>
                              <button
                                style={{ color: 'var(--text-muted)', padding: '4px', cursor: 'pointer' }}
                                onClick={() => navigate('/campaigns')}
                                title="Campaign Details"
                              >
                                <MoreVertical size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Grid: Performance Overview + Quick Actions */}
            <div className="dashboard-bottom-grid">
              {/* Performance Overview Chart */}
              <div className="outbox-card">
                <div className="card-header-row">
                  <h3 className="card-title">Performance Overview</h3>
                </div>
                <PerformanceChart showDropdown={true} />
              </div>

              {/* Quick Actions List */}
              <div className="outbox-card">
                <div className="card-header-row">
                  <h3 className="card-title">Quick Actions</h3>
                </div>

                <div className="quick-actions-list">
                  <button
                    onClick={() => navigate('/composer')}
                    className="quick-action-btn"
                    type="button"
                  >
                    <div className="quick-action-left">
                      <div className="quick-action-icon">
                        <Send size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>Create New Campaign</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Start a new outreach campaign</div>
                      </div>
                    </div>
                    <ArrowRight size={15} style={{ color: 'var(--text-muted)' }} />
                  </button>

                  <button
                    onClick={() => navigate('/contacts')}
                    className="quick-action-btn"
                    type="button"
                  >
                    <div className="quick-action-left">
                      <div className="quick-action-icon">
                        <Users size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>Add New Contacts</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Import or add new contacts</div>
                      </div>
                    </div>
                    <ArrowRight size={15} style={{ color: 'var(--text-muted)' }} />
                  </button>

                  <button
                    onClick={() => navigate('/templates')}
                    className="quick-action-btn"
                    type="button"
                  >
                    <div className="quick-action-left">
                      <div className="quick-action-icon">
                        <FileText size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>Create Email Template</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Design a new email template</div>
                      </div>
                    </div>
                    <ArrowRight size={15} style={{ color: 'var(--text-muted)' }} />
                  </button>

                  <button
                    onClick={() => navigate('/analytics')}
                    className="quick-action-btn"
                    type="button"
                  >
                    <div className="quick-action-left">
                      <div className="quick-action-icon">
                        <BarChart2 size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>View Analytics</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Check detailed performance</div>
                      </div>
                    </div>
                    <ArrowRight size={15} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Today's Tasks + Recent Activities + Outbox Pro Banner) */}
          <div className="col-right">
            {/* Today's Tasks */}
            <div className="outbox-card">
              <div className="card-header-row">
                <h3 className="card-title">Today's Tasks</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {tasks.filter(t => t.done).length}/{tasks.length} done
                </span>
              </div>

              <div className="tasks-list">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="task-item"
                    onClick={() => toggleTask(task.id)}
                  >
                    <div className={`task-checkbox ${task.done ? 'checked' : ''}`}>
                      {task.done && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div className="task-info">
                      <span className={`task-title ${task.done ? 'task-done' : ''}`}>
                        {task.title}
                      </span>
                      <span className="task-sub">{task.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activities */}
            <div className="outbox-card">
              <div className="card-header-row">
                <h3 className="card-title">Recent Activities</h3>
                <Link to="/campaigns" className="card-link-action">
                  <span>View all</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {activities.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>⚡</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    No recent activity
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                    Outreach deliveries and events will appear here
                  </div>
                </div>
              ) : (
                <div className="activity-feed">
                  {activities.map((act) => (
                    <div key={act.id} className="activity-item">
                      <div className={`activity-icon-badge ${act.badge || 'green'}`}>
                        {act.type === 'delivery' && <Send size={15} />}
                        {act.type === 'campaign' && <Mail size={15} />}
                        {act.type === 'ratelimit' && <RotateCcw size={15} />}
                      </div>
                      <div className="activity-details">
                        <div className="activity-title">{act.title}</div>
                        <div className="activity-time">{formatTimeAgo(act.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outbox Pro Banner */}
            <div className="outbox-pro-banner">
              <div className="pro-banner-content">
                <h4 className="pro-banner-title">Outreach better with Outbox Pro</h4>
                <ul className="pro-banner-features">
                  <li>
                    <Check size={14} color="#34d399" />
                    <span>Unlimited email accounts</span>
                  </li>
                  <li>
                    <Check size={14} color="#34d399" />
                    <span>Advanced analytics</span>
                  </li>
                  <li>
                    <Check size={14} color="#34d399" />
                    <span>Team collaboration</span>
                  </li>
                  <li>
                    <Check size={14} color="#34d399" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/settings?tab=billing')}
                  className="btn-pro-now"
                  type="button"
                >
                  Upgrade Now
                </button>
              </div>

              <div className="pro-rocket-icon">
                🚀
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
