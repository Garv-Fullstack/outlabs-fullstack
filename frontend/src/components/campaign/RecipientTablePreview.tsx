import React, { useState } from 'react';
import { RecipientRow, RecipientStatus } from '../../types/campaign.types.js';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface RecipientTablePreviewProps {
  rows: RecipientRow[];
}

export const RecipientTablePreview: React.FC<RecipientTablePreviewProps> = ({ rows }) => {
  const [filter, setFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filteredRows = rows.filter((r) => {
    if (filter === 'VALID') return r.status === 'VALID';
    if (filter === 'INVALID') return r.status !== 'VALID';
    return true;
  });

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const displayedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const renderStatusBadge = (status: RecipientStatus) => {
    switch (status) {
      case 'VALID':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--success-bg)',
            color: 'var(--success)',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={12} />
            <span>Valid</span>
          </span>
        );
      case 'DUPLICATE':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--warning-bg)',
            color: 'var(--warning)',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <AlertTriangle size={12} />
            <span>Duplicate</span>
          </span>
        );
      case 'INVALID_EMAIL':
      case 'MISSING_EMAIL':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            <XCircle size={12} />
            <span>{status === 'MISSING_EMAIL' ? 'Missing' : 'Invalid'}</span>
          </span>
        );
    }
  };

  if (rows.length === 0) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Recipient Preview & Diagnostics</h4>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => { setFilter('ALL'); setPage(1); }}
            className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            type="button"
          >
            All ({rows.length})
          </button>
          <button
            onClick={() => { setFilter('VALID'); setPage(1); }}
            className={`btn ${filter === 'VALID' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            type="button"
          >
            Valid ({rows.filter((r) => r.status === 'VALID').length})
          </button>
          <button
            onClick={() => { setFilter('INVALID'); setPage(1); }}
            className={`btn ${filter === 'INVALID' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            type="button"
          >
            Issues ({rows.filter((r) => r.status !== 'VALID').length})
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '8px 12px' }}>#</th>
              <th style={{ padding: '8px 12px' }}>Name</th>
              <th style={{ padding: '8px 12px' }}>Email Address</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Diagnostic Details</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row) => (
              <tr key={row.rowNumber} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{row.rowNumber}</td>
                <td style={{ padding: '8px 12px' }}>{row.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{row.email || <span style={{ color: 'var(--text-muted)' }}>[Empty]</span>}</td>
                <td style={{ padding: '8px 12px' }}>{renderStatusBadge(row.status)}</td>
                <td style={{ padding: '8px 12px', color: row.status === 'VALID' ? 'var(--text-muted)' : 'var(--danger)', fontSize: '0.8rem' }}>
                  {row.errorReason || 'Ready for dispatch'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              type="button"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
