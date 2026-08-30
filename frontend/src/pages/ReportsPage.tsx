import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import { campaignApi } from '../api/campaign.api.js';
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const downloadCsv = (filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDeliveries = async () => {
    try {
      setExportingType('deliveries');
      const [scheduled, sent] = await Promise.all([
        campaignApi.getScheduledDeliveries(1, 200).catch(() => ({ deliveries: [] })),
        campaignApi.getSentDeliveries(1, 200).catch(() => ({ deliveries: [] }))
      ]);

      const allDeliveries = [...(scheduled.deliveries || []), ...(sent.deliveries || [])];
      const headers = ['Delivery ID', 'Campaign ID', 'Recipient Email', 'Recipient Name', 'Status', 'Scheduled For', 'Sent At', 'Error Message', 'Ethereal Preview URL'];
      const rows = allDeliveries.map((d) => [
        d.id,
        d.campaignId,
        d.recipientEmail,
        d.recipientName || '',
        d.status,
        d.scheduledFor,
        d.sentAt || '',
        d.errorMessage || '',
        d.etherealPreviewUrl || ''
      ]);

      downloadCsv(`outbox-deliveries-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      setSuccessMessage('Deliveries report downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to export deliveries: ' + (err?.message || 'Unknown error'));
    } finally {
      setExportingType(null);
    }
  };

  const handleExportCampaigns = async () => {
    try {
      setExportingType('campaigns');
      const data = await campaignApi.getCampaigns(1, 100);
      const headers = ['Campaign ID', 'Subject', 'Sender Name', 'Sender Email', 'Total Recipients', 'Sent Count', 'Scheduled Count', 'Failed Count', 'Rate-Limited Count', 'Created At'];
      const rows = (data.campaigns || []).map((c) => [
        c.id,
        c.subject,
        c.senderName,
        c.senderEmail,
        c.totalRecipients,
        c.stats.sent,
        c.stats.scheduled,
        c.stats.failed,
        c.stats.rateLimited,
        c.createdAt
      ]);

      downloadCsv(`outbox-campaigns-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      setSuccessMessage('Campaigns report downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to export campaigns: ' + (err?.message || 'Unknown error'));
    } finally {
      setExportingType(null);
    }
  };

  const handleExportSenders = async () => {
    try {
      setExportingType('senders');
      const senders = await campaignApi.getSenders();
      const headers = ['Sender ID', 'Name', 'Email', 'SMTP Host', 'SMTP Port', 'Hourly Limit', 'Min Delay (sec)', 'Status'];
      const rows = senders.map((s) => [
        s.id,
        s.name,
        s.email,
        s.smtpHost,
        s.smtpPort,
        s.hourlyLimit,
        s.minDelaySeconds,
        s.isActive ? 'Active' : 'Inactive'
      ]);

      downloadCsv(`outbox-senders-report-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      setSuccessMessage('Sender mailboxes report downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to export senders: ' + (err?.message || 'Unknown error'));
    } finally {
      setExportingType(null);
    }
  };

  const handleExportMetrics = async () => {
    try {
      setExportingType('metrics');
      const stats = await campaignApi.getStats();
      const headers = ['Metric Description', 'Value'];
      const rows = [
        ['Total Delivery Dispatches', stats.totalDeliveries ?? 0],
        ['Successfully Sent Deliveries', stats.sentCount ?? 0],
        ['Scheduled Deliveries in Queue', stats.scheduledCount ?? 0],
        ['Throttled / Rate-Limited Delayed', stats.rateLimitedCount ?? 0],
        ['Failed / Bounced Deliveries', stats.failedCount ?? 0],
        ['Tracked Unique Opens', stats.uniqueOpenedCount ?? 0],
        ['Tracked Total Opens', stats.trackedOpens ?? 0],
        ['Calculated Open Rate (%)', stats.openRate !== null && stats.openRate !== undefined ? `${stats.openRate.toFixed(1)}%` : 'N/A'],
        ['Tracked Total Clicks', stats.totalClicks ?? 0],
        ['Calculated Click Rate (%)', stats.clickRate !== null && stats.clickRate !== undefined ? `${stats.clickRate.toFixed(1)}%` : 'N/A']
      ];

      downloadCsv(`outbox-metrics-summary-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      setSuccessMessage('Metrics summary downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to export metrics: ' + (err?.message || 'Unknown error'));
    } finally {
      setExportingType(null);
    }
  };

  const reportsList = [
    {
      id: 'deliveries',
      title: 'Live Email Deliveries Audit',
      description: 'Full record of all recipient deliveries, timestamps, dispatch statuses, and preview links.',
      action: handleExportDeliveries
    },
    {
      id: 'campaigns',
      title: 'Campaign Performance Summary',
      description: 'Aggregated volume, sent, pending, and fail metrics across all outreach campaigns.',
      action: handleExportCampaigns
    },
    {
      id: 'senders',
      title: 'Sender Accounts & Mailbox Health',
      description: 'List of configured SMTP senders, hourly quotas, delay parameters, and active statuses.',
      action: handleExportSenders
    },
    {
      id: 'metrics',
      title: 'Deliverability & Engagement Summary',
      description: 'Comprehensive deliverability KPIs, open tracking, click rates, and throughput counts.',
      action: handleExportMetrics
    }
  ];

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Reports & Data Export</h1>
            <p>Generate, export, and download real-time CSV reports directly from PostgreSQL and Redis</p>
          </div>
        </div>

        {successMessage && (
          <div className="alert-banner alert-success" style={{ marginBottom: '20px' }}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* REPORTS LIST */}
        <div className="outbox-card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Available Real-Time Data Reports</h3>
          <div className="outbox-table-wrapper">
            <table className="outbox-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Description</th>
                  <th>Format</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reportsList.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileSpreadsheet size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{r.title}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.description}</td>
                    <td><span className="badge badge-completed">CSV</span></td>
                    <td>
                      <button
                        onClick={r.action}
                        disabled={exportingType !== null}
                        className="btn btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        type="button"
                      >
                        {exportingType === r.id ? (
                          <>
                            <Loader2 size={13} className="spin" />
                            <span>Exporting...</span>
                          </>
                        ) : (
                          <>
                            <Download size={13} />
                            <span>Download CSV</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
