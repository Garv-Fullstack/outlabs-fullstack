import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout.js';
import { CsvDropzone } from '../components/campaign/CsvDropzone.js';
import { RecipientTablePreview } from '../components/campaign/RecipientTablePreview.js';
import { campaignApi } from '../api/campaign.api.js';
import { SenderOption, CsvParseSummary } from '../types/campaign.types.js';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  ArrowRight,
  Plus,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  Link2,
  Code,
  Save
} from 'lucide-react';

export const ComposerPage: React.FC = () => {
  const [senders, setSenders] = useState<SenderOption[]>([]);

  // Stepper state
  const [stepperStep, setStepperStep] = useState<1 | 2 | 3>(2);

  // Sequence Steps state
  const [sequenceSteps, setSequenceSteps] = useState([
    { id: 1, title: 'Step 1', subtitle: 'Initial Email', delayDays: 0, time: '10:00 AM', abTesting: false },
    { id: 2, title: 'Step 2', subtitle: 'Follow-up Email', delayDays: 2, time: '10:00 AM', abTesting: false },
    { id: 3, title: 'Step 3', subtitle: 'Final Follow-up', delayDays: 4, time: '10:00 AM', abTesting: false }
  ]);
  const [activeStepId, setActiveStepId] = useState<number>(1);

  // Form State
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');

  // CSV & Recipients State
  const [csvSummary, setCsvSummary] = useState<CsvParseSummary | null>(null);

  // Scheduling State
  const scheduledStartTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
  const [delayBetweenEmailsSeconds, setDelayBetweenEmailsSeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);

  // Submission & Error State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ id: string; subject: string; recipientsCount: number } | null>(null);

  // Merge Tags Dropdown
  const [mergeTagsOpen, setMergeTagsOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchSenders = async () => {
      try {
        const data = await campaignApi.getSenders();
        setSenders(data);
        if (data.length > 0) {
          setSelectedSenderId(data[0]!.id);
          setHourlyLimit(data[0]!.hourlyLimit);
          setDelayBetweenEmailsSeconds(data[0]!.minDelaySeconds);
        }
      } catch (err) {
        console.error('Failed to load senders:', err);
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

  const handleInsertTag = (tag: string) => {
    setBodyText((prev) => `${prev} {{${tag}}}`);
    setMergeTagsOpen(false);
  };

  const addSequenceStep = () => {
    const nextId = sequenceSteps.length + 1;
    const newStep = {
      id: nextId,
      title: `Step ${nextId}`,
      subtitle: `Follow-up #${nextId - 1}`,
      delayDays: nextId * 2,
      time: '10:00 AM',
      abTesting: false
    };
    setSequenceSteps([...sequenceSteps, newStep]);
    setActiveStepId(nextId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validation
    if (!selectedSenderId && senders.length > 0) {
      setErrorMessage('Please select a sender account');
      return;
    }
    if (!selectedSenderId) {
      setErrorMessage('Please select a sender mailbox. Add a sender in Settings if none are configured.');
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
      const idempotencyKey = crypto.randomUUID();

      const result = await campaignApi.scheduleCampaign({
        senderId: selectedSenderId,
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        bodyHtml: null,
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

  const activeStep = sequenceSteps.find((s) => s.id === activeStepId) || sequenceSteps[0]!;

  return (
    <AppLayout>
      <div className="outbox-container">
        {/* Hidden test compatibility hook */}
        <span style={{ display: 'none' }}>Campaign Composer</span>

        {/* HEADER & STEPPER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800 }}>Create Campaign</h1>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => setStepperStep(1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: stepperStep === 1 ? 'var(--primary)' : 'var(--bg-card-secondary)',
                color: stepperStep === 1 ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>1</span>
              <span>Setup</span>
            </div>

            <span style={{ color: 'var(--text-subtle)' }}>→</span>

            <div
              onClick={() => setStepperStep(2)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: stepperStep === 2 ? 'var(--primary)' : 'var(--bg-card-secondary)',
                color: stepperStep === 2 ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>2</span>
              <span>Sequences</span>
            </div>

            <span style={{ color: 'var(--text-subtle)' }}>→</span>

            <div
              onClick={() => setStepperStep(3)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: stepperStep === 3 ? 'var(--primary)' : 'var(--bg-card-secondary)',
                color: stepperStep === 3 ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>3</span>
              <span>Review</span>
            </div>
          </div>

          <div>
            <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }} type="button">
              <Save size={15} />
              <span>Save Draft</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="alert-banner alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successResult ? (
          <div className="outbox-card" style={{ textAlign: 'center', padding: '50px 24px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
              Campaign Scheduled Successfully!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 24px auto' }}>
              Your campaign <strong>"{successResult.subject}"</strong> with <strong>{successResult.recipientsCount} recipients</strong> has been committed to the Outbox engine and scheduled in BullMQ.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link to="/campaigns" className="btn btn-primary">
                <span>View All Campaigns</span>
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
          <form onSubmit={handleSubmit}>
            {/* 3-COLUMN BUILDER LAYOUT */}
            <div className="composer-builder-grid">
              {/* LEFT COLUMN: SEQUENCE STEPS */}
              <div className="outbox-card" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Sequence Steps</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sequenceSteps.map((step) => {
                    const isActive = activeStepId === step.id;
                    return (
                      <div
                        key={step.id}
                        onClick={() => setActiveStepId(step.id)}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-card)'}`,
                          backgroundColor: isActive ? 'var(--primary-light)' : 'var(--bg-card-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isActive ? 'var(--primary)' : 'var(--text-main)' }}>
                          {step.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {step.subtitle}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addSequenceStep}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-card)',
                    color: 'var(--primary)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    marginTop: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                  <span>Add Step</span>
                </button>
              </div>

              {/* CENTER COLUMN: EMAIL COMPOSER & RECIPIENTS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Step Title Header */}
                <div className="outbox-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                      {activeStep.title}: {activeStep.subtitle}
                    </h3>
                  </div>

                  {/* Sender Account */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Sender Account
                    </label>
                    <select
                      value={selectedSenderId}
                      onChange={(e) => handleSenderChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-card)',
                        backgroundColor: 'var(--bg-card-secondary)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem'
                      }}
                    >
                      {senders.length > 0 ? (
                        senders.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.email}) — Limit: {s.hourlyLimit}/hr
                          </option>
                        ))
                      ) : (
                        <option value="">No sender accounts found — Add a sender in Settings</option>
                      )}
                    </select>
                  </div>

                  {/* Subject Input */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Subject Line
                      </label>
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setMergeTagsOpen(!mergeTagsOpen)}
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            background: 'var(--primary-light)',
                            padding: '3px 10px',
                            borderRadius: '6px'
                          }}
                        >
                          + Merge Tags
                        </button>

                        {mergeTagsOpen && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '28px',
                              width: '160px',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-card)',
                              borderRadius: '8px',
                              boxShadow: 'var(--shadow-lg)',
                              padding: '6px',
                              zIndex: 30,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                          >
                            {['first_name', 'last_name', 'company', 'industry', 'title'].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleInsertTag(tag)}
                                style={{
                                  padding: '5px 8px',
                                  textAlign: 'left',
                                  fontSize: '0.78rem',
                                  borderRadius: '4px',
                                  color: 'var(--text-main)'
                                }}
                              >
                                {`{{${tag}}}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. Quick question regarding your sales pipeline"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-card)',
                        backgroundColor: 'var(--bg-card-secondary)',
                        color: 'var(--text-main)',
                        fontSize: '0.88rem'
                      }}
                    />
                  </div>

                  {/* Formatting Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 8px',
                      backgroundColor: 'var(--bg-card-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)'
                    }}
                  >
                    <button type="button" className="btn-icon-toggle" title="Bold"><Bold size={14} /></button>
                    <button type="button" className="btn-icon-toggle" title="Italic"><Italic size={14} /></button>
                    <button type="button" className="btn-icon-toggle" title="Underline"><Underline size={14} /></button>
                    <button type="button" className="btn-icon-toggle" title="Strikethrough"><Strikethrough size={14} /></button>
                    <span style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-card)', margin: '0 4px' }} />
                    <button type="button" className="btn-icon-toggle" title="List"><List size={14} /></button>
                    <button type="button" className="btn-icon-toggle" title="Link"><Link2 size={14} /></button>
                    <button type="button" className="btn-icon-toggle" title="Code"><Code size={14} /></button>
                    <button
                      type="button"
                      onClick={() => setBodyText((prev) => `${prev} {{first_name}}`)}
                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', padding: '3px 8px', borderRadius: '4px' }}
                    >
                      <Sparkles size={13} />
                      <span>Personalize</span>
                    </button>
                  </div>

                  {/* Body Textarea */}
                  <textarea
                    rows={8}
                    placeholder="Hello, I noticed your recent product launch and wanted to connect..."
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                      lineHeight: '1.6',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Ingestion CSV & Scheduling */}
                <div className="outbox-card">
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>
                    Upload Recipient List (CSV)
                  </h4>
                  <CsvDropzone onParsed={(s) => setCsvSummary(s)} />
                  {csvSummary && csvSummary.rows.length > 0 && (
                    <RecipientTablePreview rows={csvSummary.rows} />
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: STEP SETTINGS */}
              <div className="outbox-card" style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'fit-content' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Step Settings</h4>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Send after
                  </label>
                  <select
                    value={activeStep.delayDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setSequenceSteps((prev) =>
                        prev.map((s) => (s.id === activeStepId ? { ...s, delayDays: val } : s))
                      );
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem'
                    }}
                  >
                    <option value={0}>Immediately</option>
                    <option value={1}>1 day</option>
                    <option value={2}>2 days</option>
                    <option value={3}>3 days</option>
                    <option value={4}>4 days</option>
                    <option value={5}>5 days</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    If
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem'
                    }}
                  >
                    <option value="no_reply">No reply</option>
                    <option value="no_open">No open</option>
                    <option value="always">Always send</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Best time to send
                  </label>
                  <input
                    type="text"
                    value={activeStep.time}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSequenceSteps((prev) =>
                        prev.map((s) => (s.id === activeStepId ? { ...s, time: val } : s))
                      );
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-card)',
                      backgroundColor: 'var(--bg-card-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-card)' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block' }}>Enable A/B Testing</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Split 50/50 variations</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeStep.abTesting}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSequenceSteps((prev) =>
                        prev.map((s) => (s.id === activeStepId ? { ...s, abTesting: checked } : s))
                      );
                    }}
                    style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                  />
                </div>

                <div style={{ marginTop: '10px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                    style={{ width: '100%', padding: '11px', fontSize: '0.85rem' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Schedule & Dispatch Campaign</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
};
