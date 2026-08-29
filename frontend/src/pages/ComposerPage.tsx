import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { CsvDropzone } from '../components/campaign/CsvDropzone.js';
import { RecipientTablePreview } from '../components/campaign/RecipientTablePreview.js';
import { ScheduleConfig } from '../components/campaign/ScheduleConfig.js';
import { campaignApi } from '../api/campaign.api.js';
import { SenderOption, CsvParseSummary } from '../types/campaign.types.js';
import { Send, CheckCircle2, AlertCircle, Sparkles, Loader2, ArrowRight } from 'lucide-react';

export const ComposerPage: React.FC = () => {
  const navigate = useNavigate();
  const [senders, setSenders] = useState<SenderOption[]>([]);
  const [loadingSenders, setLoadingSenders] = useState(true);

  // Form State
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [isHtmlMode, setIsHtmlMode] = useState<boolean>(false);

  // CSV & Recipients State
  const [csvSummary, setCsvSummary] = useState<CsvParseSummary | null>(null);

  // Scheduling State (Default to 5 minutes in future)
  const defaultStartTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
  const [scheduledStartTime, setScheduledStartTime] = useState<string>(defaultStartTime);
  const [delayBetweenEmailsSeconds, setDelayBetweenEmailsSeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);

  // Submission & Error State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ id: string; subject: string; recipientsCount: number } | null>(null);

  useEffect(() => {
    const fetchSenders = async () => {
      try {
        setLoadingSenders(true);
        const data = await campaignApi.getSenders();
        setSenders(data);
        if (data.length > 0) {
          setSelectedSenderId(data[0]!.id);
          setHourlyLimit(data[0]!.hourlyLimit);
          setDelayBetweenEmailsSeconds(data[0]!.minDelaySeconds);
        }
      } catch (err) {
        console.error('Failed to load senders:', err);
      } finally {
        setLoadingSenders(false);
      }
    };
    fetchSenders();
  }, []);

  const handleSenderChange = (senderId: string) => {
    setSelectedSenderId(senderId);
    const sender = senders.find((s) => s.id === senderId);
    if (sender) {
      setHourlyLimit(sender.hourlyLimit);
      setDelayBetweenEmailsSeconds(sender.minDelaySeconds);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validation
    if (!selectedSenderId) {
      setErrorMessage('Please select a sender account');
      return;
    }
    if (!subject.trim()) {
      setErrorMessage('Please enter an email subject line');
      return;
    }
    if (!bodyText.trim()) {
      setErrorMessage('Please enter email body content');
      return;
    }
    if (!csvSummary || csvSummary.validRecipients.length === 0) {
      setErrorMessage('Please upload a CSV file with at least one valid recipient email');
      return;
    }

    const startDate = new Date(scheduledStartTime);
    if (isNaN(startDate.getTime())) {
      setErrorMessage('Invalid scheduled start date/time');
      return;
    }

    try {
      setIsSubmitting(true);
      // Generate fresh UUID v4 idempotency key per submission attempt
      const idempotencyKey = crypto.randomUUID();

      const result = await campaignApi.scheduleCampaign({
        senderId: selectedSenderId,
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        bodyHtml: isHtmlMode && bodyHtml.trim() ? bodyHtml.trim() : null,
        recipients: csvSummary.validRecipients,
        scheduledStartTime: startDate.toISOString(),
        delayBetweenEmailsSeconds,
        hourlyLimit,
        idempotencyKey
      });

      setSuccessResult({
        id: result.id,
        subject: result.subject,
        recipientsCount: csvSummary.validRecipients.length
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to schedule campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSender = senders.find((s) => s.id === selectedSenderId);

  return (
    <AppLayout>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Campaign Composer
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Compose, import CSV recipients, and schedule staggered delivery via BullMQ & Redis Lua tokens
          </p>
        </div>

        {errorMessage && (
          <div className="alert-banner alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successResult ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
              Campaign Scheduled Successfully!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 24px auto' }}>
              Your campaign <strong>"{successResult.subject}"</strong> with <strong>{successResult.recipientsCount} recipients</strong> has been committed to PostgreSQL Outbox and queued in BullMQ.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link to="/monitoring" className="btn btn-primary">
                <span>View Delivery Monitoring</span>
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => {
                  setSuccessResult(null);
                  setSubject('');
                  setBodyText('');
                  setCsvSummary(null);
                }}
                className="btn btn-outline"
                type="button"
              >
                Compose Another Campaign
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Step 1: Sender & Metadata */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--accent-primary)" />
                <span>1. Email Metadata & Sender</span>
              </h3>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                  Sender Account
                </label>
                {loadingSenders ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading sender accounts...</p>
                ) : senders.length === 0 ? (
                  <div className="alert-banner alert-error" style={{ marginBottom: 0 }}>
                    <span>No active sender accounts found. Please configure a sender first.</span>
                  </div>
                ) : (
                  <select
                    value={selectedSenderId}
                    onChange={(e) => handleSenderChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit'
                    }}
                  >
                    {senders.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email}) — Limit: {s.hourlyLimit}/hr, Delay: {s.minDelaySeconds}s
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                  Email Subject Line
                </label>
                <input
                  type="text"
                  placeholder="e.g. Quick question regarding your sales pipeline"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Email Body Content (Plaintext)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsHtmlMode(!isHtmlMode)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isHtmlMode ? 'Hide HTML Mode' : '+ Add HTML Body Template'}
                  </button>
                </div>
                <textarea
                  rows={6}
                  placeholder="Hello, I noticed your recent product launch and wanted to connect..."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {isHtmlMode && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--info)' }}>
                    Optional HTML Version
                  </label>
                  <textarea
                    rows={4}
                    placeholder="<p>Hello, I noticed your recent launch...</p>"
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Step 2: CSV Upload & Recipient Preview */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                2. Recipient Ingestion (CSV)
              </h3>
              <CsvDropzone onParsed={(s) => setCsvSummary(s)} />
              {csvSummary && csvSummary.rows.length > 0 && (
                <RecipientTablePreview rows={csvSummary.rows} />
              )}
            </div>

            {/* Step 3: Scheduling & Rate Limits */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                3. Delivery Scheduling & Distributed Rate Limits
              </h3>
              <ScheduleConfig
                scheduledStartTime={scheduledStartTime}
                onScheduledStartTimeChange={setScheduledStartTime}
                delayBetweenEmailsSeconds={delayBetweenEmailsSeconds}
                onDelayChange={setDelayBetweenEmailsSeconds}
                hourlyLimit={hourlyLimit}
                onHourlyLimitChange={setHourlyLimit}
                selectedSender={selectedSender}
              />
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => navigate('/campaigns')}
                className="btn btn-outline"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || senders.length === 0}
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>Scheduling Campaign...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Schedule & Dispatch Campaign</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};
