import React from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import {
  Download
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const reports = [
    { title: 'Weekly Deliverability Audit', date: 'Aug 24, 2026', format: 'PDF & CSV', size: '2.4 MB', status: 'Ready' },
    { title: 'Q3 Enterprise Campaign Summary', date: 'Aug 20, 2026', format: 'Excel (XLSX)', size: '4.8 MB', status: 'Ready' },
    { title: 'Bounce Rate & Spam Trap Analysis', date: 'Aug 15, 2026', format: 'CSV Export', size: '1.1 MB', status: 'Ready' },
    { title: 'Sender Account Health Report', date: 'Aug 10, 2026', format: 'PDF', size: '3.2 MB', status: 'Ready' }
  ];

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* HEADER */}
        <div className="dashboard-header">
          <div className="dashboard-title-box">
            <h1>Reports</h1>
            <p>Generate, export, and download comprehensive outreach reports</p>
          </div>

          <button className="btn-new-campaign" type="button">
            <Download size={16} />
            <span>Generate New Report</span>
          </button>
        </div>

        {/* REPORTS LIST */}
        <div className="outbox-card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Generated Export Files</h3>
          <div className="outbox-table-wrapper">
            <table className="outbox-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Generated Date</th>
                  <th>Format</th>
                  <th>File Size</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{r.title}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.date}</td>
                    <td><span className="badge badge-completed">{r.format}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{r.size}</td>
                    <td><span className="badge badge-active">{r.status}</span></td>
                    <td>
                      <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
                        <Download size={13} />
                        <span>Download</span>
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
