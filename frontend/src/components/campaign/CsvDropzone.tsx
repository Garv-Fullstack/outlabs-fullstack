import React, { useState, useRef } from 'react';
import { UploadCloud, FileWarning } from 'lucide-react';
import { parseAndValidateCsv } from '../../utils/csv.parser.js';
import { CsvParseSummary } from '../../types/campaign.types.js';

interface CsvDropzoneProps {
  onParsed: (summary: CsvParseSummary | null) => void;
}

export const CsvDropzone: React.FC<CsvDropzoneProps> = ({ onParsed }) => {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<CsvParseSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file');
      setFileName(null);
      setSummary(null);
      onParsed(null);
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseAndValidateCsv(text);
        if (result.totalRows === 0) {
          setError('The uploaded CSV file is empty');
          setSummary(null);
          onParsed(null);
          return;
        }
        setSummary(result);
        onParsed(result);
      } catch (err) {
        setError('Failed to parse CSV file content');
        setSummary(null);
        onParsed(null);
      }
    };

    reader.onerror = () => {
      setError('Failed to read file from disk');
      setSummary(null);
      onParsed(null);
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setFileName(null);
    setSummary(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onParsed(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: dragOver ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-secondary)',
          padding: '32px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'var(--transition)'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px auto'
        }}>
          <UploadCloud size={24} />
        </div>

        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>
          {fileName ? fileName : 'Upload Recipient CSV File'}
        </h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Drag and drop your file here, or click to browse (supports <code style={{ color: 'var(--accent-primary)' }}>Email</code>, <code style={{ color: 'var(--accent-primary)' }}>Name</code> headers)
        </p>
      </div>

      {error && (
        <div className="alert-banner alert-error">
          <FileWarning size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          padding: '16px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Rows</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{summary.totalRows}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--success)', textTransform: 'uppercase', fontWeight: 600 }}>Valid</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{summary.validCount}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--warning)', textTransform: 'uppercase', fontWeight: 600 }}>Duplicates</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>{summary.duplicateCount}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 600 }}>Invalid</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>{summary.invalidCount}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              type="button"
            >
              Clear File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
